'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const QuestManager=require('../server/quests/quest-manager');
const NPCS=require('../server/data/npcs');
const { ZONES }=require('../server/data/monsters');

function makePlayer(overrides={}){
  const sent=[];
  const player={
    ws:{readyState:1},L:15,x:0,z:5,dirty:false,
    dados:{
      L:15,cls:'aprendiz',quest:null,quests:{active:{},completed:[]},
      inv:[],eq:{arma:'espada_treino'},equp:{arma:0},
      str:15,sta:15,dex:15,int:15,pts:28,gold:0,exp:0
    },
    ...overrides
  };
  if(overrides.dados) player.dados={...player.dados,...overrides.dados};
  return {player,sent};
}
function manager(sent,now=()=>1000){
  return new QuestManager({send:(_ws,msg)=>sent.push(msg),now});
}
function unlockClass(player){player.dados.quests.completed.push('jornada_12_presas');}

test('catalogo possui 12 quests de historia, quatro provas e seis NPCs',()=>{
  const sent=[],qm=manager(sent),catalog=qm.publicCatalog();
  assert.equal(catalog.length,16);
  assert.equal(catalog.filter(q=>q.category==='story').length,12);
  assert.equal(catalog.filter(q=>q.category==='class-trial').length,4);
  const types=new Set(catalog.flatMap(q=>q.objectives.map(o=>o.type)));
  for(const type of ['talk','kill','explore','delivery','collect']) assert.ok(types.has(type));
  assert.ok(catalog.filter(q=>q.category==='class-trial').every(q=>q.exclusiveGroup==='class-trial'));
  assert.equal(NPCS.length,6);
  assert.ok(NPCS.some(n=>n.service==='forge'));
  assert.ok(NPCS.some(n=>n.service==='flight-shop'));
});

test('cadeia inicial exige conclusao da quest anterior',()=>{
  const {player,sent}=makePlayer({L:1,dados:{L:1}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_02_bolotas'),false);
  assert.match(sent.at(-1).msg,/pré-requisito/i);
  assert.equal(qm.accept(player,'jornada_01_apresentacao'),true);
});

test('talk so progride perto do NPC correto',()=>{
  const {player,sent}=makePlayer({L:1,dados:{L:1}}),qm=manager(sent);
  qm.accept(player,'jornada_01_apresentacao');
  player.x=100;player.z=100;
  assert.equal(qm.talk(player,'voo'),false);
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,0);
  const tito=NPCS.find(n=>n.id==='voo');player.x=tito.x;player.z=tito.z;
  assert.equal(qm.talk(player,'voo'),true);
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,1);
});

test('kill conta apenas o monstro configurado',()=>{
  const {player,sent}=makePlayer({L:1,dados:{L:1,quests:{active:{},completed:['jornada_01_apresentacao']}}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_02_bolotas'),true);
  qm.recordEvent(player,'kill',{monsterKey:'coelhorn',count:3});
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,0);
  for(let i=0;i<5;i++)qm.recordEvent(player,'kill',{monsterKey:'bolota',count:1});
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,5);
  assert.equal(qm.ready(player,'jornada_02_bolotas'),true);
});

test('explore progride apenas dentro da zona configurada',()=>{
  const {player,sent}=makePlayer({L:4,dados:{L:4,quests:{active:{},completed:['jornada_03_gosma']}}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_04_rota_coelhorn'),true);
  assert.equal(qm.recordPosition(player,0,0),false);
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,0);
  const z=ZONES.coelhorn;
  assert.equal(qm.recordPosition(player,z.x,z.z),true);
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,1);
});

test('delivery usa inventario real, reserva e consome itens no turnIn',()=>{
  const {player,sent}=makePlayer({L:2,dados:{L:2,quests:{active:{},completed:['jornada_02_bolotas']},inv:[{id:'gosma',n:4}]}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_03_gosma'),true);
  assert.equal(qm.ready(player,'jornada_03_gosma'),true);
  assert.ok(qm.reservedItemIds(player).has('gosma'));
  let reward=null;
  assert.equal(qm.turnIn(player,'jornada_03_gosma',{grantReward:(_p,r)=>{reward=r;return true;}}),true);
  assert.equal(qm.itemCount(player,'gosma'),0);
  const completedMsg=sent.findLast(m=>m.event==='completed'&&m.questId==='jornada_03_gosma');
  assert.deepEqual(completedMsg.inventory,[]);
  assert.equal(reward.exp,150);
  assert.equal(reward.gold,40);
  assert.ok(player.dados.quests.completed.includes('jornada_03_gosma'));
});

test('prova de classe exige nivel 15 e jornada inicial concluida',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);
  assert.equal(qm.accept(player,'prova_guerreiro'),false);
  assert.match(sent.at(-1).msg,/pré-requisito/i);
  unlockClass(player);
  assert.equal(qm.accept(player,'prova_guerreiro'),true);
  assert.equal(player.dados.quest.cls,'guerreiro');
});

test('duas provas de classe simultaneas continuam bloqueadas',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);unlockClass(player);
  assert.equal(qm.accept(player,'prova_guerreiro'),true);
  assert.equal(qm.accept(player,'prova_mago'),false);
  assert.equal(qm.snapshot(player).active.length,1);
});

test('collect de prova reflete inventario real e ignora progresso injetado',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);unlockClass(player);
  qm.accept(player,'prova_guerreiro');
  player.dados.quests.active.prova_guerreiro.progress[0]=999;
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,0);
  player.dados.inv.push({id:'presa',n:5});
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,5);
  player.dados.inv[0].n=6;
  assert.equal(qm.ready(player,'prova_guerreiro'),true);
});

test('conclusao de classe acontece uma unica vez',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);unlockClass(player);
  qm.accept(player,'prova_guerreiro');player.dados.inv=[{id:'presa',n:6}];
  let calls=0;
  const handlers={changeClass:(_p,cls)=>{calls++;assert.equal(cls,'guerreiro');return true;}};
  assert.equal(qm.turnIn(player,'prova_guerreiro',handlers),true);
  assert.equal(calls,1);
  assert.equal(qm.turnIn(player,'prova_guerreiro',handlers),false);
  assert.equal(calls,1);
});

test('abandonar limpa espelho legado e permite outra prova',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);unlockClass(player);
  qm.accept(player,'prova_druida');
  assert.equal(player.dados.quest.cls,'druida');
  assert.equal(qm.abandon(player,'prova_druida'),true);
  assert.equal(player.dados.quest,null);
  assert.equal(qm.accept(player,'prova_mago'),true);
});

test('prova legada ativa migra e pode continuar sem refazer a jornada',()=>{
  const {player,sent}=makePlayer({dados:{quest:{cls:'arqueiro'},quests:null,inv:[{id:'pelo',n:10}]}}),qm=manager(sent);
  const state=qm.initializePlayer(player);
  assert.ok(state.active.prova_arqueiro);
  assert.equal(player.dados.quest.id,'prova_arqueiro');
  assert.equal(qm.ready(player,'prova_arqueiro'),true);
  assert.equal(player.dirty,true);
});
