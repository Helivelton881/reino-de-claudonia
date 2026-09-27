import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, prune, unpartition, dedup } from '@gltf-transform/functions';
const [,, charPath, outPath, ...animPaths] = process.argv;
const io = new NodeIO();
const doc = await io.read(charPath);
const root = doc.getRoot();
const byName = new Map(root.listNodes().map(n => [n.getName(), n]));
const keepScene = root.getDefaultScene() || root.listScenes()[0];
for (const p of animPaths){
  const src = await io.read(p);
  const before = new Set(root.listNodes()); const beforeScenes = new Set(root.listScenes());
  mergeDocuments(doc, src);
  const newNodes = root.listNodes().filter(n => !before.has(n));
  for (const a of root.listAnimations()){
    for (const ch of a.listChannels()){
      const t = ch.getTargetNode();
      if (t && !before.has(t)){
        const dst = byName.get(t.getName());
        if (dst) ch.setTargetNode(dst); else { console.warn('sem osso:', t.getName()); ch.dispose(); }
      }
    }
  }
  root.listScenes().filter(s => !beforeScenes.has(s)).forEach(s => s.dispose());
  newNodes.forEach(n => n.dispose());
}
root.setDefaultScene(keepScene);
// descarta poses paradas e duplicadas
const seen = new Set();
for (const a of root.listAnimations()){
  const n = a.getName();
  if (/pose$/i.test(n) || seen.has(n)) { a.listChannels().forEach(c=>c.dispose()); a.listSamplers().forEach(s=>s.dispose()); a.dispose(); continue; }
  seen.add(n);
}
await doc.transform(prune(), dedup(), unpartition());
await io.write(outPath, doc);
console.log('clips:', root.listAnimations().map(a=>a.getName()).join(', '));
console.log('nodes:', root.listNodes().length, 'meshes:', root.listMeshes().length, 'skins:', root.listSkins().length, 'textures:', root.listTextures().length);
