'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const QuestManager=require('../server/quests/quest-manager');
const NPCS=require('../server/data/npcs');

function makePlayer(overrides={}){
  const sent=[];
  const player={
    ws:{readyState:1},
    L:15,
    dirty:false,
    dados:{
      L:15,cls:'aprendiz',quest:null,quests:{active:{},completed:[]},
      inv:[],eq:{arma:'espada_treino'},equp:{arma:0},
      str:15,sta:15,dex:15,int:15,pts:28
    },
    ...overrides
  };
  if(overrides.dados) player.dados={...player.dados,...overrides.dados};
  return {player,sent};
}
function manager(sent,now=()=>1000){
  return new QuestManager({send:(_ws,msg)=>sent.push(msg),now});
}

test('catalogo inicial possui quatro provas e seis NPCs funcionais',()=>{
  const sent=[],qm=manager(sent);
  const catalog=qm.publicCatalog();
  assert.equal(catalog.length,4);
  assert.equal(NPCS.length,6);
  assert.equal(catalog.filter(q=>q.category==='class-trial').length,4);
  assert.ok(NPCS.some(n=>n.service==='forge'));
  assert.ok(NPCS.some(n=>n.service==='flight-shop'));
});

test('nivel abaixo do requisito nao aceita prova de classe',()=>{
  const {player,sent}=makePlayer({L:14,dados:{L:14}});
  const qm=manager(sent);
  assert.equal(qm.accept(player,'prova_guerreiro'),false);
  assert.equal(qm.snapshot(player).active.length,0);
  assert.match(sent.at(-1).msg,/nível 15/i);
});

test('aceita uma prova e impede duas provas de classe simultaneas',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);
  assert.equal(qm.accept(player,'prova_guerreiro'),true);
  assert.equal(player.dados.quest.cls,'guerreiro');
  assert.equal(qm.accept(player,'prova_mago'),false);
  assert.equal(qm.snapshot(player).active.length,1);
});

test('progresso collect reflete inventario real e nao dado enviado pelo cliente',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);
  qm.accept(player,'prova_guerreiro');
  player.dados.quests.active.prova_guerreiro.progress[0]=999;
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,0);
  player.dados.inv.push({id:'presa',n:5});
  assert.equal(qm.snapshot(player).active[0].objectives[0].current,5);
  player.dados.inv[0].n=6;
  assert.equal(qm.ready(player,'prova_guerreiro'),true);
});

test('nao conclui sem objetivo e conclui uma unica vez com reward validado',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);
  qm.accept(player,'prova_guerreiro');
  let calls=0;
  const handlers={changeClass:(_p,cls)=>{calls++;assert.equal(cls,'guerreiro');return true;}};
  assert.equal(qm.turnIn(player,'prova_guerreiro',handlers),false);
  assert.equal(calls,0);
  player.dados.inv=[{id:'presa',n:6}];
  assert.equal(qm.turnIn(player,'prova_guerreiro',handlers),true);
  assert.equal(calls,1);
  assert.deepEqual(qm.snapshot(player).completed,['prova_guerreiro']);
  assert.equal(player.dados.quest,null);
  assert.equal(qm.turnIn(player,'prova_guerreiro',handlers),false);
  assert.equal(calls,1);
});

test('abandonar limpa espelho legado e permite outra prova',()=>{
  const {player,sent}=makePlayer(),qm=manager(sent);
  qm.accept(player,'prova_druida');
  assert.equal(player.dados.quest.cls,'druida');
  assert.equal(qm.abandon(player,'prova_druida'),true);
  assert.equal(player.dados.quest,null);
  assert.equal(qm.accept(player,'prova_mago'),true);
});

test('migra personagem antigo que estava no meio de uma prova',()=>{
  const {player,sent}=makePlayer({dados:{quest:{cls:'arqueiro'},quests:null}});
  const qm=manager(sent);
  const state=qm.initializePlayer(player);
  assert.ok(state.active.prova_arqueiro);
  assert.equal(player.dados.quest.id,'prova_arqueiro');
  assert.equal(player.dirty,true);
});
