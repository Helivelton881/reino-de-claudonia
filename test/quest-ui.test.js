'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');

test('diario de missoes e atalho J existem na interface',()=>{
  assert.match(html,/id="bQuest"/);
  assert.match(html,/id="winQuest"/);
  assert.match(html,/function renderQuestJournal\(/);
  assert.match(html,/k==='j'/);
  assert.match(html,/data-qtab="active"/);
  assert.match(html,/data-qabandon/);
});

test('marcadores de quest usam estados disponivel ativo e pronto',()=>{
  assert.match(html,/function questMarkerState\(/);
  assert.match(html,/markAvailable/);
  assert.match(html,/markActive/);
  assert.match(html,/markReady/);
  assert.match(html,/state==='ready'/);
  assert.match(html,/state==='active'/);
  assert.match(html,/state==='available'/);
});

test('cliente envia intencoes genericas de quest sem alterar ch.quest localmente',()=>{
  assert.doesNotMatch(html,/ch\.quest\s*=\s*\{\s*cls\s*:/);
  assert.match(html,/data-qact="accept"/);
  assert.match(html,/data-qact="abandon"/);
  assert.match(html,/sendWs\(\{t:'quest',action:qa\.dataset\.qact,questId:qa\.dataset\.qid\}\)/);
});
test('fase 7.3 usa multiplas quests, npcTalk autoritativo e recompensa sincronizada',()=>{
  assert.match(html,/const questsForNpc/);
  assert.match(html,/sendWs\(\{t:'npcTalk',npcId:n\.id\}\)/);
  assert.match(html,/function questProtectedItems\(/);
  assert.match(html,/m\.t==='questReward'/);
  assert.match(html,/data-qact="turnIn"/);
});
