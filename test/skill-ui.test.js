'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');

test('fase 8.1 expõe janela e atalho de árvore de skills',()=>{
  assert.match(html,/id="bSkills"/);
  assert.match(html,/id="winSkills"/);
  assert.match(html,/id="skillsBody"/);
  assert.match(html,/function renderSkills\(/);
  assert.match(html,/k==='k'/);
});

test('investimento envia apenas intenção ao servidor e exige confirmação visual',()=>{
  assert.match(html,/data-skill-learn/);
  assert.match(html,/Confirmar investimento/);
  assert.match(html,/t:'skillTree',action:'learn'/);
  assert.match(html,/m\.t==='skillTreeState'/);
});

test('respec é solicitado ao mestre de classe e hotbar usa skills aprendidas',()=>{
  assert.match(html,/data-skill-respec/);
  assert.match(html,/t:'skillTree',action:'respec',npcId:npcOpen\.id/);
  assert.match(html,/function buildHotbar\(\)/);
  assert.match(html,/SKILLS\[k\]\.cls === ch\.cls && skillKnown\(k\)/);
});