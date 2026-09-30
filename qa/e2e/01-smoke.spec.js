const { test, expect } = require('@playwright/test');

test('QA-001 smoke: Render abre e cliente inicializa', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'Render deve responder').not.toBeNull();
  expect(response.status(), 'HTTP inicial deve ser < 400').toBeLessThan(400);

  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'qa/artifacts/qa-001-home.png', fullPage: true });

  console.log('QA_URL=' + page.url());
  console.log('QA_TITLE=' + await page.title());
  console.log('QA_CONSOLE_ERRORS=' + JSON.stringify(consoleErrors));
  console.log('QA_PAGE_ERRORS=' + JSON.stringify(pageErrors));
});
