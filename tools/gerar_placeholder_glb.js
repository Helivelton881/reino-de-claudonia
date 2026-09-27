// Reino De Claudonia - gera o PLACEHOLDER DE TESTE do personagem (manequim cinza rigado).
// NÃO é o visual do jogo: serve só para testar carregamento, esqueleto e animações enquanto o
// modelo definitivo (public/assets/characters/base_male.glb) não existe.
//
// Uso:  node tools/gerar_placeholder_glb.js
// Saída: public/assets/characters/placeholder_mannequin.glb
//
// O arquivo segue o mesmo padrão que o exportador glTF do Blender: 1,75 m de altura,
// frente virada para +Z, ossos com nomes Hips/Spine/Chest/Neck/Head/UpperArm_L/... e
// animações Idle, Walk, Run, Attack_01, Hit, Death, Jump, Cast, FlyIdle e FlyForward.
const fs = require('fs');
const path = require('path');

/* ---------- Esqueleto (posições no mundo, em metros) ---------- */
const BONES = [
  ['Hips',       null,         [0, 0.90, 0]],
  ['Spine',      'Hips',       [0, 1.10, 0]],
  ['Chest',      'Spine',      [0, 1.35, 0]],
  ['Neck',       'Chest',      [0, 1.50, 0]],
  ['Head',       'Neck',       [0, 1.56, 0]],
  ['UpperArm_L', 'Chest',      [0.25, 1.44, 0]],
  ['LowerArm_L', 'UpperArm_L', [0.25, 1.17, 0]],
  ['Hand_L',     'LowerArm_L', [0.25, 0.93, 0]],
  ['UpperArm_R', 'Chest',      [-0.25, 1.44, 0]],
  ['LowerArm_R', 'UpperArm_R', [-0.25, 1.17, 0]],
  ['Hand_R',     'LowerArm_R', [-0.25, 0.93, 0]],
  ['UpperLeg_L', 'Hips',       [0.10, 0.90, 0]],
  ['LowerLeg_L', 'UpperLeg_L', [0.10, 0.50, 0]],
  ['Foot_L',     'LowerLeg_L', [0.10, 0.12, 0]],
  ['UpperLeg_R', 'Hips',       [-0.10, 0.90, 0]],
  ['LowerLeg_R', 'UpperLeg_R', [-0.10, 0.50, 0]],
  ['Foot_R',     'LowerLeg_R', [-0.10, 0.12, 0]],
];
const boneIndex = Object.fromEntries(BONES.map((b, i) => [b[0], i]));

/* ---------- Corpo: elipsoides presas a um osso cada (manequim de teste) ---------- */
const GREY = [0.55, 0.58, 0.64], LIGHT = [0.72, 0.74, 0.78], ORANGE = [0.95, 0.55, 0.15];
const PARTS = [
  ['Hips',  [0, 0.95, 0],  [0.17, 0.12, 0.11], GREY],
  ['Spine', [0, 1.20, 0],  [0.18, 0.17, 0.115], GREY],
  ['Chest', [0, 1.38, 0],  [0.21, 0.13, 0.13], GREY],
  ['Neck',  [0, 1.52, 0],  [0.05, 0.06, 0.05], LIGHT],
  ['Head',  [0, 1.625, 0.01], [0.12, 0.125, 0.12], LIGHT],
];
['L', 'R'].forEach(s => {
  const x = s === 'L' ? 0.25 : -0.25, lx = s === 'L' ? 0.1 : -0.1;
  PARTS.push(['UpperArm_' + s, [x, 1.30, 0], [0.05, 0.14, 0.05], GREY]);
  PARTS.push(['LowerArm_' + s, [x, 1.05, 0], [0.045, 0.12, 0.045], GREY]);
  PARTS.push(['Hand_' + s,     [x, 0.88, 0], [0.045, 0.06, 0.03], ORANGE]);
  PARTS.push(['UpperLeg_' + s, [lx, 0.70, 0], [0.075, 0.2, 0.075], GREY]);
  PARTS.push(['LowerLeg_' + s, [lx, 0.32, 0], [0.06, 0.19, 0.06], GREY]);
  PARTS.push(['Foot_' + s,     [lx, 0.05, 0.05], [0.055, 0.045, 0.11], ORANGE]);
});

