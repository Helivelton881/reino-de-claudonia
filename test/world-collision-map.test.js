'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const world=require('../public/js/world-collision-map');
const {WorldNavigation}=require('../server/world/navigation-world');

test('mapa físico compartilhado é determinístico e tem densidade fixa',()=>{
  const w=world.generate(), solids=world.solidNaturalColliders();
  assert.equal(w.trees.length,420);
  assert.equal(w.bushes.length,120);
  assert.equal(w.rocks.length,240);
  assert.equal(w.bushes.filter(x=>x.solid).length,39);
  assert.equal(w.rocks.filter(x=>x.solid).length,159);
  assert.equal(solids.length,618);
  assert.ok(Math.abs(solids[0].x-(-87.8740007834422))<1e-9);
  assert.ok(Math.abs(solids[0].z-(-49.57773710330561))<1e-9);
});

test('navegação do servidor inclui natureza e NPCs compartilhados',()=>{
  const nav=new WorldNavigation();
  const c=world.solidNaturalColliders()[0];
  assert.equal(nav.blockedAt(c.x,c.z,0),true);
  assert.equal(world.STATIC_NPCS.length,6);
  assert.equal(nav.colliders.length,732);
  assert.ok(nav.colliders.some(x=>x.kind==='tree'));
  assert.ok(nav.colliders.some(x=>x.kind==='bush'));
  assert.ok(nav.colliders.some(x=>x.kind==='rock'));
  for(const npc of world.STATIC_NPCS) assert.equal(nav.blockedAt(npc.x,npc.z,0),true);
});

test('cliente usa o mesmo mapa físico e não varia sólidos por HQ',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
  assert.match(html,/world-collision-map\.js/);
  assert.match(html,/ClaudoniaWorldCollision\.generate\(\)/);
  assert.doesNotMatch(html,/MAXT\s*=\s*HQ/);
  assert.doesNotMatch(html,/scatterVeg\(HQ \? 320 : 120/);
  assert.doesNotMatch(html,/scatterVeg\(HQ \? 340 : 240/);
});
