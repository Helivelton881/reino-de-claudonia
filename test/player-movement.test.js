'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {WorldNavigation}=require('../server/world/navigation-world');
const {validateMovement,sanitizeSavedPosition,sanitizeAction}=require('../server/world/player-movement');

const nav=new WorldNavigation();

function playerAt(x,z,extra={}){
  const s=nav.playerSurfaceAt(x,z);
  return Object.assign({
    x,z,y:s?s.h:0,a:0,L:20,dead:false,shop:null,lastDamagedAt:0,
    dados:{eq:{voo:null}},fallingFromFlight:false
  },extra);
}

test('movimento terrestre válido é aceito',()=>{
  const p=playerAt(0,5);
  const s=nav.playerSurfaceAt(1,5);
  const r=validateMovement({navigation:nav,player:p,to:{x:1,y:s.h,z:5},requestedAction:0,elapsed:.1,now:10000});
  assert.equal(r.ok,true);
  assert.equal(r.action,0);
});

test('limite terrestre aceita corrida normal e rejeita speedhack',()=>{
  let p=playerAt(0,5), s=nav.playerSurfaceAt(0.9,5);
  let r=validateMovement({navigation:nav,player:p,to:{x:0.9,y:s.h,z:5},requestedAction:0,elapsed:.1,now:10000});
  assert.equal(r.ok,true);
  p=playerAt(0,5);s=nav.playerSurfaceAt(2,5);
  r=validateMovement({navigation:nav,player:p,to:{x:2,y:s.h,z:5},requestedAction:0,elapsed:.1,now:10000});
  assert.equal(r.ok,false);assert.equal(r.reason,'speed');
});

test('servidor rejeita atravessar obstáculo mesmo com destino livre',()=>{
  const p=playerAt(-4,0);
  const s=nav.playerSurfaceAt(4,0);
  const r=validateMovement({navigation:nav,player:p,to:{x:4,y:s.h,z:0},requestedAction:0,elapsed:1,now:10000});
  assert.equal(r.ok,false);
  assert.equal(r.reason,'blocked-path');
});

test('servidor rejeita destino dentro de collider',()=>{
  const p=playerAt(0,5);
  const s=nav.playerSurfaceAt(0,0);
  const r=validateMovement({navigation:nav,player:p,to:{x:0,y:s.h,z:0},requestedAction:0,elapsed:1,now:10000});
  assert.equal(r.ok,false);
  assert.equal(r.reason,'blocked-destination');
});

test('voo falsificado não libera velocidade de voo',()=>{
  const p=playerAt(0,5,{L:12,dados:{eq:{voo:null}}});
  assert.equal(sanitizeAction(p,4),0);
  const s=nav.playerSurfaceAt(20,5);
  const r=validateMovement({navigation:nav,player:p,to:{x:20,y:s.h,z:5},requestedAction:4,elapsed:.1,now:10000});
  assert.equal(r.ok,false);
  assert.equal(r.reason,'speed');
});

test('voo legítimo ignora obstáculos de solo e normaliza prancha/vassoura',()=>{
  const p=playerAt(-4,0,{a:4,L:20,y:12,dados:{eq:{voo:'prancha_madeira'}}});
  let r=validateMovement({navigation:nav,player:p,to:{x:4,y:12,z:0},requestedAction:5,elapsed:1,now:10000});
  assert.equal(r.ok,true);
  assert.equal(r.action,4);
  p.dados.eq.voo='vassoura_simples';
  assert.equal(sanitizeAction(p,4),5);
});

test('solo rejeita altitude incompatível',()=>{
  const p=playerAt(0,5);
  const s=nav.playerSurfaceAt(0,5);
  const r=validateMovement({navigation:nav,player:p,to:{x:0,y:s.h+10,z:5},requestedAction:0,elapsed:1,now:10000});
  assert.equal(r.ok,false);
  assert.equal(r.reason,'ground-height');
});

test('caminhada em ilha compartilhada é válida',()=>{
  const p=playerAt(250,-60);
  const s=nav.playerSurfaceAt(251,-60);
  const r=validateMovement({navigation:nav,player:p,to:{x:251,y:s.h,z:-60},requestedAction:0,elapsed:.2,now:10000});
  assert.equal(r.ok,true);
  assert.equal(s.kind,'island');
});

test('posição salva inválida é corrigida para local navegável',()=>{
  const inside=sanitizeSavedPosition(nav,0,0);
  assert.equal(nav.isPlayerWalkable(inside.x,inside.z,.45),true);
  assert.equal(inside.corrected,true);
  const far=sanitizeSavedPosition(nav,400,400);
  assert.equal(nav.isPlayerWalkable(far.x,far.z,.45),true);
  assert.equal(far.corrected,true);
});

test('jogador morto não pode deslocar posição',()=>{
  const p=playerAt(0,5,{dead:true});
  const s=nav.playerSurfaceAt(1,5);
  const r=validateMovement({navigation:nav,player:p,to:{x:1,y:s.h,z:5},requestedAction:0,elapsed:.2,now:10000});
  assert.equal(r.ok,false);
  assert.equal(r.reason,'dead');
});
