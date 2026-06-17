import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('GrowUp Hackathon home page', () => {
  test('loads with the correct title and hero wordmark', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(page).toHaveTitle('GrowUp Hackathon');
    await expect(home.heroHeading).toContainText('Grow');
    await expect(home.heroHeading).toContainText('Up');
  });

  const sections: { id: string; heading: string }[] = [
    { id: 'o-projekcie', heading: 'laboratorium dorosłości' },
    { id: 'sciezki', heading: 'Tematyczne' },
    { id: 'etapy', heading: 'Programu' },
    { id: 'nagrody', heading: 'zdobywasz:' },
    { id: 'faq', heading: 'Odpowiedzi' },
    { id: 'organizator', heading: 'ORGANIZATORZY' },
    { id: 'partnerzy', heading: 'Partnerzy' },
    { id: 'kontakt', heading: 'Kontakt' },
  ];

  for (const { id, heading } of sections) {
    test(`renders section #${id} with its heading`, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      const section = home.section(id);
      await expect(section).toBeVisible();
      await expect(section).toContainText(heading);
    });
  }

  test('navigation exposes all eight in-page anchors', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const labels = ['O projekcie', 'Ścieżki', 'Etapy', 'Korzyści', 'FAQ', 'Organizatorzy', 'Partnerzy', 'Kontakt'];
    for (const label of labels) {
      await expect(home.nav.getByRole('link', { name: label })).toHaveAttribute('href', /^#/);
    }
  });

  test('active CTAs point to the waitlist form', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const ctas = page.getByRole('link', { name: /Chcę wziąć udział|Zapisz się na listę/ });
    await expect(ctas.first()).toHaveAttribute('href', 'https://forms.gle/pzrs6dqv7qyh9J5F6');
  });

  test('hero CTA is disabled (matches the live site)', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(page.getByRole('button', { name: /Chcę wziąć udział/ })).toBeDisabled();
  });

  test('FAQ accordion expands on click', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const item = home.faqItem('Czy udział coś kosztuje?');
    const answer = page.getByText('Nie, udział nic nie kosztuje.');
    await expect(answer).toBeHidden();
    await item.getByText('Czy udział coś kosztuje?').click();
    await expect(answer).toBeVisible();
  });

  test('cookie banner dismisses and stays dismissed', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.cookieBanner).toBeVisible();
    await home.cookieAccept.click();
    await expect(home.cookieBanner).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(home.cookieBanner).toBeHidden();
  });
});
