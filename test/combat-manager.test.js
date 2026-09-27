'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const CombatManager=require('../server/combat/combat-manager');

function setup(nowValue=10000){
  const sent=[],players=new Map(),deaths=[];let awards=0;
  const p={id:1,ws:{},x:0,z:0,a:0,shop:null,dados:{L:10,cls:'aprendiz',str:25,sta:15,dex:15,int:15,eq:{arma:'espada_ferro'},inv:[]},dirty:false};players.set(1,p);
  const monster={id:7,x:1,z:0,level:10,radius:1,defense:0,attack:10,hp:20,maxHp:20,dead:false,state:'idle'};
  const monsters={get:id=>Number(id)===7?monster:null,near:()=>[monster],emit:(m,msg)=>sent.push(msg)};
  const combat=new CombatManager({players,send:(ws,msg)=>sent.push(msg),now:()=>nowValue,rng:()=>0,awardExperience:()=>awards++,onMonsterDeath:(m,k)=>deaths.push([m,k])});
  combat.setMonsterManager(monsters);combat.initializePlayer(p);return{combat,p,monster,sent,deaths,get awards(){return awards}};
}

test('rejeita alvo distante e spam de ataque',()=>{
  const x=setup();x.monster.x=50;assert.equal(x.combat.attack(x.p,{monsterId:7}),false);
  x.monster.x=1;assert.equal(x.combat.attack(x.p,{monsterId:7}),true);assert.equal(x.combat.attack(x.p,{monsterId:7}),false);
});

test('morte e recompensa acontecem uma única vez',()=>{
  const x=setup();x.monster.hp=1;assert.equal(x.combat.attack(x.p,{monsterId:7}),true);assert.equal(x.monster.dead,true);assert.equal(x.awards,1);assert.equal(x.deaths.length,1);
  assert.equal(x.combat.attack(x.p,{monsterId:7}),false);assert.equal(x.awards,1);assert.equal(x.deaths.length,1);
});

test('rejeita habilidade inexistente e recurso insuficiente',()=>{const x=setup();assert.equal(x.combat.skill(x.p,{skillId:'admin_kill',monsterId:7}),false);x.p.fp=0;assert.equal(x.combat.skill(x.p,{skillId:'golpe_forte',monsterId:7}),false);assert.equal(x.monster.hp,20);});

test('personagem novo (vida ainda não salva) entra com a vida cheia, não morto',()=>{
  const players=new Map(),p={id:2,ws:{},x:0,z:0,dados:{L:1,cls:'aprendiz',str:15,sta:15,dex:15,int:15,hp:null,mp:null,fp:null,eq:{arma:'espada_treino'},inv:[]}};
  const combat=new CombatManager({players,send:()=>{},now:()=>0,rng:()=>0,awardExperience:()=>{},onMonsterDeath:()=>{}});
  combat.initializePlayer(p);
  assert.ok(p.hp>0);assert.equal(p.hp,p.stats.maxHp);assert.equal(p.mp,p.stats.maxMp);assert.equal(p.fp,p.stats.maxFp);assert.equal(p.dead,false);
});

test('quem saiu morto volta com a vida cheia',()=>{
  const p={id:3,ws:{},x:0,z:0,dados:{L:5,cls:'aprendiz',str:15,sta:15,dex:15,int:15,hp:0,mp:3,fp:4,eq:{arma:'espada_treino'},inv:[]}};
  const combat=new CombatManager({players:new Map(),send:()=>{},now:()=>0,rng:()=>0,awardExperience:()=>{},onMonsterDeath:()=>{}});
  combat.initializePlayer(p);assert.equal(p.hp,p.stats.maxHp);assert.equal(p.dead,false);assert.equal(p.mp,3);
});
