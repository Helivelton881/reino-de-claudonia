// Reino De Claudonia - WorldAssetManager
// Natureza, objetos da vila e monstros feitos com os kits da Quaternius (CC0 / licença Quaternius),
// já otimizados por tools/otimizar_kits_quaternius.mjs em poucos arquivos GLB:
//   /assets/world/nature.glb   árvores, arbustos, grama, flores, plantas, cogumelos e pedras
//   /assets/world/props.glb    barris, caixotes, barracas, móveis, bigorna, livros...
//   /assets/world/monsters/*.glb
// Cada arquivo tem um nó por modelo, com o nome do modelo (ex.: "CommonTree_3").
//
// Para o celular aguentar milhares de plantas:
//   - cada modelo vira InstancedMesh (um desenho para muitas cópias);
//   - o mapa é dividido em blocos (CHUNK metros); cada bloco tem a sua esfera de recorte certa,
//     então o que está fora da câmera não é desenhado, e blocos longe somem (distância por tipo);
//   - folhas e grama vêm em cinza no arquivo e cada cópia recebe uma cor (outono, verde...).
(function(global){
  'use strict';
  const CHUNK = 80;

  class WorldAssetManager {
    constructor({scene, heightAt, highQuality = true, isMobile = false}){
      this.scene = scene; this.heightAt = heightAt; this.hq = highQuality; this.isMobile = isMobile;
      this.loader = new THREE.GLTFLoader();
      this.kits = new Map();        // url -> Promise<Map(nome -> modelo)>
      this.gltfs = new Map();       // url -> Promise<gltf>
      this.chunks = [];             // {x, z, far, meshes[]}
      this.instances = [];          // objetos soltos (monstros) com distância máxima
      this._t = 0;
    }

    _gltf(url){
      if (!this.gltfs.has(url)) this.gltfs.set(url, new Promise((res, rej) => this.loader.load(url, res, undefined, rej)));
      return this.gltfs.get(url);
    }

    // Converte um atributo compactado (inteiros) em Float32 normal (necessário para aplicar a matriz).
    // Funciona também com atributos intercalados (InterleavedBufferAttribute).
    static _float(attr){
      if (!attr) return attr;
      const a = attr.array, size = attr.itemSize, n = attr.count;
      if (a instanceof Float32Array && !attr.isInterleavedBufferAttribute) return attr;
      let div = 1;
      if (attr.normalized){
        if (a instanceof Int8Array) div = 127; else if (a instanceof Uint8Array) div = 255;
        else if (a instanceof Int16Array) div = 32767; else if (a instanceof Uint16Array) div = 65535;
      }
      const signed = attr.normalized && (a instanceof Int8Array || a instanceof Int16Array);
      const get = ['getX', 'getY', 'getZ', 'getW'], out = new Float32Array(n * size);
      for (let i = 0; i < n; i++) for (let c = 0; c < size; c++){
        const v = attr[get[c]](i) / div; out[i*size + c] = signed ? Math.max(-1, v) : v;
      }
      return new THREE.BufferAttribute(out, size);
    }

    // Carrega um kit e separa os modelos: cada modelo = lista de partes {geometry, material, tint}
    // com a posição do nó já aplicada na geometria. Materiais viram Lambert (mesma luz do jogo).
    loadKit(url){
      if (this.kits.has(url)) return this.kits.get(url);
      const p = this._gltf(url).then(gltf => {
        const models = new Map(), mats = new Map(), root = gltf.scene;
        root.updateMatrixWorld(true);
        const lambert = (m, vc) => {
          const key = m.uuid + (vc ? 'vc' : '');
          if (mats.has(key)) return mats.get(key);
          if (m.map){ m.map.encoding = THREE.LinearEncoding; m.map.anisotropy = this.isMobile ? 1 : 4; }
          const cut = m.alphaTest > 0 || m.transparent;
          const out = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff,
            alphaTest: cut ? 0.5 : 0, side: m.side, vertexColors: vc });
          out.name = m.name; mats.set(key, out); return out;
        };
        root.children.forEach(holder => {
          const parts = [];
          const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
          holder.traverse(o => {
            if (!o.isMesh) return;
            const g = new THREE.BufferGeometry();
            ['position', 'normal', 'uv', 'color'].forEach(k => { const a = WorldAssetManager._float(o.geometry.attributes[k]); if (a) g.setAttribute(k, a); });
            if (o.geometry.index) g.setIndex(o.geometry.index);
            // a cor de vértice é sombreado (preto na raiz): clareia para não ficar escuro demais
            if (g.attributes.color){ const c = g.attributes.color.array; for (let i = 0; i < c.length; i++) c[i] = 0.55 + 0.45*c[i]; }
            g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
            if (!g.attributes.normal) g.computeVertexNormals();
            g.computeBoundingBox(); g.computeBoundingSphere();
            const mat = lambert(o.material, !!g.attributes.color);
            parts.push({ geometry: g, material: mat, tint: /Leaves|Leaf|Grass/i.test(o.material.name) });
          });
          if (!parts.length) return;
          const box = new THREE.Box3(); parts.forEach(pt => box.union(pt.geometry.boundingBox));
          models.set(holder.name, { name: holder.name, parts, box, height: box.max.y - box.min.y,
            radius: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 });
        });
        return models;
      });
      this.kits.set(url, p);
      return p;
    }

    /* Espalha um modelo em muitas posições. items: [{x, z, y?, rot, s, color?}]
       opts: { far: distância em que o bloco some, shadow: faz sombra (só no PC),
               grounded: true = apoia a base do modelo no chão (padrão) }
       Retorna os InstancedMesh criados. */
    instance(model, items, opts){
      opts = opts || {};
      if (!model || !items.length) return [];
      const groups = new Map();
      items.forEach(it => {
        const k = Math.floor(it.x / CHUNK) + ',' + Math.floor(it.z / CHUNK);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(it);
      });
      const out = [], dummy = new THREE.Object3D(), col = new THREE.Color(), baseY = -model.box.min.y;
      groups.forEach(list => {
        let cx = 0, cy = 0, cz = 0, maxS = 0;
        list.forEach(it => { it._y = it.y != null ? it.y : this.heightAt(it.x, it.z); cx += it.x; cy += it._y; cz += it.z; maxS = Math.max(maxS, it.s || 1); });
        cx /= list.length; cy /= list.length; cz /= list.length;
        let r = 0; list.forEach(it => { r = Math.max(r, Math.hypot(it.x - cx, it._y - cy, it.z - cz)); });
        const sphere = new THREE.Sphere(new THREE.Vector3(cx, cy + model.height * maxS / 2, cz), r + Math.max(model.height, model.radius * 2) * maxS);
        const chunk = { x: cx, z: cz, far: opts.far || 150, meshes: [] };
        model.parts.forEach(pt => {
          if (opts.tintOnly && !pt.tint) return;
          const g = new THREE.BufferGeometry();          // mesmos dados na placa de vídeo, esfera própria do bloco
          Object.keys(pt.geometry.attributes).forEach(k => g.setAttribute(k, pt.geometry.attributes[k]));
          if (pt.geometry.index) g.setIndex(pt.geometry.index);
          g.boundingSphere = sphere; g.boundingBox = null;
          const m = new THREE.InstancedMesh(g, pt.material, list.length);
          list.forEach((it, i) => {
            const s = it.s || 1;
            dummy.position.set(it.x, it._y + (opts.grounded === false ? 0 : baseY * s) + (it.dy || 0), it.z);
            dummy.rotation.set(it.rx || 0, it.rot || 0, it.rz || 0);
            dummy.scale.set(s, s * (it.sy || 1), s);
            dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
            if (pt.tint || it.colorAll) m.setColorAt(i, it.color ? col.copy(it.color) : col.setRGB(1, 1, 1));
          });
          m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
          m.castShadow = !!(opts.shadow && this.hq); m.receiveShadow = false;
          m.name = model.name;
          this.scene.add(m); chunk.meshes.push(m); out.push(m);
        });
        this.chunks.push(chunk);
      });
      return out;
    }

    // Uma cópia solta de um modelo (para ilhas que se mexem, placas etc.)
    clone(model, color){
      const g = new THREE.Group();
      if (!model) return g;
      model.parts.forEach(pt => {
        let mat = pt.material;
        if (color && pt.tint){ mat = pt.material.clone(); mat.color = new THREE.Color(color); }
        const m = new THREE.Mesh(pt.geometry, mat); m.castShadow = this.hq; g.add(m);
      });
      g.userData.baseY = -model.box.min.y;
      return g;
    }

    // Some com os blocos longe da câmera (chamado todo quadro; trabalha 4 vezes por segundo).
    update(cameraPosition, dt){
      this._t -= dt || 0.016;
      if (this._t > 0) return; this._t = 0.25;
      const cx = cameraPosition.x, cz = cameraPosition.z;
      for (const c of this.chunks){
        const d = Math.hypot(c.x - cx, c.z - cz) - CHUNK * 0.7, vis = d < c.far;
        if (c.meshes[0] && c.meshes[0].visible !== vis) c.meshes.forEach(m => { m.visible = vis; });
      }
      for (const o of this.instances){
        if (!o.parent) continue;
        o.getWorldPosition(WorldAssetManager._v);
        const dx = WorldAssetManager._v.x - cx, dz = WorldAssetManager._v.z - cz;
        o.visible = dx*dx + dz*dz <= (o.userData.maxDistance || 155) ** 2;
      }
    }

    // Monstro com modelo do Bestiary (sem animações no pacote grátis: o jogo balança o corpo inteiro)
    async replaceMonster(monster, url, height){
      if (monster.assetVisual) return monster.assetVisual;
      try {
        const gltf = await this._gltf(url);
        if (!monster.mesh.parent) return null;                // o monstro sumiu enquanto baixava
        const object = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
        const box = new THREE.Box3().setFromObject(gltf.scene), size = new THREE.Vector3(); box.getSize(size);
        const factor = height / Math.max(0.001, size.y);
        object.scale.setScalar(factor); object.position.y = -box.min.y * factor;
        object.traverse(o => { if (o.isMesh){
          o.castShadow = this.hq; o.frustumCulled = false;
          if (o.material && o.material.map) o.material.map.encoding = THREE.LinearEncoding;
          if (o.material && o.material.emissiveMap) o.material.emissiveMap.encoding = THREE.LinearEncoding;
        } });
        monster.body.visible = false; monster.mesh.add(object); monster.assetVisual = object;
        return object;
      } catch (error){ console.warn('[WorldAssets] Monstro do Bestiary indisponível', error); return null; }
    }
  }
  WorldAssetManager._v = new THREE.Vector3();
  WorldAssetManager.CHUNK = CHUNK;

  global.CLAUDONIA_WORLD_ASSETS = {
    nature: '/assets/world/nature.glb',
    props: '/assets/world/props.glb',
    monsters: '/assets/world/monsters/',
    // Monstros que ganham o modelo do Bestiary (1 em cada 4 e os gigantes)
    monsterVariants: { golem: 'puglin.glb', ciclope: 'puglin.glb', aranha: 'imp.glb', espirito: 'imp.glb' },
  };
  global.WorldAssetManager = WorldAssetManager;
})(window);
