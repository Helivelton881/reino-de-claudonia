'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {MONSTER_TYPES,ZONES}=require('../server/data/monsters');
const {VARIANTS,FAMILY_SKILLS,WORLD_BOSSES,variantForSpawn}=require('../server/data/monster-ecosystem');
const MonsterManager=require('../server/world/monster-manager');
const BESTIARY=require('../server/data/bestiary');
function manager(rng=()=>.5){
 const players=new Map(),sent=[];const spawnManager={point:key=>({x:ZONES[key].x,z:ZONES[key].z})};
 return {m:new MonsterManager({types:MONSTER_TYPES,zones:ZONES,spawnManager,players,send:(ws,msg)=>sent.push(msg),rng,navigation:null}),players,sent};
}
test('fase 10 define normal rare elite giant e skills para 9 familias',()=>{
 assert.deepEqual(Object.keys(VARIANTS),['normal','rare','elite','giant']);
 assert.ok(Object.keys(FAMILY_SKILLS).length>=9);
 for(const key of Object.keys(MONSTER_TYPES))assert.ok(FAMILY_SKILLS[key]?.length,key);
});
test('initialize cria giant para cada familia',()=>{
 const {m}=manager();m.initialize();const giants=[...m.monsters.values()].filter(x=>x.giant);
 assert.equal(giants.length,Object.keys(MONSTER_TYPES).length);
 for(const g of giants){assert.equal(g.variant,'giant');assert.ok(g.maxHp>500);assert.ok(g.respawnMs>=300000);}
});
test('rare e elite escalam atributos e preservam familia',()=>{
 const {m}=manager();const normal=m.spawn('golem',false,null,'normal'),elite=m.spawn('golem',false,null,'elite');
 assert.equal(elite.key,normal.key);assert.equal(elite.variant,'elite');assert.ok(elite.maxHp>normal.maxHp);assert.ok(elite.attack>normal.attack);
});
test('contribuicao calcula share server-side',()=>{
 const {m}=manager();const mob=m.spawn('lobo',false,null,'elite');m.recordContribution(mob,'a',75);m.recordContribution(mob,'b',25);
 const s=Object.fromEntries(m.contributionShares(mob).map(x=>[x.playerId,x.share]));assert.equal(s.a,.75);assert.equal(s.b,.25);
});
test('rotacao rara e world boss sao data-driven',()=>{
 assert.equal(variantForSpawn(()=>.005),'elite');assert.equal(variantForSpawn(()=>.02),'rare');assert.equal(variantForSpawn(()=>.5),'normal');
 const b=WORLD_BOSSES.guardiao_cinzas;assert.equal(b.level,60);assert.ok(b.phases.length>=3);assert.ok(b.rewards.minContribution>0);
});
test('world boss tem fases enrage e elegibilidade por contribuicao',()=>{
 const {m}=manager();const b=m.spawnWorldBoss();assert.equal(b.worldBoss,true);assert.equal(b.phase,1);assert.equal(b.hp,42000);
 m.recordContribution(b,'a',970);m.recordContribution(b,'tagger',30);assert.deepEqual(m.eligibleContributors(b,.04).map(x=>x.playerId),['a']);
 b.hp=b.maxHp*.3;m.updateBossPhase(b);assert.equal(b.phase,3);assert.ok(b.attack>b.bossConfig.attack);
});
test('bestiario preserva as familias e world boss da fase 10',()=>{assert.ok(BESTIARY.entries.length>=9);assert.ok(BESTIARY.bosses.length>=1);assert.ok(BESTIARY.entries.every(x=>x.variants.includes('giant')&&x.skills.length));});
test('assets Blender da fase 10 ficam dentro do budget web',()=>{const fs=require('node:fs'),path=require('node:path');for(const n of ['monster_rare.glb','monster_elite.glb','monster_giant.glb','worldboss_guardiao_cinzas.glb']){const p=path.join(__dirname,'..','public','assets','world','monsters','phase10',n),s=fs.statSync(p).size;assert.ok(s>1000&&s<256000,`${n}: ${s}`);}});
