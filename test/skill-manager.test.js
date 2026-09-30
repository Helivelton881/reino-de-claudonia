'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SkillManager=require('../server/skills/skill-manager');

function make(overrides={}){
  const sent=[];
  const player={ws:{},L:15,x:7.5,z:4.7,dirty:false,dados:{L:15,cls:'guerreiro',gold:0,skillTree:{version:1,ranks:{},specialization:null,respecs:0}},...overrides};
  if(overrides.dados)player.dados={L:15,cls:'guerreiro',gold:0,skillTree:{version:1,ranks:{},specialization:null,respecs:0},...overrides.dados};
  return {player,sent,mgr:new SkillManager({send:(_ws,msg)=>sent.push(msg)})};
}

test('pontos de skill são separados e rank inicial da raiz é automático',()=>{
  const {player,mgr}=make();
  const s=mgr.snapshot(player);
  assert.equal(s.total,7);
  assert.equal(s.spent,0);
  assert.equal(s.available,7);
  assert.equal(s.ranks.investida,1);
  assert.equal(s.ranks.grito,undefined);
});

test('árvore exige pré-requisito e consome pontos no servidor',()=>{
  const {player,mgr,sent}=make({L:17,dados:{L:17}});
  assert.equal(mgr.learn(player,'grito'),false);
  assert.match(sent.at(-1).msg,/Pré-requisitos/i);
  assert.equal(mgr.learn(player,'investida'),true);
  assert.equal(mgr.rank(player,'investida'),2);
  assert.equal(mgr.learn(player,'grito'),true);
  assert.equal(mgr.rank(player,'grito'),1);
  const s=mgr.snapshot(player);
  assert.equal(s.spent,2);
  assert.equal(s.available,6);
});

test('ranks alteram definição resolvida sem confiar no cliente',()=>{
  const {player,mgr}=make({L:30,dados:{L:30,skillTree:{version:1,ranks:{investida:4},specialization:null,respecs:0}}});
  const sk=mgr.resolved(player,'investida');
  assert.equal(sk.rank,4);
  assert.equal(sk.multiplier,2.46);
  assert.equal(sk.fp,8);
  assert.equal(sk.cooldown,5);
});

test('respec só funciona próximo do mestre da própria classe',()=>{
  const {player,mgr,sent}=make({L:30,dados:{L:30,skillTree:{version:1,ranks:{investida:3},specialization:null,respecs:0}}});
  player.x=100;player.z=100;
  assert.equal(mgr.respec(player,'guerreiro'),false);
  assert.match(sent.at(-1).msg,/mestre da sua classe/i);
  player.x=7.5;player.z=4.7;
  assert.equal(mgr.respec(player,'guerreiro'),true);
  assert.deepEqual(player.dados.skillTree.ranks,{});
  assert.equal(player.dados.skillTree.respecs,1);
  assert.equal(mgr.rank(player,'investida'),1);
});

test('migração preserva rank 1 das skills antigas já liberadas',()=>{
  const sent=[],player={ws:{},L:20,x:0,z:0,dirty:false,dados:{L:20,cls:'mago'}},mgr=new SkillManager({send:(_ws,msg)=>sent.push(msg)});
  mgr.initializePlayer(player);
  assert.equal(mgr.rank(player,'bola_fogo'),1);
  assert.equal(mgr.rank(player,'lanca_gelo'),1);
  assert.equal(mgr.rank(player,'tempestade'),1);
  assert.equal(player.dados.skillTree.version,1);
});
test('estado persistido adulterado é limitado por classe, nível e orçamento de pontos',()=>{
  const sent=[],player={ws:{},L:10,x:0,z:0,dirty:false,dados:{L:10,cls:'aprendiz',skillTree:{version:1,ranks:{golpe_forte:99,corte_duplo:99,bola_fogo:5},specialization:null,respecs:0}}},mgr=new SkillManager({send:(_ws,msg)=>sent.push(msg)});
  const s=mgr.snapshot(player);
  assert.equal(s.total,5);
  assert.equal(s.spent,5);
  assert.equal(s.ranks.golpe_forte,5);
  assert.equal(s.ranks.corte_duplo,1);
  assert.equal(s.ranks.bola_fogo,undefined);
  assert.equal(s.available,0);
});