const pos = [], nor = [], col = [], joints = [], weights = [], idx = [];
PARTS.forEach(([bone, c, r, color]) => {
  const W = 16, H = 12, base = pos.length / 3, bi = boneIndex[bone];
  for (let j = 0; j <= H; j++){
    const th = j / H * Math.PI;
    for (let i = 0; i <= W; i++){
      const ph = i / W * Math.PI * 2;
      const ux = Math.sin(th) * Math.cos(ph), uy = Math.cos(th), uz = Math.sin(th) * Math.sin(ph);
      pos.push(c[0] + ux * r[0], c[1] + uy * r[1], c[2] + uz * r[2]);
      const nx = ux / r[0], ny = uy / r[1], nz = uz / r[2], l = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / l, ny / l, nz / l);
      col.push(...color); joints.push(bi, 0, 0, 0); weights.push(1, 0, 0, 0);
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++){
    const a = base + j * (W + 1) + i, b = a + W + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
});

/* ---------- Animações (rotações dos ossos) ---------- */
const qAxis = (ax, a) => { const s = Math.sin(a / 2); return ax === 'x' ? [s, 0, 0, Math.cos(a / 2)] : ax === 'y' ? [0, s, 0, Math.cos(a / 2)] : [0, 0, s, Math.cos(a / 2)]; };
const qMul = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
// cada chave: [x, z] em radianos (z = abrir o braço para o lado, x = frente/trás)
const rot = (x, z, y) => qMul(qMul(qAxis('y', y || 0), qAxis('z', z || 0)), qAxis('x', x || 0));
const OUT = 0.1; // braços um pouco abertos para não atravessar o corpo
const CLIPS = {
  Idle: { t: [0, 1, 2], bones: {
    Chest: [[0.0], [0.04], [0.0]], UpperArm_L: [[0, OUT], [0.03, OUT + 0.03], [0, OUT]], UpperArm_R: [[0, -OUT], [0.03, -OUT - 0.03], [0, -OUT]] } },
  Walk: { t: [0, 0.5, 1], bones: {
    UpperLeg_L: [[-0.5], [0.5], [-0.5]], UpperLeg_R: [[0.5], [-0.5], [0.5]],
    LowerLeg_L: [[0.15], [0.55], [0.15]], LowerLeg_R: [[0.55], [0.15], [0.55]],
    UpperArm_L: [[0.4, OUT], [-0.4, OUT], [0.4, OUT]], UpperArm_R: [[-0.4, -OUT], [0.4, -OUT], [-0.4, -OUT]] } },
  Run: { t: [0, 0.3, 0.6], bones: {
    Chest: [[0.25], [0.25], [0.25]],
    UpperLeg_L: [[-0.9], [0.8], [-0.9]], UpperLeg_R: [[0.8], [-0.9], [0.8]],
    LowerLeg_L: [[0.3], [1.1], [0.3]], LowerLeg_R: [[1.1], [0.3], [1.1]],
    UpperArm_L: [[0.8, OUT], [-0.8, OUT], [0.8, OUT]], UpperArm_R: [[-0.8, -OUT], [0.8, -OUT], [-0.8, -OUT]],
    LowerArm_L: [[-0.9], [-0.9], [-0.9]], LowerArm_R: [[-0.9], [-0.9], [-0.9]] } },
  Attack_01: { t: [0, 0.2, 0.4, 0.6], bones: {
    UpperArm_R: [[0, -OUT], [-2.6, -OUT], [0.4, -OUT], [0, -OUT]], Chest: [[0, 0, 0], [0, 0, 0.3], [0, 0, -0.35], [0, 0, 0]] } },
  Hit: { t: [0, 0.15, 0.4], bones: { Chest: [[0], [-0.35], [0]], Head: [[0], [-0.3], [0]] } },
  Death: { t: [0, 0.6, 1.2], bones: { Hips: [[0], [-0.9], [-1.5]], UpperArm_L: [[0, OUT], [0, 0.6], [0, 1.2]], UpperArm_R: [[0, -OUT], [0, -0.6], [0, -1.2]] },
    translate: { Hips: [[0, 0.9, 0], [0, 0.6, -0.1], [0, 0.18, -0.3]] } },
  Jump: { t: [0, 0.25], bones: {
    UpperLeg_L: [[0], [-0.8]], UpperLeg_R: [[0], [-0.6]], LowerLeg_L: [[0], [1.2]], LowerLeg_R: [[0], [1.0]],
    UpperArm_L: [[0, OUT], [-2.4, OUT]], UpperArm_R: [[0, -OUT], [-2.4, -OUT]] } },
  Cast: { t: [0, 0.25, 0.55, 0.8], bones: {
    UpperArm_L: [[0, OUT], [-1.5, 0.2], [-1.5, 0.2], [0, OUT]], UpperArm_R: [[0, -OUT], [-1.5, -0.2], [-1.5, -0.2], [0, -OUT]],
    Chest: [[0], [-0.1], [-0.1], [0]] } },
  FlyIdle: { t: [0, 1, 2], bones: {
    UpperLeg_L: [[-0.15], [-0.25], [-0.15]], UpperLeg_R: [[-0.15], [-0.25], [-0.15]], LowerLeg_L: [[0.3], [0.4], [0.3]], LowerLeg_R: [[0.3], [0.4], [0.3]],
    UpperArm_L: [[0, 0.5], [0, 0.55], [0, 0.5]], UpperArm_R: [[0, -0.5], [0, -0.55], [0, -0.5]] } },
  FlyForward: { t: [0, 0.5, 1], bones: {
    Chest: [[0.3], [0.32], [0.3]], UpperLeg_L: [[0.2], [0.25], [0.2]], UpperLeg_R: [[0.2], [0.25], [0.2]],
    UpperArm_L: [[0.6, 0.3], [0.65, 0.3], [0.6, 0.3]], UpperArm_R: [[0.6, -0.3], [0.65, -0.3], [0.6, -0.3]] } },
};

/* ---------- Montagem do GLB ---------- */
const views = [], accessors = [], chunks = [];
let byteLen = 0;
function addView(typed, target){
  const pad = (4 - (byteLen % 4)) % 4; if (pad){ chunks.push(Buffer.alloc(pad)); byteLen += pad; }
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  views.push(Object.assign({ buffer: 0, byteOffset: byteLen, byteLength: buf.length }, target ? { target } : {}));
  chunks.push(buf); byteLen += buf.length; return views.length - 1;
}
function addAccessor(typed, type, componentType, count, extra, target){
  accessors.push(Object.assign({ bufferView: addView(typed, target), componentType, count, type }, extra || {}));
  return accessors.length - 1;
}
const minmax = (arr, n) => { const mn = Array(n).fill(Infinity), mx = Array(n).fill(-Infinity); for (let i = 0; i < arr.length; i++){ const k = i % n; mn[k] = Math.min(mn[k], arr[i]); mx[k] = Math.max(mx[k], arr[i]); } return { min: mn, max: mx }; };
const F = 5126, US = 5123, ARRAY = 34962, ELEM = 34963;
const vcount = pos.length / 3;
const aPos = addAccessor(new Float32Array(pos), 'VEC3', F, vcount, minmax(pos, 3), ARRAY);
const aNor = addAccessor(new Float32Array(nor), 'VEC3', F, vcount, null, ARRAY);
const aCol = addAccessor(new Float32Array(col), 'VEC3', F, vcount, null, ARRAY);
const aJoi = addAccessor(new Uint16Array(joints), 'VEC4', US, vcount, null, ARRAY);
const aWei = addAccessor(new Float32Array(weights), 'VEC4', F, vcount, null, ARRAY);
const aIdx = addAccessor(new Uint16Array(idx), 'SCALAR', US, idx.length, null, ELEM);
const ibm = [];
BONES.forEach(([, , w]) => ibm.push(1,0,0,0, 0,1,0,0, 0,0,1,0, -w[0],-w[1],-w[2],1));
const aIbm = addAccessor(new Float32Array(ibm), 'MAT4', F, BONES.length);

const nodes = [{ name: 'PLACEHOLDER_Mannequin', children: [1, 2] }, { name: 'PLACEHOLDER_Body', mesh: 0, skin: 0 }];
const boneNode = {};
BONES.forEach(([name, parent, w]) => {
  const pw = parent ? BONES[boneIndex[parent]][2] : [0, 0, 0];
  boneNode[name] = nodes.length;
  nodes.push({ name, translation: [w[0] - pw[0], w[1] - pw[1], w[2] - pw[2]] });
});
BONES.forEach(([name, parent]) => { if (parent){ const pn = nodes[boneNode[parent]]; (pn.children = pn.children || []).push(boneNode[name]); } });
nodes[0].children = [1, boneNode.Hips];

const animations = Object.entries(CLIPS).map(([name, clip]) => {
  const samplers = [], channels = [];
  const tAcc = addAccessor(new Float32Array(clip.t), 'SCALAR', F, clip.t.length, { min: [Math.min(...clip.t)], max: [Math.max(...clip.t)] });
  Object.entries(clip.bones).forEach(([bone, keys]) => {
    const q = []; keys.forEach(k => q.push(...rot(k[0] || 0, k[1] || 0, k[2] || 0)));
    samplers.push({ input: tAcc, output: addAccessor(new Float32Array(q), 'VEC4', F, keys.length), interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: boneNode[bone], path: 'rotation' } });
  });
  Object.entries(clip.translate || {}).forEach(([bone, keys]) => {
    const pw = BONES[boneIndex[bone]][1] ? BONES[boneIndex[BONES[boneIndex[bone]][1]]][2] : [0, 0, 0];
    const v = []; keys.forEach(k => v.push(k[0] - pw[0], k[1] - pw[1], k[2] - pw[2]));
    samplers.push({ input: tAcc, output: addAccessor(new Float32Array(v), 'VEC3', F, keys.length), interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: boneNode[bone], path: 'translation' } });
  });
  return { name, samplers, channels };
});

