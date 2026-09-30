const { test, expect } = require('@playwright/test');

test('QA-SETUP capturar sessão autenticada manualmente', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  console.log('QA_SETUP: faça login manualmente na janela do Chromium.');
  await expect(page.locator('#chars')).toBeVisible({ timeout: 300_000 });
  await page.context().storageState({ path: 'qa/.auth/qa-user.json' });
  console.log('QA_SETUP_SAVED=qa/.auth/qa-user.json');
});
