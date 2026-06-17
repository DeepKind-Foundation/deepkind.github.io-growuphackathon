import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

/** All editorial copy for the single home page, read from the Keystatic singleton. */
export async function getHomeContent() {
  const home = await reader.singletons.home.read();
  if (!home) {
    throw new Error('Home content singleton is missing at src/content/pages/home');
  }
  return home;
}

/** Resolved shape of the home singleton (inferred from the Keystatic schema). */
export type HomeContent = NonNullable<Awaited<ReturnType<typeof reader.singletons.home.read>>>;
