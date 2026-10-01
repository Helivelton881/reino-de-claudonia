const { test, expect } = require('@playwright/test');
test.use({ storageState:'qa/.auth/qa-user.json' });
test.setTimeout(120000);

async function enter(page){
  await page.goto('/?debug=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#chars')).toBeVisible({timeout:20000});
  const row=page.locator('#charList .charrow').filter({has:page.locator('b',{hasText:/^Teste$/i})}).first();
  await expect(row).toBeVisible();
  await row.locator('[data-play]').click();
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.__CLAUDONIA_QA__?.snapshot?.()?.connection?.authenticated===true,null,{timeout:25000});
  await page.waitForFunction(()=>window.__claudonia?.qaPreviewItem,null,{timeout:15000});
}
test('QA-009 Fase 9 KayKit preview 3D em producao', async({page})=>{
  const errors=[]; const failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failed.push(r.url()));
  await enter(page);
  const catalog=await page.evaluate(()=>window.__CLAUDONIA_QA__.snapshot().items);
  console.log('QA_PHASE9_ITEM_STATE='+JSON.stringify(catalog));
  await page.waitForFunction(()=>Object.keys(window.__claudonia.qaItemCatalog().equipment||{}).length>0,null,{timeout:15000});
  const targets=await page.evaluate(()=>Object.values(window.__claudonia.qaItemCatalog().equipment).filter(x=>x.model&&x.model.includes('/kaykit/')).filter((x,i,a)=>a.findIndex(y=>y.model===x.model)===i).map(x=>x.id));
  for(const id of targets){
    const result=await page.evaluate(async id=>await window.__claudonia.qaPreviewItem(id),id);
    console.log('QA_PHASE9_PREVIEW='+JSON.stringify(result));
    expect(result.ok,id).toBeTruthy();
    await page.waitForTimeout(800);
    await page.screenshot({path:'qa/artifacts/phase9-'+id+'.png'});
  }
  expect(errors,'sem pageerror nos previews 3D').toEqual([]);
  expect(failed.filter(u=>/assets\/equipment\/phase9\/kaykit/i.test(u)),'GLBs KayKit devem carregar').toEqual([]);
});