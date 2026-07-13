import { test, expect } from '@playwright/test';

// Smoke test for the public welcome/home screen (web build).
test('welcome screen renders core CTAs', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Wasali')).toBeVisible();
  await expect(page.getByText(/Get Started/i)).toBeVisible();
});