const gltf = {
  asset: { version: '2.0', generator: 'Reino De Claudonia - gerar_placeholder_glb.js (PLACEHOLDER DE TESTE)' },
  scene: 0, scenes: [{ name: 'PLACEHOLDER', nodes: [0] }], nodes,
  meshes: [{ name: 'PLACEHOLDER_Body', primitives: [{ attributes: { POSITION: aPos, NORMAL: aNor, COLOR_0: aCol, JOINTS_0: aJoi, WEIGHTS_0: aWei }, indices: aIdx, material: 0 }] }],
  materials: [{ name: 'PLACEHOLDER_Material', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.85 } }],
  skins: [{ name: 'PLACEHOLDER_Skin', joints: BONES.map(b => boneNode[b[0]]), inverseBindMatrices: aIbm, skeleton: boneNode.Hips }],
  animations, accessors, bufferViews: views, buffers: [{ byteLength: 0 }],
};
let bin = Buffer.concat(chunks); const binPad = (4 - bin.length % 4) % 4; bin = Buffer.concat([bin, Buffer.alloc(binPad)]);
gltf.buffers[0].byteLength = bin.length;
let json = Buffer.from(JSON.stringify(gltf), 'utf8'); const jsonPad = (4 - json.length % 4) % 4; json = Buffer.concat([json, Buffer.from(' '.repeat(jsonPad))]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4E4F534A, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
const out = path.join(__dirname, '..', 'public', 'assets', 'characters', 'placeholder_mannequin.glb');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, jh, json, bh, bin]));
console.log(`PLACEHOLDER gerado: ${out} (${(12 + 16 + json.length + bin.length)} bytes, ${vcount} vértices, ${BONES.length} ossos, ${animations.length} animações)`);
