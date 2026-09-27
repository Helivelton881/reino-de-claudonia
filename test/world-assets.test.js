const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

test('todos os glTF selecionados possuem buffers e texturas locais', () => {
  const roots = ['nature', 'props'];
  let checked = 0;
  for (const kit of roots) {
    const dir = path.join(publicDir, 'assets', 'kits', kit);
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.gltf'))) {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const item of [...(json.buffers || []), ...(json.images || [])]) {
        if (!item.uri || /^data:/.test(item.uri)) continue;
        assert.ok(fs.existsSync(path.join(dir, decodeURIComponent(item.uri))), `${kit}/${file}: dependência ausente ${item.uri}`);
      }
      checked++;
    }
  }
  assert.equal(checked, 35);
});

test('página carrega o gerenciador e os dois monstros do Bestiary', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /world-asset-manager\.js/);
  assert.match(html, /placeRegionLandmarks\(\)/);
  for (const name of ['Imp.glb', 'Puglin.glb']) {
    assert.ok(fs.existsSync(path.join(publicDir, 'assets', 'kits', 'monsters', name)), `${name} ausente`);
  }
});

