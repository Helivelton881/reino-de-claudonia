'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const EconomyManager=require('../server/economy/economy-manager');
const player=()=>({ws:{},dados:{gold:1000,inv:[{id:'pedra_aprimorar',n:5},{id:'runa_menor',n:2},{id:'espada_ferro',n:1}],eq:{arma:null},equp:{arma:0}}});
test('compra e aprimoramento são calculados no servidor',()=>{const sent=[],p=player(),e=new EconomyManager({send:(ws,m)=>sent.push(m),rng:()=>0});assert.equal(e.act(p,{action:'buy',itemId:'pocao_vida'}),true);assert.equal(p.dados.gold,980);assert.equal(e.act(p,{action:'enhance',kind:'inventory',ref:2}),true);assert.equal(p.dados.inv.find(x=>x.id==='espada_ferro').up,1);assert.equal(sent.at(-1).result,'success');});
test('rejeita compra inventada sem alterar ouro',()=>{const p=player(),e=new EconomyManager({send:()=>{}});assert.equal(e.act(p,{action:'buy',itemId:'espada_admin'}),false);assert.equal(p.dados.gold,1000);});
test('venda de materiais preserva itens reservados por quest ativa',()=>{
  const p=player(),sent=[],e=new EconomyManager({send:(ws,m)=>sent.push(m)});
  p.dados.inv.push({id:'gosma',n:6},{id:'pelo',n:4});
  p.dados.quests={active:{jornada_03_gosma:{startedAt:1,progress:{}}},completed:['jornada_02_bolotas']};
  assert.equal(e.act(p,{action:'sellMaterials'}),true);
  assert.equal(p.dados.inv.find(x=>x.id==='gosma').n,6);
  assert.equal(p.dados.inv.some(x=>x.id==='pelo'),false);
  assert.equal(p.dados.gold,1020);
});
