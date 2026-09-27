// Reino De Claudonia - EquipmentManager
// Equipamentos visíveis nos personagens GLB:
//   - âncoras (Weapon_R, Weapon_L, Back, Head) presas nos ossos do modelo; se o osso não existir,
//     uma âncora auxiliar é presa na raiz do personagem (nada quebra);
//   - slots head, hair, chest, hands, legs, feet, weapon, offhand, back;
//   - peças rígidas (arma, chapéu) vão numa âncora; peças que deformam com o corpo (roupa,
//     armadura, cabelo) são ligadas ao esqueleto pelo nome dos ossos;
//   - GLBs de equipamento são baixados UMA vez (cache) e clonados para cada jogador.
(function(){
  const norm = s => String(s || '').toLowerCase().replace(/^mixamorig[:_]?/, '').replace(/[^a-z0-9]/g, '');

  class EquipmentManager {
    constructor(THREE, config, opts){
      this.THREE = THREE; this.cfg = config || {};
      this.loader = opts && opts.loader; this.shadows = !!(opts && opts.shadows);
      this.cache = new Map();     // url -> Promise<gltf | null>
    }

    _findBone(root, names){
      const want = (names || []).map(norm);
      for (const w of want){
        let hit = null;
        root.traverse(o => { if (!hit && o.isBone && norm(o.name) === w) hit = o; });
        if (hit) return hit;
      }
      return null;
    }

    // Cria as âncoras de um personagem (chamado uma vez por personagem).
    createAnchors(view){
      const T = this.THREE;
      view.anchors = {}; view.equipment = {}; view.anchorInfo = {};
      Object.entries(this.cfg.anchors || {}).forEach(([name, a]) => {
        const node = new T.Group(); node.name = 'anchor_' + name;
        const bone = this._findBone(view.model, a.bones);
        if (bone){
          const exact = norm(bone.name) === norm(name);
          node.position.fromArray(exact ? [0,0,0] : (a.boneOffset || [0,0,0]));
          if (!exact) node.rotation.set(...(a.rotation || [0,0,0]));
          bone.add(node); view.anchorInfo[name] = 'osso ' + bone.name;
        } else {
          // sem osso: âncora auxiliar na raiz, na posição aproximada do corpo
          node.position.fromArray(a.fallbackPosition || [0,1,0]);
          node.rotation.set(...(a.rotation || [0,0,0]));
          view.root.add(node); view.anchorInfo[name] = 'auxiliar (sem osso)';
        }
        view.anchors[name] = node;
      });
      return view.anchors;
    }

    _clearSlot(view, slot){
      const cur = view.equipment[slot];
      if (!cur) return;
      (Array.isArray(cur) ? cur : [cur]).forEach(o => o.parent && o.parent.remove(o));
      view.equipment[slot] = null;
    }

    // Peça rígida numa âncora (arma, escudo, chapéu). obj = null tira o que estiver no slot.
    // Compensa a escala do osso para o objeto ficar com o tamanho certo no mundo.
    equip(view, slot, obj){
      if (!view || !view.anchors) return false;
      this._clearSlot(view, slot);
      if (!obj) return true;
      const sc = (this.cfg.slots || {})[slot] || {}, node = view.anchors[sc.anchor];
      if (!node){ console.warn(`[Character] slot "${slot}" sem âncora.`); return false; }
      view.root.updateMatrixWorld(true);
      const ws = new this.THREE.Vector3(); node.getWorldScale(ws);
      const rs = new this.THREE.Vector3(); view.root.getWorldScale(rs);
      if (!obj.userData.baseScale) obj.userData.baseScale = obj.scale.clone();   // não acumula se equipar de novo
      obj.scale.copy(obj.userData.baseScale).multiply(new this.THREE.Vector3(rs.x/ws.x, rs.y/ws.y, rs.z/ws.z));
      const cast = this.shadows && view.local;
      obj.traverse(o => { if (o.isMesh) o.castShadow = cast; });
      node.add(obj); view.equipment[slot] = obj;
      return true;
    }

    // Peça que deforma com o corpo (roupa, armadura, cabelo feito no mesmo esqueleto).
    equipSkinned(view, slot, partScene){
      if (!view) return [];
      this._clearSlot(view, slot);
      if (!partScene) return [];
      const T = this.THREE, bones = {}, added = [];
      view.model.traverse(o => { if (o.isBone) bones[norm(o.name)] = o; });
      partScene.traverse(o => {
        if (!o.isSkinnedMesh) return;
        const list = o.skeleton.bones.map(b => bones[norm(b.name)]);
        if (list.some(b => !b)){ console.warn(`[Character] peça "${o.name}" usa ossos que o personagem não tem.`); return; }
        const m = o.clone(); m.bind(new T.Skeleton(list, o.skeleton.boneInverses), o.bindMatrix);
        m.castShadow = this.shadows && !!view.local; view.model.add(m); added.push(m);
      });
      view.equipment[slot] = added;
      return added;
    }

    setVisible(view, slot, visible){
      const cur = view && view.equipment && view.equipment[slot];
      if (!cur) return;
      (Array.isArray(cur) ? cur : [cur]).forEach(o => { o.visible = visible; });
    }

    // Baixa um GLB de equipamento uma vez só (cache). Devolve null se faltar ou der erro.
    loadAsset(url){
      if (!url || !this.loader) return Promise.resolve(null);
      if (!this.cache.has(url)){
        this.cache.set(url, new Promise(res => this.loader.load(url, g => res(g), undefined, e => {
          const status = e && e.target && e.target.status;
          console.warn(`[Character] Equipamento ${status === 404 ? 'não encontrado' : 'com erro'}: ${url}. Usando a peça antiga.`);
          res(null);
        })));
      }
      return this.cache.get(url);
    }
    // Uma cópia independente do equipamento (rígido: clone simples; com esqueleto: SkeletonUtils)
    instance(gltf){
      if (!gltf) return null;
      let skinned = false; gltf.scene.traverse(o => { if (o.isSkinnedMesh) skinned = true; });
      return skinned && this.THREE.SkeletonUtils ? this.THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
    }
    weaponUrl(key){ return (this.cfg.weaponModels || {})[key] || null; }
  }
  window.ClaudoniaEquipmentManager = EquipmentManager;
})();
