import { type Page, type Locator } from '@playwright/test';

/** Page Object for the single-page GrowUp Hackathon site. */
export class HomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly nav: Locator;
  readonly cookieBanner: Locator;
  readonly cookieAccept: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByRole('heading', { level: 1 });
    this.nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
    this.cookieBanner = page.getByRole('region', { name: 'Informacja o plikach cookies' });
    this.cookieAccept = page.getByRole('button', { name: 'Zgadzam się' });
  }

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  section(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  faqItem(question: string): Locator {
    return this.page.locator('details', { has: this.page.getByText(question, { exact: true }) });
  }
}
