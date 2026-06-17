import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('home page has no detectable WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(violations).toEqual([]);
});
