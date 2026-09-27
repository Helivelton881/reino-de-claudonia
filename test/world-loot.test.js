'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const SpawnManager=require('../server/world/spawn-manager');const MonsterManager=require('../server/world/monster-manager');const LootManager=require('../server/loot/loot-manager');

test('dois jogadores próximos recebem os mesmos IDs e estado no snapshot',()=>{
  const players=new Map([[1,{id:1,x:0,z:0}],[2,{id:2,x:1,z:1}]]);const spawn=new SpawnManager({slime:{x:0,z:0,radius:2}},()=>0);
  const manager=new MonsterManager({types:{slime:{name:'Slime',aggressive:false,levels:[1,1],count:1,height:1,radius:1,speed:1,material:'gosma',expMultiplier:1}},zones:{slime:{x:0,z:0,radius:2}},spawnManager:spawn,players,send:()=>{},rng:()=>0});
  manager.initialize();const a=manager.snapshotFor(players.get(1)),b=manager.snapshotFor(players.get(2));assert.deepEqual(a,b);assert.equal(a[0].id,1);
});

test('loot não duplica em corrida de coleta',()=>{
  const messages=[],players=new Map();const p1={id:1,ws:{},x:0,z:0,dados:{inv:[],gold:0}},p2={id:2,ws:{},x:0,z:0,dados:{inv:[],gold:0}};players.set(1,p1);players.set(2,p2);
  const lm=new LootManager({players,send:(ws,m)=>messages.push(m),emitNearby:()=>{},rng:()=>0});
  const entity={id:99,x:0,z:0,value:{gold:10},allowed:new Set([1,2]),expiresAt:9999999999999};lm.loot.set(99,entity);
  assert.equal(lm.pickup(p1,99),true);assert.equal(lm.pickup(p2,99),false);assert.equal(p1.dados.gold,10);assert.equal(p2.dados.gold,0);
});
