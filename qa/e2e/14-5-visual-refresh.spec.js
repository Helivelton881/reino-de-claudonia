const {test,expect}=require('@playwright/test');
test.use({storageState:'qa/.auth/qa-user.json'});test.setTimeout(90000);
test('QA-016 refresh visual 14.5 em producao',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?debug=1',{waitUntil:'domcontentloaded'});
 const row=page.locator('#charList .charrow').filter({has:page.locator('b',{hasText:/^Teste$/i})}).first();
 await expect(row).toBeVisible({timeout:20000});await row.locator('[data-play]').click();await page.locator('#start').click();
 await page.waitForFunction(()=>window.__CLAUDONIA_QA__?.snapshot?.()?.connection?.authenticated===true,null,{timeout:25000});
 const files=['/assets/world/nature_refresh14_5.glb','/assets/world/monsters/refresh14_5/bolota.glb','/assets/world/monsters/refresh14_5/ciclope.glb','/assets/world/drops/refresh14_5/gold.glb','/assets/world/drops/refresh14_5/equipment.glb'];
 const status=await page.evaluate(async fs=>Object.fromEntries(await Promise.all(fs.map(async f=>[f,(await fetch(f,{method:'HEAD'})).status]))),files);
 console.log('QA_VISUAL_ASSETS='+JSON.stringify(status));for(const v of Object.values(status))expect(v).toBe(200);
 const s=await page.evaluate(()=>window.__CLAUDONIA_QA__.snapshot());console.log('QA_VISUAL_WORLD='+JSON.stringify({monsters:s.world.monsters.length,npcs:s.world.npcs.length,area:s.area||null}));
 const map=await page.evaluate(()=>window.CLAUDONIA_WORLD_ASSETS?.monsterVariants||{});expect(Object.keys(map)).toHaveLength(9);expect(map.bolota).toContain('refresh14_5');expect(map.ciclope).toContain('refresh14_5');await page.waitForTimeout(3000);expect(errors).toEqual([]);
 await page.screenshot({path:'qa/artifacts/phase14-5-visual-refresh.png'});
});