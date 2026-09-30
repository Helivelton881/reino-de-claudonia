const { test, expect } = require('@playwright/test');

test('QA-002 telemetria somente leitura está disponível', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__CLAUDONIA_QA__?.mode === 'read-only');

  const qa = await page.evaluate(() => {
    const api = window.__CLAUDONIA_QA__;
    const descriptor = Object.getOwnPropertyDescriptor(window, '__CLAUDONIA_QA__');
    return { version:api.version, mode:api.mode, descriptor, snapshot:api.snapshot() };
  });

  expect(qa.mode).toBe('read-only');
  expect(qa.descriptor.writable).toBe(false);
  expect(qa.descriptor.configurable).toBe(false);
  expect(qa.snapshot.schemaVersion).toBe(1);
  expect(qa.snapshot.character.level).toBeGreaterThanOrEqual(1);
  expect(qa.snapshot.inventory).toBeInstanceOf(Array);
  expect(qa.snapshot.equipment.slots).toBeTruthy();
  expect(qa.snapshot.skills.tree).toBeTruthy();
  expect(qa.snapshot.position).toEqual(expect.objectContaining({x:expect.any(Number), y:expect.any(Number), z:expect.any(Number)}));

  console.log('QA_TELEMETRY=' + JSON.stringify(qa.snapshot));
});
