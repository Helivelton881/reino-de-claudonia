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

test('cliente nao inicia mais prova alterando ch.quest localmente',()=>{
  assert.doesNotMatch(html,/ch\.quest\s*=\s*\{\s*cls\s*:/);
  assert.match(html,/sendWs\(\{t:'quest',action:'accept'/);
  assert.match(html,/sendWs\(\{t:'quest',action:'abandon'/);
});
