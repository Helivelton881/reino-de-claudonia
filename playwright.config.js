const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './qa/e2e',
  outputDir: './qa/artifacts/test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: './qa/artifacts/html-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.QA_BASE_URL || 'https://reino-de-claudonia.onrender.com',
    headless: false,
    viewport: { width: 1440, height: 900 },
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 15_000,
    navigationTimeout: 45_000
  },
  projects: [{ name: 'chromium-human-qa', use: { browserName: 'chromium' } }]
});
