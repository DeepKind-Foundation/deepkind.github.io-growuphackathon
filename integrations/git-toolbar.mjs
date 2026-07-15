import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);

/**
 * Dev-only Astro integration: adds a "Git" dev toolbar app that commits and
 * pushes straight from the page. The browser-side app (toolbar/git-app.ts)
 * sends messages here; git itself runs on the Node dev server via the existing
 * scripts in scripts/.
 */
export default function gitToolbar() {
  let rootDir = process.cwd();

  return {
    name: 'git-toolbar',
    hooks: {
      'astro:config:setup': ({ config, addDevToolbarApp }) => {
        rootDir = fileURLToPath(config.root);
        addDevToolbarApp({
          id: 'git-commit',
          name: 'Git',
          // git-commit glyph (line through a node)
          icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="4"/></svg>',
          entrypoint: fileURLToPath(new URL('./toolbar/git-app.ts', config.root)),
        });
      },
      'astro:server:setup': ({ toolbar }) => {
        toolbar.on('git:refresh', async () => {
          await sendStatus(toolbar, rootDir);
        });

        toolbar.on('git:commit', async ({ message, push }) => {
          const commitMessage = typeof message === 'string' ? message.trim() : '';
          if (!commitMessage) {
            toolbar.send('git:result', { ok: false, output: 'Commit message is empty.' });
            return;
          }
          const script = push ? 'push_to_github.sh' : 'save_changes.sh';
          const scriptPath = path.join(rootDir, 'scripts', script);
          try {
            // execFile does NOT invoke a shell: commitMessage is delivered to bash as a
            // single positional arg ($1) and reaches git as `-m "$@"` (quoted). It is never
            // shell-interpreted, so there is no command-injection surface here.
            const { stdout, stderr } = await run('bash', [scriptPath, commitMessage], {
              cwd: rootDir,
              maxBuffer: 4 * 1024 * 1024,
            });
            toolbar.send('git:result', {
              ok: true,
              output: [stdout, stderr].filter(Boolean).join('\n').trim() || 'Done.',
            });
          } catch (err) {
            const output =
              [err.stdout, err.stderr].filter(Boolean).join('\n').trim() ||
              err.message ||
              'Git command failed.';
            toolbar.send('git:result', { ok: false, output });
          }
          await sendStatus(toolbar, rootDir);
        });
      },
    },
  };
}

async function sendStatus(toolbar, rootDir) {
  try {
    const { stdout } = await run('git', ['status', '--short', '--branch'], {
      cwd: rootDir,
      maxBuffer: 4 * 1024 * 1024,
    });
    const lines = stdout.split('\n');
    const branch = (lines[0] || '').replace(/^## /, '');
    const files = lines.slice(1).filter(Boolean).join('\n');
    toolbar.send('git:status', { branch, files });
  } catch (err) {
    toolbar.send('git:status', { branch: '', files: '', error: err.message });
  }
}
