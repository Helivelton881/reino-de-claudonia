'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');

test('fase 9.1 aplica janela fantasy de habilidades inspirada na referencia',()=>{
  for(const marker of ['class="win skill-window"','class="skill-class-track"','id="skillCurrentStrip"','id="skillTreeCanvas"','id="skillSelectedIcon"','id="skillCombo"','id="skillFinish"','id="skillReset"']){
    assert.ok(html.includes(marker),'marker ausente: '+marker);
  }
  assert.match(html,/Habilidades Ativas e Passivas/);
  assert.match(html,/Barra de Combo/);
  assert.match(html,/PdH/);
});

test('fase 9.1 monta progressao por classe especializacao e arvore data-driven',()=>{
  for(const marker of ['function skillStages()','function renderSkillStages','function renderSkillTree','skillStageGlyph','data-skill-stage','data-skill-select','s.tree?.row','a.tree?.col']){
    assert.ok(html.includes(marker),'arvore UI ausente: '+marker);
  }
  assert.ok(html.includes("skillUiStage==='base'?!s.specialization:s.specialization===skillUiStage"));
});

test('controles + max combo finalizar e resetar preservam autoridade do servidor',()=>{
  assert.match(html,/action:'learn'/);
  assert.match(html,/action:'learnMax'/);
  assert.match(html,/action:'respec'/);
  assert.match(html,/function equipSkillBar/);
  assert.match(html,/max\.dataset\.confirm/);
  assert.match(html,/Fale com o mestre da sua classe/);
});

test('janela de habilidades possui responsividade desktop mobile e landscape baixo',()=>{
  assert.ok(html.includes('#winSkills.skill-window{width:min(1240px,96vw)'));
  assert.ok(html.includes('@media(max-width:860px)'));
  assert.ok(html.includes('@media (orientation:landscape) and (max-height:560px)'));
  assert.ok(html.includes("#winSkills.skill-window{width:min(920px,96vw);height:min(396px,94vh)"));
  assert.ok(html.includes("large=['winInv','winSkills'].includes(w.id)"));
});

test('debug QA expoe sincronizacao e render da skill UI sem alterar regra de gameplay',()=>{
  assert.ok(html.includes('qaApplySkillSync:applySkillSync'));
  assert.ok(html.includes('qaRenderSkills:renderSkills'));
});
