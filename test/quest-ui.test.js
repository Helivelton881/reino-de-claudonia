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
  assert.match(html,/data-qtab="daily"/);
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
test('fase 7.4 possui rastreador HUD, alvo no minimapa e beacon 3D',()=>{
  assert.match(html,/id="questTrack"/);
  assert.match(html,/id="qtLocate"/);
  assert.match(html,/function questTargetFor\(/);
  assert.match(html,/function renderQuestTracker\(/);
  assert.match(html,/function navigateTrackedQuest\(/);
  assert.match(html,/const questBeacon=new THREE\.Group\(\)/);
  assert.match(html,/updateQuestBeacon\(t\)/);
  assert.match(html,/const qt=questTargetFor\(trackedQuestState\(\)\)/);
  assert.match(html,/data-qtrack=/);
});

test('rastreador conhece a origem dos materiais ate o Planalto do Musgo',()=>{
  assert.match(html,/musgo:'golem'/);
  assert.match(html,/def\.type==='delivery'\|\|def\.type==='collect'/);
  assert.match(html,/def\.type==='kill'/);
  assert.match(html,/def\.type==='explore'/);
  assert.match(html,/def\.type==='talk'/);
});

test('fase 7.9 mostra side quests e diarias com cooldown na interface',()=>{
  assert.match(html,/function questCategoryLabel\(/);
  assert.match(html,/function questWaitLabel\(/);
  assert.match(html,/questRepeatableReady/);
  assert.match(html,/questRepeatableWait/);
  assert.match(html,/category==='daily'/);
  assert.match(html,/Missão secundária/);
  assert.match(html,/Missão diária/);
});
