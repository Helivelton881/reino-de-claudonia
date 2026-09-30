'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SkillManager=require('../server/skills/skill-manager');

function make({L=15,cls='guerreiro',x=7.5,z=4.7,state=null}={}){
  const sent=[];
  const player={ws:{},L,x,z,dirty:false,dados:{L,cls,gold:0,skillTree:state||{version:2,ranks:{},legacyUnlocks:[],specialization:null,respecs:0}}};
  return {player,sent,mgr:new SkillManager({send:(_ws,msg)=>sent.push(msg)})};
}

test('fase 8 usa pontos de skill separados e raiz automática',()=>{
  const {player,mgr}=make();const s=mgr.snapshot(player);
  assert.equal(s.version,2);assert.equal(s.total,7);assert.equal(s.spent,0);assert.equal(s.available,7);
  assert.equal(s.ranks.investida,1);assert.equal(s.ranks.grito,undefined);
});

test('árvore exige pré-requisito, classe, nível e orçamento no servidor',()=>{
  const {player,mgr,sent}=make({L:17});
  assert.equal(mgr.learn(player,'grito'),false);assert.match(sent.at(-1).msg,/Pré-requisitos/i);
  assert.equal(mgr.learn(player,'investida'),true);assert.equal(mgr.rank(player,'investida'),2);
  assert.equal(mgr.learn(player,'grito'),true);assert.equal(mgr.rank(player,'grito'),1);
  assert.equal(mgr.learn(player,'bola_fogo'),false);assert.match(sent.at(-1).msg,/classe/i);
  assert.equal(mgr.snapshot(player).spent,2);
});

test('ranks alteram definição resolvida e range vem do catálogo do servidor',()=>{
  const {player,mgr}=make({L:30,state:{version:2,ranks:{investida:4},legacyUnlocks:[],specialization:null,respecs:0}});
  const sk=mgr.resolved(player,'investida');assert.equal(sk.rank,4);assert.equal(sk.multiplier,2.46);assert.equal(sk.range,3);assert.equal(sk.fp,8);
});

test('respec só funciona próximo do mestre e preserva especialização',()=>{
  const {player,mgr,sent}=make({L:60,state:{version:2,ranks:{investida:3},legacyUnlocks:[],specialization:'guardiao',respecs:0}});
  player.x=100;player.z=100;assert.equal(mgr.respec(player,'guerreiro'),false);assert.match(sent.at(-1).msg,/mestre/i);
  player.x=7.5;player.z=4.7;assert.equal(mgr.respec(player,'guerreiro'),true);
  assert.deepEqual(player.dados.skillTree.ranks,{});assert.equal(player.dados.skillTree.specialization,'guardiao');assert.equal(player.dados.skillTree.respecs,1);
});

test('migração pré-fase 8 preserva skills já liberadas e sobe estado para versão 2',()=>{
  const sent=[],player={ws:{},L:20,x:0,z:0,dirty:false,dados:{L:20,cls:'mago'}},mgr=new SkillManager({send:(_ws,msg)=>sent.push(msg)});
  mgr.initializePlayer(player);assert.equal(mgr.rank(player,'bola_fogo'),1);assert.equal(mgr.rank(player,'lanca_gelo'),1);assert.equal(mgr.rank(player,'tempestade'),1);assert.equal(player.dados.skillTree.version,2);
});

test('estado persistido adulterado é limitado por classe, nível e orçamento',()=>{
  const {player,mgr}=make({L:10,cls:'aprendiz',x:0,z:0,state:{version:2,ranks:{golpe_forte:99,corte_duplo:99,bola_fogo:5},legacyUnlocks:[],specialization:null,respecs:0}});
  const s=mgr.snapshot(player);assert.equal(s.total,5);assert.equal(s.spent,5);assert.equal(s.ranks.golpe_forte,5);assert.equal(s.ranks.corte_duplo,1);assert.equal(s.ranks.bola_fogo,undefined);assert.equal(s.available,0);
});

test('catálogo cobre passiva, buff, debuff, DoT, CC, suporte e oito especializações',()=>{
  const {mgr}=make(),catalog=mgr.publicCatalog(),types=new Set(catalog.map(s=>s.type)),classes=mgr.classCatalog();
  assert.equal(catalog.length,42);
  for(const type of ['passive','buff','debuff','dot','cc','party-heal','party-buff','taunt'])assert.ok(types.has(type),type);
  assert.ok(catalog.every(s=>Number.isFinite(s.range)&&Array.isArray(s.ranks)&&s.ranks.length===s.maxRank));
  assert.equal(classes.specializations.length,8);
  assert.deepEqual(classes.classes.find(c=>c.id==='guerreiro').specializations,['guardiao','duelista']);
});

test('especialização exige nível 60, mestre correto e escolha única',()=>{
  const low=make({L:59});assert.equal(low.mgr.chooseSpecialization(low.player,'guardiao','guerreiro'),false);assert.match(low.sent.at(-1).msg,/nível 60/i);
  const x=make({L:60});x.player.x=100;x.player.z=100;assert.equal(x.mgr.chooseSpecialization(x.player,'guardiao','guerreiro'),false);
  x.player.x=7.5;x.player.z=4.7;assert.equal(x.mgr.chooseSpecialization(x.player,'guardiao','guerreiro'),true);
  assert.equal(x.mgr.snapshot(x.player).specialization,'guardiao');assert.equal(x.mgr.chooseSpecialization(x.player,'duelista','guerreiro'),false);
});

test('duas builds da mesma classe terminam com papéis e bônus diferentes',()=>{
  const g=make({L:60,state:{version:2,ranks:{investida:4,couraca:4,bastiao:3},legacyUnlocks:[],specialization:'guardiao',respecs:0}});
  const d=make({L:60,state:{version:2,ranks:{investida:4,grito:4,quebra_guarda:3,adrenalina:3},legacyUnlocks:[],specialization:'duelista',respecs:0}});
  const gb=g.mgr.statBonuses(g.player),db=d.mgr.statBonuses(d.player);
  assert.ok(gb.hp>db.hp);assert.ok(db.attackSpeed>gb.attackSpeed);assert.equal(g.mgr.snapshot(g.player).role,'Tank');assert.equal(d.mgr.snapshot(d.player).role,'Melee DPS');
  assert.equal(g.mgr.resolved(g.player,'laminas_gemeas'),null);assert.equal(d.mgr.resolved(d.player,'fortaleza'),null);
});
test('learnMax investe apenas pontos permitidos e nunca passa do rank máximo',()=>{
  const {player,mgr}=make({L:30,state:{version:2,ranks:{investida:2},legacyUnlocks:[],specialization:null,respecs:0}});
  const before=mgr.snapshot(player);
  assert.ok(before.available>0);
  assert.equal(mgr.learnMax(player,'investida'),true);
  const after=mgr.snapshot(player);
  assert.equal(after.ranks.investida,5);
  assert.equal(after.spent,before.spent+3);
  assert.ok(after.available>=0);
  assert.equal(mgr.learnMax(player,'investida'),false);
});
