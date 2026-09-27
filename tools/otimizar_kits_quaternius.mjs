// Reino De Claudonia - monta os pacotes 3D otimizados do mundo a partir dos kits da Quaternius.
//
// Entrada: os .zip da Quaternius descompactados numa pasta (padrão D:/claudonia-temp):
//   nature/glTF/*.gltf   (Stylized Nature MegaKit [Standard])
//   props/Exports/glTF/*.gltf   (Fantasy Props MegaKit [Standard])
//   bestiary/.../Exports/GLB (Godot-Unreal)/*.glb   (Bestiary - Dungeon Monsters Kit [Standard])
// Saída (dentro do projeto):
//   public/assets/world/nature.glb   todos os modelos de natureza escolhidos, um nó por modelo
//   public/assets/world/props.glb    objetos da vila e dos interiores, um nó por modelo
//   public/assets/world/monsters/*.glb
//
// O que muda nos modelos (a forma e o desenho continuam os da Quaternius):
//   - texturas reduzidas (512 px no máximo), sem mapas de relevo (normal/ORM), que o jogo não usa;
//   - folhas e grama em tons de cinza: o jogo pinta cada árvore com as cores de outono;
//   - troncos das árvores e peças muito detalhadas com menos triângulos (meshoptimizer);
//   - cor de vértice só onde ela tem sombreado de verdade (tronco e grama).
//
// Uso (fora do projeto, numa pasta com espaço):
//   npm i @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 sharp meshoptimizer
//   node otimizar_kits_quaternius.mjs <pasta-dos-kits> <pasta-public-assets-world>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, weld, simplify, unpartition, quantize, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || 'D:/claudonia-temp';
const OUT = process.argv[3] || 'C:/Users/Admin/OneDrive/Documentos/Reino de Caludonia/public/assets/world';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;

// nome do modelo -> fração de triângulos que fica (1 = sem simplificar)
const NATURE = {
  CommonTree_3: 0.25, CommonTree_5: 0.3, Pine_2: 0.3, TwistedTree_1: 0.15, DeadTree_1: 0.2,
  Bush_Common: 1, Bush_Common_Flowers: 1,
  Grass_Common_Short: 1,
  Fern_1: 1, Plant_1_Big: 1, Clover_2: 1,
  Flower_3_Group: 0.5,
  Mushroom_Common: 0.6, Mushroom_Laetiporus: 0.3,
  Rock_Medium_1: 1, Rock_Medium_3: 1,
  Pebble_Round_1: 1,
};
const PROPS = {
  Anvil: 1, Barrel: 1, Barrel_Apples: 0.5, Barrel_Holder: 0.5, Bench: 1, Bed_Twin1: 1, Nightstand_Shelf: 1,
  Bookcase_2: 1, BookGroup_Medium_1: 1, Book_Stack_1: 1, BookStand: 1, Bucket_Wooden_1: 1, Cabinet: 1,
  Cauldron: 1, Chair_1: 1, Chandelier: 0.35, Chest_Wood: 0.6, Crate_Wooden: 1, Crate_Metal: 0.5, Dummy: 0.6,
  FarmCrate_Apple: 0.35, FarmCrate_Carrot: 0.3, Lantern_Wall: 0.5, Mug: 1, Potion_1: 1, Potion_2: 1,
  SmallBottles_1: 1, Shelf_Arch: 1, Shelf_Simple: 1, Stall_Cart_Empty: 0.5, Stall_Empty: 1, Stool: 1,
  Table_Large: 1, Torch_Metal: 1, WeaponStand: 0.6, Workbench: 1, Workbench_Drawers: 1, Banner_1: 1,
  Vase_2: 1, Pot_1: 1, Coin_Pile: 1, Sword_Bronze: 0.6, Shield_Wooden: 0.6, Axe_Bronze: 1, Pickaxe_Bronze: 1,
  Whetstone: 0.6, Candle_1: 1, CandleStick_Triple: 0.5, Bag: 1, Pouch_Large: 1, Carrot: 1,
};
const MONSTERS = { Imp: 0.4, Puglin: 0.6 };

// texturas: tamanho máximo e se vira cinza (para o jogo pintar)
const GRAY = /Leaves|Leaf_Pine|Grass/i;
const texMax = name => /Bark|Leaves|Leaf|Grass|Flowers|Rocks_Diffuse|Trim|BaseColor/i.test(name) ? 512 : 256;

