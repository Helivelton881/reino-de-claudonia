const {test,expect}=require('@playwright/test'); test.use({storageState:'qa/.auth/qa-user.json'});
const snap=p=>p.evaluate(()=>window.__CLAUDONIA_QA__.snapshot());
async function enter(p,navigate=true){if(navigate)await p.goto('/',{waitUntil:'domcontentloaded'});const r=p.locator('#charList .charrow').filter({has:p.locator('b',{hasText:/^Teste$/i})}).first();await expect(r).toBeVisible({timeout:20000});await r.locator('[data-play]').click();await p.locator('#start').click();await p.waitForFunction(()=>{const q=window.__CLAUDONIA_QA__,s=q?.snapshot?.();return q?.mode==='read-only'&&s?.connection?.authenticated===true&&s?.character?.id&&s?.character?.level>=1&&Number.isFinite(s?.position?.x);},null,{timeout:25000});}
async function tap(p,k,ms=350){await p.keyboard.down(k);await p.waitForTimeout(ms);await p.keyboard.up(k);await p.waitForTimeout(100);}
async function basis(p){const o=(await snap(p)).position;await tap(p,'w',300);const w=(await snap(p)).position;await tap(p,'s',300);await tap(p,'d',300);const d=(await snap(p)).position;await tap(p,'a',300);return {w:{x:w.x-o.x,z:w.z-o.z},d:{x:d.x-o.x,z:d.z-o.z}};}
async function drive(p,tx,tz,tol=2.4,max=160){const b=await basis(p),ds={w:b.w,s:{x:-b.w.x,z:-b.w.z},d:b.d,a:{x:-b.d.x,z:-b.d.z}};for(let i=0;i<max;i++){const s=await snap(p),dx=tx-s.position.x,dz=tz-s.position.z,dist=Math.hypot(dx,dz);if(dist<=tol)return;let key='w',score=-1e9;for(const[k,v]of Object.entries(ds)){const q=(dx*v.x+dz*v.z)/(Math.hypot(v.x,v.z)||1);if(q>score){score=q;key=k}}await tap(p,key,Math.min(600,Math.max(180,dist*50)));}throw Error('drive timeout');}
test('QA-004C NPC drop pickup persistência',async({page})=>{await enter(page);let s=await snap(page);const xp0=s.character.exp,g0=s.character.gold;
 const npc=[...s.world.npcs].sort((a,b)=>a.distance-b.distance)[0];
 await page.evaluate(id=>{const u=new URL(location.href);u.searchParams.set('debug','1');sessionStorage.setItem('qaNpcTarget',id);location.href=u.toString();},npc.id);
 await page.waitForLoadState('domcontentloaded');await enter(page,false);const targetId=await page.evaluate(()=>sessionStorage.getItem('qaNpcTarget'));
 const invoked=await page.evaluate(id=>window.__claudonia?.qaGoToNpc(id),targetId);expect(invoked).toBe(true);
 for(let i=0;i<12;i++){s=await snap(page);const qn=s.world.npcs.find(n=>n.id===targetId);console.log('QA_NPC_ROUTE='+JSON.stringify({t:i*2,id:targetId,d:qn?.distance,pos:s.position,path:s.world.movePathLength,npcGoal:s.world.npcGoal,npcOpen:s.world.npcOpen}));if(s.world.npcOpen===targetId)break;await page.waitForTimeout(2000);}
 s=await snap(page);expect(s.world.npcOpen,'NPC deve abrir após aproximação A*').toBe(targetId);const npcNow=s.world.npcs.find(n=>n.id===targetId);
 console.log('QA_NPC_INTERACTION='+JSON.stringify({id:targetId,d:npcNow?.distance,npcOpen:s.world.npcOpen,path:s.world.movePathLength}));
 await expect(page.locator('#winNpc')).toBeVisible();expect(s.world.npcOpen).toBe(targetId);expect(npcNow.distance).toBeLessThan(3.2);
 // Combate repetido até observar drop ou no máximo 5 mortes.
 let dropSeen=null;
 for(let kill=0;kill<5&&!dropSeen;kill++){s=await snap(page);const mob=[...s.world.monsters].sort((a,b)=>a.distance-b.distance)[0];await drive(page,mob.x,mob.z,11);
  await page.keyboard.press('Tab');await page.waitForTimeout(400);s=await snap(page);if(!s.combat.targetId)throw Error('sem target');
  const id=s.combat.targetId;await page.keyboard.press('1');
  for(let i=0;i<30;i++){await page.waitForTimeout(700);s=await snap(page);if(!s.world.monsters.some(m=>m.id===id))break;}
  await page.waitForTimeout(500);s=await snap(page);if(s.world.drops.length){dropSeen=[...s.world.drops].sort((a,b)=>a.distance-b.distance)[0];console.log('QA_DROP_SEEN='+JSON.stringify(dropSeen));}
 }
 expect((await snap(page)).character.exp).toBeGreaterThan(xp0);
 if(dropSeen){await drive(page,dropSeen.x,dropSeen.z,1.2);await page.waitForTimeout(1800);s=await snap(page);console.log('QA_PICKUP='+JSON.stringify({drops:s.world.drops,inv:s.inventory,gold:s.character.gold}));}
 else console.log('QA_DROP_NOT_SEEN_AFTER_5_KILLS');
 const before=await snap(page);const persist={xp:before.character.exp,gold:before.character.gold,inv:before.inventory,level:before.character.level};
 await page.reload({waitUntil:'domcontentloaded'});const row=page.locator('#charList .charrow').filter({has:page.locator('b',{hasText:/^Teste$/i})}).first();await expect(row).toBeVisible({timeout:20000});await row.locator('[data-play]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__CLAUDONIA_QA__?.snapshot().connection.connected,null,{timeout:25000});
 const after=await snap(page);console.log('QA_PERSIST='+JSON.stringify({before:persist,after:{xp:after.character.exp,gold:after.character.gold,inv:after.inventory,level:after.character.level}}));
 expect(after.character.exp).toBe(persist.xp);expect(after.character.gold).toBe(persist.gold);expect(after.character.level).toBe(persist.level);expect(after.inventory).toEqual(persist.inv);
 await page.screenshot({path:'qa/artifacts/qa-004c-persist.png',fullPage:true});
});