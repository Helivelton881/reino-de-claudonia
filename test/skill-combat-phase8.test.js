'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const CombatManager=require('../server/combat/combat-manager');
const SkillManager=require('../server/skills/skill-manager');

function state(ranks={},specialization=null){return {version:2,ranks,legacyUnlocks:[],specialization,respecs:0};}
function player(id,cls,L,ranks={},specialization=null){return {id,ws:{},x:0,z:0,a:0,shop:null,L,dirty:false,dados:{L,cls,str:30,sta:25,dex:25,int:35,eq:{arma:null},inv:[],skillTree:state(ranks,specialization)}};}
function setup(p,nowRef={v:10000},extraPlayers=[]){
  const sent=[],players=new Map([[p.id,p],...extraPlayers.map(x=>[x.id,x])]),deaths=[];
  const monster={id:7,key:'bolota',x:2,z:0,level:20,radius:1,defense:12,attack:20,hp:500,maxHp:500,dead:false,state:'idle',effects:{},slowUntil:0,rootUntil:0,stunUntil:0,tauntUntil:0};
  const monsterMap=new Map([[7,monster]]);
  const monsters={monsters:monsterMap,get:id=>monsterMap.get(Number(id)),near:(x,z,r)=>[...monsterMap.values()].filter(m=>Math.hypot(m.x-x,m.z-z)<=r),emit:(m,msg)=>sent.push(msg)};
  const sm=new SkillManager({send:(_ws,msg)=>sent.push(msg),now:()=>nowRef.v});
  const combat=new CombatManager({players,send:(_ws,msg)=>sent.push(msg),now:()=>nowRef.v,rng:()=>0,awardExperience:()=>{},onMonsterDeath:(m,k)=>deaths.push([m,k])});
  combat.setMonsterManager(monsters);combat.setSkillManager(sm);
  for(const pl of players.values()){combat.initializePlayer(pl);sm.initializePlayer(pl);combat.refresh(pl);pl.hp=pl.stats.maxHp;pl.mp=pl.stats.maxMp;pl.fp=pl.stats.maxFp;}
  return {combat,sm,monster,sent,players,nowRef,deaths};
}

test('debuff é aplicado no servidor e cooldown impede spam',()=>{
  const p=player(1,'guerreiro',40,{investida:3,grito:2,redemoinho:2,quebra_guarda:1});const x=setup(p);
  assert.equal(x.combat.skill(p,{skillId:'quebra_guarda',monsterId:7}),true);
  assert.ok(x.monster.effects.quebra_guarda);assert.ok(x.monster.effects.quebra_guarda.armorDown>0);
  assert.equal(x.combat.skill(p,{skillId:'quebra_guarda',monsterId:7}),false);assert.match(x.sent.at(-1).msg,/recarga/i);
});

test('crowd control atordoa e monster manager pode consultar stunUntil',()=>{
  const p=player(1,'mago',40,{bola_fogo:3,lanca_gelo:2,tempestade:2,foco_arcano:2,prisao_arcana:1});const x=setup(p);
  assert.equal(x.combat.skill(p,{skillId:'prisao_arcana',monsterId:7}),true);assert.ok(x.monster.stunUntil>x.nowRef.v);
  assert.equal(x.combat.monsterAttack(x.monster,p),false);
});

test('DoT causa dano em ticks server-side e é marcado na mensagem de combate',()=>{
  const p=player(1,'mago',40,{bola_fogo:3,lanca_gelo:2,tempestade:2,combustao:1});const now={v:10000},x=setup(p,now);
  const hp=x.monster.hp;assert.equal(x.combat.skill(p,{skillId:'combustao',monsterId:7}),true);assert.equal(x.monster.hp,hp);
  now.v+=2100;x.combat.tick(.1);assert.ok(x.monster.hp<hp);assert.ok(x.sent.some(m=>m.t==='combatHit'&&m.dot===true));
});

test('party heal cura aliados próximos e não aliados distantes',()=>{
  const p=player(1,'druida',40,{cura:3,devocao:2,onda_vida:1}),ally=player(2,'guerreiro',40,{}),far=player(3,'guerreiro',40,{});ally.x=5;far.x=40;
  const party={members:new Set([1,2,3]),leader:1,skills:{}};p.party=party;ally.party=party;far.party=party;
  const x=setup(p,{v:10000},[ally,far]);ally.hp=10;far.hp=10;p.hp=20;
  assert.equal(x.combat.skill(p,{skillId:'onda_vida'}),true);assert.ok(ally.hp>10);assert.equal(far.hp,10);assert.ok(p.hp>20);
});

test('range e alvo são validados pelo servidor para skills de controle',()=>{
  const p=player(1,'druida',40,{cura:3,bencao:2,punho:2,raizes:1});const x=setup(p);
  x.monster.x=30;assert.equal(x.combat.skill(p,{skillId:'raizes',monsterId:7}),false);assert.match(x.sent.at(-1).msg,/distante/i);
  x.monster.x=10;assert.equal(x.combat.skill(p,{skillId:'raizes',monsterId:7}),true);assert.ok(x.monster.rootUntil>x.nowRef.v);
});

test('skill de outra especialização não pode ser forçada pelo cliente',()=>{
  const p=player(1,'guerreiro',60,{investida:5,grito:4,quebra_guarda:3,laminas_gemeas:5},'guardiao');const x=setup(p);
  assert.equal(x.combat.skill(p,{skillId:'laminas_gemeas',monsterId:7}),false);assert.match(x.sent.at(-1).msg,/inválida|aprendida/i);
});
test('party buff de Guardião aplica defesa aos aliados próximos e passiva altera stats',()=>{
  const p=player(1,'guerreiro',60,{investida:4,couraca:4,fortaleza:1,bastiao:2},'guardiao');
  const ally=player(2,'guerreiro',60,{});ally.x=4;
  const party={members:new Set([1,2]),leader:1,skills:{}};p.party=party;ally.party=party;
  const x=setup(p,{v:10000},[ally]);
  const baseAllyDef=x.combat.refresh(ally).defense;
  const guardStats=x.combat.refresh(p);
  assert.ok(guardStats.maxHp>ally.stats.maxHp);
  assert.equal(x.combat.skill(p,{skillId:'fortaleza'}),true);
  assert.ok(x.combat.bonus(ally,'def')>0);
  assert.ok(x.combat.refresh(ally).defense>=baseAllyDef);
  assert.ok(x.sent.some(m=>m.t==='skillEffect'&&m.kind==='party-buff'));
});
