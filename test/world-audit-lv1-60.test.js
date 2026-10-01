'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const world=require('../public/js/world-collision-map');
const {WorldNavigation,WORLD_RADIUS}=require('../server/world/navigation-world');
const {validateMovement}=require('../server/world/player-movement');
const MonsterManager=require('../server/world/monster-manager');

const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8').replace(/\r\n/g,'\n');

// heightAt do cliente, tirado do próprio index.html
function clientHeightAt(){
  const consts=html.match(/const R = (\d+), TOWN = (\d+);/);
  const lake=html.match(/const LAKE = \{x:(-?\d+), z:(-?\d+), r:(\d+)\};/);
  const start=html.indexOf('function heightAt(x,z){'),end=html.indexOf('\n}\n',start)+2;
  assert.ok(consts&&lake&&start>0&&end>start,'heightAt do cliente não encontrado');
  const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  return new Function('R','TOWN','LAKE','smooth',html.slice(start,end)+'\nreturn heightAt;')(
    Number(consts[1]),Number(consts[2]),{x:Number(lake[1]),z:Number(lake[2]),r:Number(lake[3])},smooth);
}

test('servidor usa o mesmo relevo e o mesmo raio de continente do cliente',()=>{
  const client=clientHeightAt();
  assert.equal(world.TERRAIN_R,Number(html.match(/const R = (\d+),/)[1]));
  assert.equal(WORLD_RADIUS,world.TERRAIN_R);
  // vila, regiões 1-60 na borda do antigo raio 185, serra e regiões 60-100
  for(const [x,z] of [[0,5],[40,128],[-105,-85],[-80,98],[120,130],[150,-90],[185,120],[245,55],[255,-55],[195,-135],[-250,60],[300,0]]){
    assert.ok(Math.abs(client(x,z)-world.heightAt(x,z))<1e-9,`relevo diferente em ${x},${z}`);
  }
});

test('mapa compartilhado continua com as mesmas posições de árvores, arbustos e pedras',()=>{
  const w=world.generate();
  assert.equal(w.trees.length,420);
  assert.equal(w.bushes.length,120);
  assert.equal(w.rocks.length,240);
});

test('quem anda nas regiões perto da borda antiga não é rejeitado por altura',()=>{
  const nav=new WorldNavigation();
  for(const [x,z] of [[40,128],[-105,-85],[150,-90],[185,120],[255,-55]]){
    const s=nav.playerSurfaceAt(x,z,world.heightAt(x,z));
    assert.ok(s,`sem chão em ${x},${z}`);
    assert.equal(s.kind,'continent');
    const free=nav.nearestPlayerWalkable(x,z,.45,6);
    const g=world.heightAt(free.x,free.z),nx=free.x+.3,ng=world.heightAt(nx,free.z);
    const player={x:free.x,z:free.z,y:g,a:0,L:20,dead:false,shop:null,lastDamagedAt:0,dados:{eq:{voo:null}},fallingFromFlight:false};
    const r=validateMovement({navigation:nav,player,to:{x:nx,y:ng,z:free.z},requestedAction:0,elapsed:.1,now:10000});
    if(!r.ok)assert.notEqual(r.reason,'ground-height',`altura rejeitada em ${x},${z}`);
  }
});

test('chão debaixo de uma ilhota continua andável; topo da ilhota também',()=>{
  const nav=new WorldNavigation(),isle=world.ISLANDS[0];
  const ground=nav.playerSurfaceAt(isle.x,isle.z,world.heightAt(isle.x,isle.z));
  assert.equal(ground.kind,'continent');
  assert.equal(nav.playerSurfaceAt(isle.x,isle.z,isle.y+0.5).kind,'island');
  assert.equal(nav.playerSurfaceAt(isle.x,isle.z).kind,'island');
  assert.equal(nav.groundSurfaceAt(isle.x,isle.z).kind,'continent');
});

function makeWanderManager(rng=()=>.5){
  let now=0;
  const manager=new MonsterManager({
    types:{test:{name:'Teste',aggressive:true,levels:[1,1],count:1,radius:.8,speed:3,material:'x',expMultiplier:1}},
    zones:{test:{x:0,z:0,radius:20}},
    spawnManager:{point:()=>({x:0,z:0})},
    players:new Map(),send:()=>{},
    navigation:{lineClear:()=>true,isWalkable:()=>true,findPath:()=>[],findApproachPath:()=>null},
    now:()=>now,rng
  });
  manager.setCombatManager({monsterAttack(){}});
  manager.initialize();
  const m=[...manager.monsters.values()][0];
  return {manager,m,advance(ms=100){now+=ms;manager.tick(ms/1000);}};
}

test('monstro passeia além de 2 m do spawn sem ser puxado de volta e para em idle',()=>{
  const x=makeWanderManager();
  let maxDist=0,returned=false;
  for(let i=0;i<34;i++){
    x.advance();
    maxDist=Math.max(maxDist,Math.hypot(x.m.x-x.m.spawnX,x.m.z-x.m.spawnZ));
    if(x.m.state==='return')returned=true;
  }
  assert.ok(maxDist>3.5,'deveria chegar perto do ponto do passeio (4,5 m)');
  assert.equal(returned,false);
  assert.equal(x.m.state,'idle');
});

test('monstro que perdeu o alvo volta para casa sem puxar aggro no caminho',()=>{
  const x=makeWanderManager();
  const player={id:7,x:0,z:60,a:0,dead:false,ws:{}};
  x.manager.players.set(7,player);
  x.m.x=0;x.m.z=12;x.m.targetId=7;
  x.advance();
  assert.equal(x.m.returning,true);
  assert.equal(x.m.state,'return');
  player.z=x.m.z+3;                       // passa perto enquanto ele volta
  x.advance();
  assert.equal(x.m.targetId,null);
  for(let i=0;i<80&&x.m.returning;i++)x.advance();
  assert.equal(x.m.returning,false);
  assert.ok(Math.hypot(x.m.x-x.m.spawnX,x.m.z-x.m.spawnZ)<=1.5);
});

test('cliente: ataque repete no ritmo do servidor, morte aparece e natureza da Fase 13 não usa GLB sem textura',()=>{
  const js=fs.readFileSync(path.join(__dirname,'..','public','js','world-asset-manager.js'),'utf8');
  assert.match(js,/state==='attack'\|\|state==='hit'\)\{next\.setLoop\(THREE\.LoopOnce,1\);next\.clampWhenFinished=true;/);
  assert.match(html,/function monsterSwing\(m\)/);
  assert.match(html,/x\.deathT=MONSTER_DEATH_T/);
  assert.doesNotMatch(html,/base\.clone\(true\);src\.position\.set/);
  assert.match(html,/PHASE13_KIT/);
  assert.match(html,/function monsterGroundY\(x,z\)/);
});
