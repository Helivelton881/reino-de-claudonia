const { test, expect } = require('@playwright/test');

test.use({ storageState: 'qa/.auth/qa-user.json' });

test('QA-003 entrar com personagem teste nível 1', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#chars')).toBeVisible({ timeout: 20_000 });
  const rows = page.locator('#charList .charrow');
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });

  const count = await rows.count();
  const found = [];
  for (let i=0; i<count; i++) {
    const row = rows.nth(i);
    found.push({
      index:i,
      name:(await row.locator('b').textContent()).trim(),
      info:(await row.locator('span').textContent()).trim()
    });
  }
  console.log('QA_CHARACTERS=' + JSON.stringify(found));

  const candidates = found.filter(c => /Nível\s+1\b/i.test(c.info));
  expect(candidates.length, 'Precisa existir ao menos um personagem nível 1').toBeGreaterThan(0);
  const preferred = candidates.find(c => /teste/i.test(c.name)) || candidates[0];
  console.log('QA_SELECTED=' + JSON.stringify(preferred));

  await rows.nth(preferred.index).locator('[data-play]').click();
  await expect(page.locator('#help')).toBeVisible();
  await page.locator('#start').click();

  await page.waitForFunction(() => {
    const s=window.__CLAUDONIA_QA__?.snapshot();
    return s?.connection?.authenticated && s?.connection?.connected && !!s?.character?.id;
  }, null, { timeout: 25_000 });

  const s=await page.evaluate(() => window.__CLAUDONIA_QA__.snapshot());
  expect(s.character.name).toBe(preferred.name);
  expect(s.character.level).toBe(1);
  expect(s.connection.connected).toBe(true);
  console.log('QA_GAME_ENTRY=' + JSON.stringify({character:s.character,connection:s.connection,position:s.position}));
  await page.screenshot({path:'qa/artifacts/qa-003-character-level1.png',fullPage:true});
});
