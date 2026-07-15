import { defineToolbarApp } from 'astro/toolbar';

interface StatusPayload {
  branch: string;
  files: string;
  error?: string;
}

interface ResultPayload {
  ok: boolean;
  output: string;
}

export default defineToolbarApp({
  init(canvas, _app, server) {
    const win = document.createElement('astro-dev-toolbar-window');
    win.innerHTML = `
      <style>
        .git-app { display: flex; flex-direction: column; gap: 10px; width: 340px; font-size: 13px; }
        .git-app h1 { margin: 0; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .git-app .branch { font-family: ui-monospace, monospace; opacity: 0.85; }
        .git-app pre { margin: 0; padding: 8px; border-radius: 6px; background: rgba(0,0,0,0.25);
          max-height: 120px; overflow: auto; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; }
        .git-app textarea { width: 100%; box-sizing: border-box; min-height: 54px; resize: vertical;
          border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25);
          color: inherit; padding: 8px; font: inherit; }
        .git-app .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .git-app button { flex: 1; cursor: pointer; border: none; border-radius: 6px; padding: 8px 10px;
          font: inherit; font-weight: 600; color: #fff; }
        .git-app button.commit { background: #4b5563; }
        .git-app button.push { background: #7611a6; }
        .git-app button.refresh { flex: 0 0 auto; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: inherit; font-weight: 500; }
        .git-app button:disabled { opacity: 0.5; cursor: default; }
        .git-app .result.err { color: #fca5a5; }
        .git-app .result.ok { color: #86efac; }
        .git-app .muted { opacity: 0.6; }
      </style>
      <div class="git-app">
        <h1>Git commit &amp; push</h1>
        <div class="branch" data-branch>—</div>
        <pre data-status class="muted">Loading changes…</pre>
        <textarea data-msg placeholder="Commit message"></textarea>
        <div class="actions">
          <button class="commit" data-commit>Commit</button>
          <button class="push" data-push>Commit &amp; Push</button>
          <button class="refresh" data-refresh title="Refresh status">↻</button>
        </div>
        <pre data-result hidden></pre>
      </div>
    `;
    canvas.appendChild(win);

    const branchEl = win.querySelector<HTMLElement>('[data-branch]')!;
    const statusEl = win.querySelector<HTMLElement>('[data-status]')!;
    const msgEl = win.querySelector<HTMLTextAreaElement>('[data-msg]')!;
    const commitBtn = win.querySelector<HTMLButtonElement>('[data-commit]')!;
    const pushBtn = win.querySelector<HTMLButtonElement>('[data-push]')!;
    const refreshBtn = win.querySelector<HTMLButtonElement>('[data-refresh]')!;
    const resultEl = win.querySelector<HTMLElement>('[data-result]')!;

    const setBusy = (busy: boolean): void => {
      commitBtn.disabled = busy;
      pushBtn.disabled = busy;
      refreshBtn.disabled = busy;
    };

    const commit = (push: boolean): void => {
      const message = msgEl.value.trim();
      if (!message) {
        resultEl.hidden = false;
        resultEl.className = 'result err';
        resultEl.textContent = 'Enter a commit message first.';
        msgEl.focus();
        return;
      }
      setBusy(true);
      resultEl.hidden = false;
      resultEl.className = 'result muted';
      resultEl.textContent = push ? 'Committing and pushing…' : 'Committing…';
      server.send('git:commit', { message, push });
    };

    commitBtn.addEventListener('click', () => commit(false));
    pushBtn.addEventListener('click', () => commit(true));
    refreshBtn.addEventListener('click', () => server.send('git:refresh', {}));

    server.on<StatusPayload>('git:status', ({ branch, files, error }) => {
      branchEl.textContent = branch || (error ? 'not a git repo' : '—');
      if (error) {
        statusEl.className = 'result err';
        statusEl.textContent = error;
      } else if (files) {
        statusEl.className = '';
        statusEl.textContent = files;
      } else {
        statusEl.className = 'muted';
        statusEl.textContent = 'Working tree clean.';
      }
    });

    server.on<ResultPayload>('git:result', ({ ok, output }) => {
      setBusy(false);
      resultEl.hidden = false;
      resultEl.className = ok ? 'result ok' : 'result err';
      resultEl.textContent = output;
      if (ok) msgEl.value = '';
    });

    // Pull initial status when the dev server connection is ready.
    server.send('git:refresh', {});
  },
});
