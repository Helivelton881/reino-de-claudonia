'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const NpcServiceManager=require('../server/npcs/npc-service-manager');
const NPCS=require('../server/data/npcs');

function make(){
  const sent=[],economyCalls=[],combatSync=[];
  const combat={
    refresh:()=>({maxHp:120,maxMp:90,maxFp:70}),
    sync:p=>combatSync.push({hp:p.hp,mp:p.mp,fp:p.fp})
  };
  const economy={act:(p,m)=>{economyCalls.push(m);return true;}};
  const mgr=new NpcServiceManager({send:(_ws,msg)=>sent.push(msg),combatManager:combat,economyManager:economy});
  const player={ws:{},x:0,z:0,dead:false,hp:10,mp:5,fp:3,dados:{hp:10,mp:5,fp:3,gold:100,inv:[]},dirty:false};
  return {mgr,player,sent,economyCalls,combatSync};
}

test('fase 7.10 registra 25 NPCs com serviços e diálogos úteis',()=>{
  assert.equal(NPCS.length,25);
  assert.ok(NPCS.some(n=>n.service==='healer'));
  assert.ok(NPCS.some(n=>n.service==='guild-registrar'));
  assert.ok(NPCS.filter(n=>n.service==='supply-shop').length>=3);
  assert.ok(NPCS.filter(n=>n.service==='guide').length>=9);
  const phase710=NPCS.filter(n=>['healer','supply-shop','guild-registrar','guide'].includes(n.service));
  assert.equal(phase710.length,15);
  assert.ok(phase710.every(n=>typeof n.dialogue==='string'&&n.dialogue.length>10));
});

test('curandeira restaura recursos apenas de perto e de forma autoritativa',()=>{
  const {mgr,player,sent,combatSync}=make(),npc=NPCS.find(n=>n.id==='curandeira_lysa');
  player.x=npc.x;player.z=npc.z;
  assert.equal(mgr.act(player,{npcId:npc.id,action:'heal'}),true);
  assert.deepEqual([player.hp,player.mp,player.fp],[120,90,70]);
  assert.deepEqual([player.dados.hp,player.dados.mp,player.dados.fp],[120,90,70]);
  assert.equal(player.dirty,true);
  assert.equal(combatSync.length,1);
  assert.equal(sent.at(-1).t,'npcServiceState');

  player.x=100;player.z=100;
  assert.equal(mgr.act(player,{npcId:npc.id,action:'heal'}),false);
  assert.match(sent.at(-1).msg,/Aproxime-se/i);
});

test('loja de suprimentos aplica whitelist por NPC',()=>{
  const {mgr,player,sent,economyCalls}=make(),npc=NPCS.find(n=>n.id==='mercador_nilo');
  player.x=npc.x;player.z=npc.z;
  assert.equal(mgr.act(player,{npcId:npc.id,action:'buy',itemId:'pocao_vida'}),true);
  assert.deepEqual(economyCalls.at(-1),{action:'buy',itemId:'pocao_vida'});
  assert.equal(mgr.act(player,{npcId:npc.id,action:'buy',itemId:'runa_maior'}),false);
  assert.match(sent.at(-1).msg,/indisponível/i);
});
