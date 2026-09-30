'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const MonsterManager=require('../server/world/monster-manager');
const {WorldNavigation}=require('../server/world/navigation-world');

function makeManager({playerX=5,playerZ=0,startX=-5,startZ=0,aggressive=true}={}){
  let now=0, attacks=0;
  const player={id:1,x:playerX,z:playerZ,a:0,dead:false,ws:{}};
  const players=new Map([[1,player]]);
  const spawnManager={point:()=>({x:startX,z:startZ})};
  const types={test:{name:'Teste',aggressive,levels:[1,1],count:1,radius:0.8,speed:3,material:'x',expMultiplier:1}};
  const zones={test:{x:0,z:0,radius:100}};
  const navigation=new WorldNavigation();
  const manager=new MonsterManager({types,zones,spawnManager,players,send:()=>{},navigation,now:()=>now,rng:()=>0});
  manager.setCombatManager({monsterAttack(){attacks++;}});
  manager.initialize();
  const monster=[...manager.monsters.values()][0];
  return {manager,monster,player,navigation,advance(ms=100){now+=ms;manager.tick(ms/1000);},get attacks(){return attacks;}};
}

test('monstro usa A* para contornar o poço ao perseguir jogador',()=>{
  const x=makeManager();
  x.monster.targetId=x.player.id;
  let maxAbsZ=0,minCenter=Infinity;

  for(let i=0;i<120&&x.attacks===0;i++){
    x.advance();
    maxAbsZ=Math.max(maxAbsZ,Math.abs(x.monster.z));
    minCenter=Math.min(minCenter,Math.hypot(x.monster.x,x.monster.z));
  }

  assert.ok(maxAbsZ>1.5,'deve sair da linha reta para contornar o obstáculo');
  assert.ok(minCenter>1.75,'não deve atravessar o poço');
  assert.ok(x.attacks>0,'deve alcançar o jogador e atacar');
});

test('monstro não ataca através de obstáculo estrutural',()=>{
  let now=0,attacks=0;
  const player={id:1,x:1,z:0,a:0,dead:false,ws:{}};
  const players=new Map([[1,player]]);
  const nav={
    lineClear:()=>false,
    isWalkable:()=>true,
    findApproachPath:()=>({path:[{x:0,z:2},{x:1,z:1.5}],goal:{x:1,z:1.5},cost:3}),
    findPath:()=>[{x:0,z:2},{x:1,z:1.5}]
  };
  const manager=new MonsterManager({
    types:{test:{name:'Teste',aggressive:false,levels:[1,1],count:1,radius:0.3,speed:1,material:'x',expMultiplier:1}},
    zones:{test:{x:0,z:0,radius:100}},
    spawnManager:{point:()=>({x:-0.7,z:0})},
    players,send:()=>{},navigation:nav,now:()=>now,rng:()=>0
  });
  manager.setCombatManager({monsterAttack(){attacks++;}});
  manager.initialize();
  const m=[...manager.monsters.values()][0];
  m.targetId=1;

  now+=100;
  manager.tick(0.1);
  assert.equal(attacks,0);
  assert.equal(m.state,'chase');
  assert.ok(m.navPath.length>0);
});

test('monstro retorna ao spawn usando A* quando a linha direta está bloqueada',()=>{
  const x=makeManager({playerX:100,playerZ:100,aggressive:false});
  x.monster.x=5;
  x.monster.z=0;
  let maxAbsZ=0;

  for(let i=0;i<120;i++){
    x.advance();
    maxAbsZ=Math.max(maxAbsZ,Math.abs(x.monster.z));
    if(Math.hypot(x.monster.x-x.monster.spawnX,x.monster.z-x.monster.spawnZ)<2)break;
  }

  assert.ok(maxAbsZ>1.5,'retorno também deve contornar o obstáculo');
  assert.ok(Math.hypot(x.monster.x-x.monster.spawnX,x.monster.z-x.monster.spawnZ)<2);
});

test('orçamento limita novas rotas A* por tick',()=>{
  let now=1000,plans=0;
  const players=new Map([[1,{id:1,x:10,z:0,a:0,dead:false,ws:{}}]]);
  const nav={
    lineClear:()=>false,
    isWalkable:()=>true,
    findApproachPath:()=>{plans++;return{path:[{x:0,z:2},{x:9,z:1}],goal:{x:9,z:1},cost:10};},
    findPath:()=>{plans++;return[{x:0,z:2},{x:9,z:1}];}
  };
  const manager=new MonsterManager({
    types:{test:{name:'Teste',aggressive:false,levels:[1,1],count:20,radius:0.8,speed:2,material:'x',expMultiplier:1}},
    zones:{test:{x:0,z:0,radius:100}},
    spawnManager:{point:()=>({x:-10,z:0})},
    players,send:()=>{},navigation:nav,now:()=>now,rng:()=>0
  });
  manager.setCombatManager({monsterAttack(){}});
  manager.initialize();
  for(const m of manager.monsters.values())m.targetId=1;

  manager.tick(0.1);
  assert.equal(plans,8);

  now+=100;
  manager.tick(0.1);
  assert.equal(plans,16);
});

test('crowd control server-side impede movimento e ataque enquanto ativo',()=>{
  const x=makeManager({playerX:5,playerZ:0,startX:0,startZ:0,aggressive:false});
  x.monster.targetId=x.player.id;
  const before={x:x.monster.x,z:x.monster.z};
  x.monster.rootUntil=5000;
  x.advance(100);
  assert.equal(x.monster.x,before.x);
  assert.equal(x.monster.z,before.z);
  assert.equal(x.attacks,0);

  x.monster.rootUntil=0;
  x.monster.stunUntil=5000;
  x.advance(100);
  assert.equal(x.monster.state,'stunned');
  assert.equal(x.attacks,0);
});
