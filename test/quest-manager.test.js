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

test('catalogo possui 39 quests de historia, quatro provas e nove NPCs',()=>{
  const sent=[],qm=manager(sent),catalog=qm.publicCatalog();
  assert.equal(catalog.length,43);
  assert.equal(catalog.filter(q=>q.category==='story').length,39);
  assert.equal(catalog.filter(q=>q.category==='class-trial').length,4);
  const types=new Set(catalog.flatMap(q=>q.objectives.map(o=>o.type)));
  for(const type of ['talk','kill','explore','delivery','collect']) assert.ok(types.has(type));
  assert.ok(catalog.filter(q=>q.category==='class-trial').every(q=>q.exclusiveGroup==='class-trial'));
  assert.equal(NPCS.length,9);
  assert.ok(NPCS.some(n=>n.service==='forge'));
  assert.ok(NPCS.some(n=>n.service==='flight-shop'));
  assert.ok(NPCS.some(n=>n.id==='vigia_lobos'&&n.service==='quest-giver'));
  assert.ok(NPCS.some(n=>n.id==='batedora_teias'&&n.service==='quest-giver'));
  assert.ok(NPCS.some(n=>n.id==='guardia_lago'&&n.service==='quest-giver'));
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
test('cadeia 15-20 libera para qualquer classe concluida e bloqueia aprendiz',()=>{
  const sent1=[],a=makePlayer({L:15,dados:{L:15,cls:'guerreiro',quests:{active:{},completed:['prova_guerreiro']}}}),qm1=manager(sent1);
  assert.equal(qm1.accept(a.player,'jornada_13_novo_caminho'),true);

  const sent2=[],b=makePlayer({L:15,dados:{L:15,cls:'aprendiz',quests:{active:{},completed:['prova_guerreiro']}}}),qm2=manager(sent2);
  assert.equal(qm2.accept(b.player,'jornada_13_novo_caminho'),false);

  const sent3=[],c=makePlayer({L:15,dados:{L:15,cls:'mago',quests:{active:{},completed:['prova_mago']}}}),qm3=manager(sent3);
  assert.equal(qm3.accept(c.player,'jornada_13_novo_caminho'),true);
});

test('cadeia pos-classe respeita ordem e termina com missao de voo',()=>{
  const {player,sent}=makePlayer({L:20,dados:{L:20,cls:'arqueiro',quests:{active:{},completed:['prova_arqueiro','jornada_13_novo_caminho','jornada_14_planalto','jornada_15_golems','jornada_16_musgo','jornada_17_guardioes']}}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_18_licenca_voo'),true);
  const q=qm.publicCatalog().find(x=>x.id==='jornada_18_licenca_voo');
  assert.equal(q.reward.gold,500);
  assert.equal(q.objectives[0].type,'talk');
  assert.equal(q.objectives[0].npcId,'ferreiro');
});
test('cadeia 20-28 usa a Trilha dos Lobos e o vigia regional',()=>{
  const {player,sent}=makePlayer({L:28,dados:{L:28,cls:'guerreiro',quests:{active:{},completed:['prova_guerreiro','jornada_18_licenca_voo']}}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_19_posto_lobos'),true);
  const catalog=qm.publicCatalog();
  const ids=['jornada_19_posto_lobos','jornada_20_primeiro_uivo','jornada_21_peles_trilha','jornada_22_centro_alcateia','jornada_23_alcateia_cinzenta','jornada_24_reserva_peles','jornada_25_guardiao_trilha'];
  assert.ok(ids.every(id=>catalog.some(q=>q.id===id)));
  assert.deepEqual(ids.map(id=>catalog.find(q=>q.id===id).requirements.level),[20,21,22,23,24,26,28]);
  assert.equal(catalog.find(q=>q.id==='jornada_20_primeiro_uivo').objectives[0].monsterKey,'lobo');
  assert.equal(catalog.find(q=>q.id==='jornada_21_peles_trilha').objectives[0].itemId,'pele_lobo');
  assert.equal(catalog.find(q=>q.id==='jornada_22_centro_alcateia').objectives[0].areaId,'lobo');
  const vigia=NPCS.find(n=>n.id==='vigia_lobos');
  assert.ok(vigia);
  assert.ok(Math.hypot(vigia.x-ZONES.lobo.x,vigia.z-ZONES.lobo.z)>ZONES.lobo.radius);
});

test('cadeia 29-37 usa a Mata das Teias e a batedora regional',()=>{
  const {player,sent}=makePlayer({L:37,dados:{L:37,cls:'mago',quests:{active:{},completed:['prova_mago','jornada_25_guardiao_trilha']}}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_26_mata_teias'),true);
  const catalog=qm.publicCatalog();
  const ids=['jornada_26_mata_teias','jornada_27_primeiras_teias','jornada_28_seda_resistente','jornada_29_coracao_mata','jornada_30_teias_cerradas','jornada_31_estoque_seda','jornada_32_passagem_segura'];
  assert.ok(ids.every(id=>catalog.some(q=>q.id===id)));
  assert.deepEqual(ids.map(id=>catalog.find(q=>q.id===id).requirements.level),[29,29,30,31,33,35,37]);
  assert.equal(catalog.find(q=>q.id==='jornada_27_primeiras_teias').objectives[0].monsterKey,'aranha');
  assert.equal(catalog.find(q=>q.id==='jornada_28_seda_resistente').objectives[0].itemId,'seda');
  assert.equal(catalog.find(q=>q.id==='jornada_29_coracao_mata').objectives[0].areaId,'aranha');
  const batedora=NPCS.find(n=>n.id==='batedora_teias');
  assert.ok(batedora);
  assert.ok(Math.hypot(batedora.x-ZONES.aranha.x,batedora.z-ZONES.aranha.z)>ZONES.aranha.radius);
});

test('cadeia 38-47 usa o Lago Espelhado e a guardiã regional',()=>{
  const {player,sent}=makePlayer({L:47,dados:{L:47,cls:'arqueiro',quests:{active:{},completed:['prova_arqueiro','jornada_32_passagem_segura']}}}),qm=manager(sent);
  assert.equal(qm.accept(player,'jornada_33_lago_espelhado'),true);
  const catalog=qm.publicCatalog();
  const ids=['jornada_33_lago_espelhado','jornada_34_vozes_superficie','jornada_35_essencia_reflexo','jornada_36_margens_espelhadas','jornada_37_lago_inquieto','jornada_38_reserva_essencias','jornada_39_silencio_profundo'];
  assert.ok(ids.every(id=>catalog.some(q=>q.id===id)));
  assert.deepEqual(ids.map(id=>catalog.find(q=>q.id===id).requirements.level),[38,38,40,41,43,45,47]);
  assert.equal(catalog.find(q=>q.id==='jornada_34_vozes_superficie').objectives[0].monsterKey,'espirito');
  assert.equal(catalog.find(q=>q.id==='jornada_35_essencia_reflexo').objectives[0].itemId,'essencia');
  assert.equal(catalog.find(q=>q.id==='jornada_36_margens_espelhadas').objectives[0].areaId,'espirito');
  const guardia=NPCS.find(n=>n.id==='guardia_lago');
  assert.ok(guardia);
  assert.ok(Math.hypot(guardia.x-ZONES.espirito.x,guardia.z-ZONES.espirito.z)>ZONES.espirito.radius);
});

test('personagem antigo já classado recebe prova concluida e libera pos-classe',()=>{
  const {player,sent}=makePlayer({L:16,dados:{L:16,cls:'druida',quest:null,quests:null}}),qm=manager(sent);
  const state=qm.initializePlayer(player);
  assert.ok(state.completed.includes('prova_druida'));
  assert.equal(state.active.prova_druida,undefined);
  assert.equal(player.dados.quest,null);
  assert.equal(qm.accept(player,'jornada_13_novo_caminho'),true);
});
