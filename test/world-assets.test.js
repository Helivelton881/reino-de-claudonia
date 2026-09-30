const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const world = path.join(publicDir, 'assets', 'world');

// Lê os nomes dos nós da cena de um GLB (cada modelo do kit é um nó com o nome dele)
function glbModels(file){
  const b = fs.readFileSync(file), len = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + len).toString());
  return json.scenes[json.scene || 0].nodes.map(i => json.nodes[i].name);
}

test('kits otimizados existem e são leves', () => {
  for (const f of ['nature.glb', 'props.glb', 'monsters/imp.glb', 'monsters/puglin.glb']) {
    const p = path.join(world, f);
    assert.ok(fs.existsSync(p), f + ' ausente');
    assert.ok(fs.statSync(p).size < 3 * 1024 * 1024, f + ' passou de 3 MB');
  }
});

test('todo modelo usado no mapa existe nos kits', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const nature = new Set(glbModels(path.join(world, 'nature.glb'))), props = new Set(glbModels(path.join(world, 'props.glb')));
  const natureUsed = new Set([...html.matchAll(/'((?:CommonTree|Pine|TwistedTree|DeadTree|Bush|Grass|Fern|Plant|Clover|Flower|Mushroom|Rock_Medium|Pebble)_[A-Za-z0-9_]+)'/g)].map(m => m[1]));
  for (const n of natureUsed) assert.ok(nature.has(n), 'natureza sem ' + n);
  const propUsed = new Set([...html.matchAll(/\['([A-Z][A-Za-z0-9_]+)',\s*-?[\d.]/g)].map(m => m[1]).concat([...html.matchAll(/propAt\('([A-Za-z0-9_]+)'/g)].map(m => m[1])));
  for (const n of propUsed) if (!nature.has(n)) assert.ok(props.has(n), 'objetos sem ' + n);
});

test('NPCs regionais usam GLBs otimizados', () => {
  for (const f of ['npc_vigia_cael.glb','npc_batedora_maelis.glb']) {
    const p = path.join(publicDir,'assets','npcs',f);
    assert.ok(fs.existsSync(p),f+' ausente');
    assert.ok(fs.statSync(p).size < 512 * 1024,f+' passou de 512 KB');
  }
  const html = fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
  assert.match(html,/vigia_lobos/);
  assert.match(html,/npc_vigia_cael\.glb/);
  assert.match(html,/batedora_teias/);
  assert.match(html,/npc_batedora_maelis\.glb/);
});

test('página carrega o gerenciador e os monstros do Bestiary', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /world-asset-manager\.js/);
  const js = fs.readFileSync(path.join(publicDir, 'js', 'world-asset-manager.js'), 'utf8');
  for (const name of ['imp.glb', 'puglin.glb']) assert.match(js, new RegExp(name.replace('.', '\.')));
});