async function processTextures(doc){
  for (const tex of doc.getRoot().listTextures()){
    const name = tex.getName() || tex.getURI() || '';
    const img = tex.getImage(); if (!img) continue;
    let s = sharp(Buffer.from(img));
    const meta = await s.metadata(), max = texMax(name);
    s = s.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });
    const stats = await sharp(Buffer.from(img)).stats();
    const hasAlpha = meta.hasAlpha && stats.channels[3] && stats.channels[3].min < 250;
    if (GRAY.test(name)){
      // tons de cinza com brilho médio perto de 0,85 (as cores vêm do jogo, por árvore)
      const mean = (stats.channels[0].mean*0.3 + stats.channels[1].mean*0.59 + stats.channels[2].mean*0.11) / 255 || 0.5;
      const k = Math.min(3, 0.85 / Math.max(0.05, mean));
      s = s.modulate({ saturation: 0 }).linear([k, k, k, 1], [0, 0, 0, 0]);
    }
    const out = hasAlpha ? await s.png({ compressionLevel: 9, palette: false }).toBuffer()
                         : await s.removeAlpha().jpeg({ quality: 82 }).toBuffer();
    tex.setImage(out).setMimeType(hasAlpha ? 'image/png' : 'image/jpeg');
    tex.setURI(tex.getURI().replace(/\.[a-z]+$/i, hasAlpha ? '.png' : '.jpg'));
  }
}
function stripMaterials(doc){
  for (const m of doc.getRoot().listMaterials()){
    m.setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null);
    m.setMetallicFactor(0).setRoughnessFactor(1);
  }
}
// tira a cor de vértice que é toda branca (não muda nada na tela e gasta memória)
function stripWhiteColors(doc){
  const el = [];
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()){
    const c = p.getAttribute('COLOR_0'); if (!c) continue;
    let white = true;
    for (let i=0; i<c.getCount() && white; i++){ c.getElement(i, el); const k = c.getNormalized() ? 1 : 1; if (el[0] < 0.98*k || el[1] < 0.98*k || el[2] < 0.98*k) white = false; }
    if (white) p.setAttribute('COLOR_0', null);
  }
}

// Troncos são feitos de muitas peças soltas (costuras de textura): o simplificador normal não
// consegue reduzir. O modo "sloppy" reduz só pela forma e mantém as cores/texturas dos vértices que ficam.
function sloppyBark(doc, ratio){
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()){
    const mat = p.getMaterial(); if (!mat || !/Bark/i.test(mat.getName())) continue;
    const idx = p.getIndices(), pos = p.getAttribute('POSITION'); if (!idx) continue;
    const ind = new Uint32Array(idx.getArray()), P = new Float32Array(pos.getArray());
    const target = Math.floor(ind.length * ratio / 3) * 3;
    const [res] = MeshoptSimplifier.simplifySloppy(ind, P, 3, null, target, 0.05);
    idx.setArray(pos.getCount() > 65535 ? new Uint32Array(res) : new Uint16Array(res));
    compactPrimitive(p);
  }
}
async function readModel(file, ratio, bark){
  const doc = await io.read(file);
  stripMaterials(doc);
  stripWhiteColors(doc);
  if (ratio < 1 && bark) sloppyBark(doc, ratio);
  else if (ratio < 1) await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02 }));
  return doc;
}

// Junta vários modelos num GLB só: cada modelo vira um nó com o nome dele na cena.
async function bundle(list, fileOf, outFile){
  const out = new (await import('@gltf-transform/core')).Document();
  const scene = out.createScene('Mundo');
  out.getRoot().setDefaultScene(scene);
  for (const [name, ratio] of Object.entries(list)){
    const f = fileOf(name);
    if (!fs.existsSync(f)){ console.warn('faltando', f); continue; }
    const doc = await readModel(f, ratio, /Tree|Pine/.test(name));
    const before = new Set(out.getRoot().listScenes());
    mergeDocuments(out, doc);
    const added = out.getRoot().listScenes().filter(s => !before.has(s) && s !== scene);
    const holder = out.createNode(name);
    for (const s of added){ s.listChildren().forEach(n => { s.removeChild(n); holder.addChild(n); }); s.dispose(); }
    scene.addChild(holder);
  }
  await out.transform(dedup(), prune(), unpartition());
  await processTextures(out);
  await out.transform(dedup({ propertyTypes: ['Texture'] }), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12, quantizeColor: 8 }));
  await io.write(outFile, out);
  report(outFile, out);
}
function report(file, doc){
  let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()){ const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount())/3; }
  console.log(path.basename(file), (fs.statSync(file).size/1024).toFixed(0)+' KB', tris+' triângulos', doc.getRoot().listTextures().length+' texturas',
    doc.getRoot().listTextures().map(t => t.getName()+':'+t.getSize().join('x')).join(' '));
}

fs.mkdirSync(path.join(OUT, 'monsters'), { recursive: true });
await bundle(NATURE, n => path.join(SRC, 'nature/glTF', n + '.gltf'), path.join(OUT, 'nature.glb'));
await bundle(PROPS, n => path.join(SRC, 'props/Exports/glTF', n + '.gltf'), path.join(OUT, 'props.glb'));
const bdir = fs.readdirSync(path.join(SRC, 'bestiary')).map(d => path.join(SRC, 'bestiary', d, 'Exports', 'GLB (Godot-Unreal)')).find(d => fs.existsSync(d));
for (const [name, ratio] of Object.entries(MONSTERS)){
  const doc = await readModel(path.join(bdir, name + '.glb'), ratio);
  for (const m of doc.getRoot().listMaterials()) m.setEmissiveTexture(m.getEmissiveTexture());   // brilho dos olhos fica
  await doc.transform(prune(), dedup());
  await processTextures(doc);
  const f = path.join(OUT, 'monsters', name.toLowerCase() + '.glb');
  await io.write(f, doc); report(f, doc);
}

// relatório por modelo (para escolher quantas instâncias cabem)
const per = await io.read(path.join(OUT, 'nature.glb'));
for (const n of per.getRoot().getDefaultScene().listChildren()){
  let t = 0; n.traverse(x => { const m = x.getMesh(); if (m) m.listPrimitives().forEach(p => { const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount())/3; }); });
  process.stdout.write(n.getName() + ':' + t + '  ');
}
console.log();
