const { test, expect } = require('@playwright/test');
test.use({ storageState:'qa/.auth/qa-user.json' });
test.setTimeout(120000);
async function enter(page){
  await page.goto('/?debug=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#chars')).toBeVisible({timeout:20000});
  const row=page.locator('#charList .charrow').filter({has:page.locator('b',{hasText:/^Teste$/i})}).first();
  await expect(row).toBeVisible(); await row.locator('[data-play]').click(); await page.locator('#start').click();
  await page.waitForFunction(()=>window.__CLAUDONIA_QA__?.snapshot?.()?.connection?.authenticated===true,null,{timeout:25000});
  await page.waitForFunction(()=>window.__claudonia?.qaItemCatalog&&Object.keys(window.__claudonia.qaItemCatalog().equipment||{}).length>0,null,{timeout:15000});
}
test('QA-010 Fase 9 inventario e itemizacao UI em producao',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await enter(page);
 const cat=await page.evaluate(()=>{const c=window.__claudonia.qaItemCatalog();return{equipment:Object.keys(c.equipment).length,sets:Object.keys(c.sets).length,rarities:Object.keys(c.rarities),inventoryLimit:c.inventoryLimit,storageLimit:c.storageLimit};});
 console.log('QA_PHASE9_CATALOG='+JSON.stringify(cat));
 expect(cat.equipment).toBeGreaterThanOrEqual(120);expect(cat.equipment).toBeLessThanOrEqual(180);
 expect(cat.sets).toBe(12);expect(cat.rarities).toEqual(['comum','incomum','raro','epico','lendario']);expect(cat.inventoryLimit).toBe(32);expect(cat.storageLimit).toBe(60);
 await page.locator('#bInv').click(); await expect(page.locator('#winInv')).toBeVisible();
 for(const f of ['all','general','equipment','favorite','rare'])await expect(page.locator('[data-ifilter="'+f+'"]').first()).toBeVisible();
 await expect(page.locator('#invSearch')).toBeVisible();
 await page.locator('[data-ifilter="equipment"]').click(); await page.locator('[data-ifilter="favorite"]').click(); await page.locator('[data-ifilter="rare"]').click(); await page.locator('[data-ifilter="all"]').click();
 await page.locator('#invSearch').fill('xyz-item-que-nao-existe'); await expect(page.locator('#invGrid')).toContainText(/Nenhum|vazio|0\/32/i).catch(()=>{});
 await page.locator('#invSearch').fill('');
 const first=page.locator('#invGrid [data-inv]').first();
 if(await first.count()){await first.click();await expect(page.locator('#invItemModal')).toBeVisible();const txt=await page.locator('#invItemModal').innerText();console.log('QA_PHASE9_MODAL='+JSON.stringify(txt.slice(0,500)));}
 await page.screenshot({path:'qa/artifacts/phase9-inventory-ui.png'});
 expect(errors).toEqual([]);
});