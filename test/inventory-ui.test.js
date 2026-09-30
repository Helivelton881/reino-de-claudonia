'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');

test('inventario refeito usa layout fantasy com busca tabs paper doll e 40 slots visuais',()=>{
  for(const marker of ['class="win inv-window"','id="invSearch"','id="invCharacter"','id="invEquipLeft"','id="invEquipRight"','id="invEquipBottom"','id="invCapacity"',"for(let i=INV_SIZE;i<40;i++)"]){
    assert.ok(html.includes(marker),'marker ausente: '+marker);
  }
  assert.match(html,/Todos/);
  assert.match(html,/Favoritos/);
  assert.match(html,/Raro\+/);
});

test('paper doll do inventario renderiza o personagem real em viewport Three separado',()=>{
  for(const marker of ['function initInventoryPreview()','new THREE.WebGLRenderer({canvas:c','charSys.createView({inventory:true})','function syncInventoryPreviewGear','function inventoryPreviewFrame']){
    assert.ok(html.includes(marker),'preview 3D ausente: '+marker);
  }
  assert.ok(html.includes("const map={arma:'weapon',offhand:'offhand',capacete:'head',peitoral:'chestRigid',capa:'cape'}"));
});

test('inventario grande abre centralizado e possui adaptacao responsiva',()=>{
  assert.ok(html.includes("large=['winInv','winSkills'].includes(w.id)"));
  assert.ok(html.includes('@media(max-width:860px)'));
  assert.ok(html.includes('#winInv .inv-grid{grid-template-columns:repeat(8'));
});

test('inventario preserva proporcao em landscape baixo como iPhone deitado',()=>{
  assert.ok(html.includes('@media (orientation:landscape) and (max-height:560px)'));
  assert.ok(html.includes('#winInv .inv-body{height:calc(100% - 40px)'));
  assert.ok(html.includes('#winInv .inv-preview-frame{min-height:0;flex:1}'));
  assert.ok(html.includes('#winInv .inv-grid{grid-template-columns:repeat(8,minmax(0,1fr));grid-auto-rows:minmax(39px,1fr)'));
});
