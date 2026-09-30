'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const SKILLS=require('../server/data/skills');

const root=path.join(__dirname,'..','public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('fase 9.2 entrega arte propria para as 42 habilidades',()=>{
  const list=Object.values(SKILLS);
  assert.equal(list.length,42);
  assert.equal(new Set(list.map(s=>s.icon)).size,42);
  for(const s of list){
    assert.match(s.icon,/^\/assets\/ui\/skills\/[a-z0-9_]+\.svg$/);
    const file=path.join(root,s.icon.replace(/^\//,''));
    assert.ok(fs.existsSync(file),`${s.id}: icone ausente`);
    const svg=fs.readFileSync(file,'utf8');
    assert.match(svg,/^<svg[\s\S]*<defs>/);
    assert.ok(svg.length>1500&&svg.length<6000,`${s.id}: SVG fora do budget`);
    assert.doesNotMatch(svg,/<text\b/i,`${s.id}: nao usar sigla como arte`);
  }
});
test('cliente usa imagens nas skills painel combo hotbar e buffs',()=>{
  for(const marker of [
    'function skillArt(',
    'skillArt(s.icon,s.name)',
    "skillArt(k.icon,k.name,'skill-hotbar-art')",
    "skillArt(b.icon,b.name,'skill-buff-art')",
    "icon.innerHTML=skillArt(s.icon,s.name)"
  ]) assert.ok(html.includes(marker),`render faltando: ${marker}`);
  assert.ok(html.includes('#winSkills .skill-art{display:block'));
  assert.ok(html.includes('.slot>.skill-hotbar-art{position:absolute'));
  assert.ok(html.includes('.buffs .skill-buff-art{width:18px'));
  assert.ok(!html.includes("esc(s.icon||'✦')"));
  assert.ok(!html.includes("icon.textContent=s.icon||'✦'"));
});

test('catalogo publico envia URL de imagem e preserva glyph legado internamente',()=>{
  for(const s of Object.values(SKILLS)){
    assert.equal(s.icon,`/assets/ui/skills/${s.id}.svg`);
    assert.ok(typeof s.glyph==='string'&&s.glyph.length>=2);
  }
});