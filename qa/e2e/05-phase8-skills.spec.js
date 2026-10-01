const { test, expect } = require('@playwright/test');
test.use({ storageState:'qa/.auth/qa-user.json' });

async function enter(page){
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#chars')).toBeVisible({timeout:20000});
  const row=page.locator('#charList .charrow').filter({has:page.locator('b',{hasText:/^Teste$/i})}).first();
  await expect(row).toBeVisible();
  await row.locator('[data-play]').click();
  await page.locator('#start').click();
  await page.waitForFunction(()=>{
    const q=window.__CLAUDONIA_QA__,s=q?.snapshot?.();
    return q?.mode==='read-only' && s?.connection?.authenticated===true && s?.character?.id;
  },null,{timeout:25000});
}

test('QA-008 Fase 8 arvore de habilidades em producao', async({page})=>{
  const errors=[]; const failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failed.push(r.url()));

  await enter(page);
  await page.locator('#bSkills').click();
  await expect(page.locator('#winSkills')).toBeVisible();
  await expect(page.locator('#skillClassTrack')).not.toBeEmpty();
  await expect(page.locator('#skillTreeCanvas')).not.toBeEmpty();
  await expect(page.locator('#skillPoints')).toHaveText(/^\d+$/);

  const ui=await page.evaluate(()=>({
    stage:document.querySelector('#skillCurrentStrip')?.textContent?.trim(),
    selected:document.querySelector('#skillSelectedName')?.textContent?.trim(),
    points:document.querySelector('#skillPoints')?.textContent?.trim(),
    nodes:document.querySelectorAll('#skillTreeCanvas [data-skill]').length,
    classStages:document.querySelectorAll('#skillClassTrack button').length
  }));
  console.log('QA_PHASE8_UI='+JSON.stringify(ui));
  if(ui.stage==='Aprendiz') expect(ui.nodes).toBe(0);
  else expect(ui.nodes).toBeGreaterThan(0);
  expect(ui.classStages).toBeGreaterThan(0);

  const state=await page.evaluate(()=>window.__CLAUDONIA_QA__.snapshot().skills);
  console.log('QA_PHASE8_STATE='+JSON.stringify(state));
  expect(state).toBeTruthy();

  await page.screenshot({path:'qa/artifacts/phase8-skills-production.png',fullPage:true});
  expect(errors,'sem pageerror na arvore de habilidades').toEqual([]);
  expect(failed.filter(u=>/assets\/ui\/skills|assets\/weapons/i.test(u)),'assets da Fase 8 devem carregar').toEqual([]);
});
