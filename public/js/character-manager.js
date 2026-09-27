// Reino De Claudonia - CharacterManager
// Carrega o personagem GLB/GLTF rigado (em segundo plano), cria uma cópia animada para cada
// jogador (local e multiplayer), prende equipamentos nos ossos e atualiza as animações com
// economia de bateria no celular. Se algo falhar, "ready" fica false e o jogo usa o personagem antigo.
(function(){
  const norm = s => String(s || '').toLowerCase().replace(/^mixamorig[:_]?/, '').replace(/[^a-z0-9]/g, '');

  class CharacterManager {
    constructor(THREE, scene, config, opts){
      this.THREE = THREE; this.scene = scene; this.cfg = config || {};
      this.isMobile = !!(opts && opts.isMobile); this.shadows = !!(opts && opts.shadows);
      this.available = !!(THREE && THREE.GLTFLoader && THREE.SkeletonUtils && window.ClaudoniaAnimationManager);
      this.enabled = !!this.cfg.USE_NEW_CHARACTER_MODEL && this.available;
      this.ready = false; this.error = null; this.source = null;
      this.template = null; this.clips = []; this.views = new Set(); this._frame = 0;
      this.onReady = [];
      if (this.available){
        this.loader = new THREE.GLTFLoader();
        // modelos comprimidos com Draco (opcional): o decodificador só baixa se o arquivo precisar
        if (THREE.DRACOLoader){ const dl = new THREE.DRACOLoader(); dl.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/'); this.loader.setDRACOLoader(dl); }
      }
    }
    _load(url){ return new Promise((res, rej) => this.loader.load(url, res, undefined, rej)); }

    // Carrega o modelo principal (e, se configurado, o placeholder) e as animações extras.
    async load(){
      if (!this.enabled){ this.error = this.available ? 'desligado na configuração' : 'GLTFLoader não carregou'; return false; }
      const tries = [this.cfg.model];
      if (this.cfg.usePlaceholderIfMissing && this.cfg.placeholder && this.cfg.placeholder !== this.cfg.model) tries.push(this.cfg.placeholder);
      let gltf = null;
      for (const url of tries){
        try { gltf = await this._load(url); this.source = url; break; }
        catch (e){
          const why = e && e.target && e.target.status ? `HTTP ${e.target.status}` : (e && e.message) || 'erro desconhecido';
          this.error = `não foi possível carregar ${url} (${why})`; console.warn('[Personagem]', this.error);
        }
      }
      if (!gltf) return false;
      try {
        this.clips = (gltf.animations || []).slice();
        for (const url of (this.cfg.animationFiles || [])){
          try { const a = await this._load(url); this.clips.push(...(a.animations || [])); }
          catch (e){ console.warn('[Personagem] animação não carregou:', url); }
        }
        this.template = this._prepare(gltf.scene);
        this.ready = true; this.error = null;
        const test = new window.ClaudoniaAnimationManager(this.THREE, new this.THREE.Object3D(), this.clips, this.cfg.clips);
        console.info(`[Personagem] Modelo carregado: ${this.source}${/placeholder/.test(this.source) ? ' (PLACEHOLDER DE TESTE)' : ''}. Animações: ${test.report()}`);
        test.dispose();
        this.onReady.forEach(f => { try { f(); } catch (e){ console.error(e); } });
        return true;
      } catch (e){
        this.error = 'o modelo carregou mas não pôde ser preparado'; this.ready = false;
        console.error('[Personagem]', this.error, e); return false;
      }
    }

    // Ajusta materiais, escala e altura do modelo original (feito uma vez).
    _prepare(scene){
      const T = this.THREE, lambert = this.isMobile || this.cfg.materialMode !== 'original';
      scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = this.shadows; o.receiveShadow = false;
        const conv = m => {
          // o jogo não usa correção de cor sRGB: texturas ficam "cruas" para combinar com o resto
          if (m.map){ m.map.encoding = T.LinearEncoding; m.map.anisotropy = this.isMobile ? 1 : 4; }
          if (!lambert){ if (o.isSkinnedMesh) m.skinning = true; m.needsUpdate = true; return m; }
          const l = new T.MeshLambertMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null,
            transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side,
            vertexColors: m.vertexColors, skinning: !!o.isSkinnedMesh });
          l.name = m.name; return l;
        };
        o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
        if (o.isSkinnedMesh && o.geometry){ o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere) o.geometry.boundingSphere.radius *= 1.6; }
      });
      const holder = new T.Group(); holder.name = 'CharacterModel';
      holder.add(scene);
      scene.rotation.y = this.cfg.rotationY || 0;
      holder.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(scene), h = Math.max(0.001, box.max.y - box.min.y);
      const s = (this.cfg.targetHeight || 2.35) / h;
      scene.scale.multiplyScalar(s);
      holder.updateMatrixWorld(true);
      const box2 = new T.Box3().setFromObject(scene);
      scene.position.y -= box2.min.y;          // pés no chão (y = 0 do personagem)
      return holder;
    }

    _findBone(root, names){
      const want = (names || []).map(norm);
      // procura na ordem da lista: o primeiro nome aceito que existir no modelo
      for (const w of want){
        let hit = null;
        root.traverse(o => { if (!hit && o.isBone && norm(o.name) === w) hit = o; });
        if (hit) return hit;
      }
      return null;
    }

    // Cria o personagem de um jogador. Devolve um objeto com root (Group), anim e encaixes.
    createView(opts){
      if (!this.ready) return null;
      const T = this.THREE, root = new T.Group(); root.rotation.order = 'YXZ';
      const model = T.SkeletonUtils.clone(this.template);
      root.add(model);
      const anim = new window.ClaudoniaAnimationManager(T, model, this.clips, this.cfg.clips);
      const view = { isGLB: true, root, model, anim, sockets: {}, equipment: {}, opts: opts || {}, dist: 0, acc: 0 };
      Object.entries(this.cfg.sockets || {}).forEach(([slot, sc]) => {
        const bone = this._findBone(model, sc.bones);
        if (!bone){ return; }
        const sock = new T.Group(); sock.name = 'socket_' + slot;
        sock.position.fromArray(sc.position || [0,0,0]); sock.rotation.fromArray((sc.rotation || [0,0,0]).concat(['XYZ']));
        bone.add(sock); view.sockets[slot] = sock;
      });
      this.views.add(view);
      return view;
    }

    // Prende um objeto (arma, escudo, chapéu...) num encaixe. Compensa a escala do osso para o
    // objeto ter o mesmo tamanho no mundo que teria no personagem antigo.
    equip(view, slot, obj){
      const sock = view && view.sockets[slot];
      if (view.equipment[slot]){ view.equipment[slot].parent && view.equipment[slot].parent.remove(view.equipment[slot]); }
      view.equipment[slot] = obj || null;
      if (!obj) return false;
      if (!sock){ return false; }
      view.root.updateMatrixWorld(true);
      const ws = new this.THREE.Vector3(); sock.getWorldScale(ws);
      const rs = new this.THREE.Vector3(); view.root.getWorldScale(rs);
      obj.scale.set(rs.x/ws.x, rs.y/ws.y, rs.z/ws.z);
      if (this.shadows) obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
      sock.add(obj); return true;
    }

    // Futuro: roupa/cabelo/armadura feitos no mesmo esqueleto (arquivo GLB separado). As malhas
    // com pele são ligadas aos ossos do personagem pelo nome.
    attachSkinnedPart(view, partScene){
      const T = this.THREE, bones = {};
      view.model.traverse(o => { if (o.isBone) bones[norm(o.name)] = o; });
      const added = [];
      partScene.traverse(o => {
        if (!o.isSkinnedMesh) return;
        const list = o.skeleton.bones.map(b => bones[norm(b.name)]);
        if (list.some(b => !b)){ console.warn('[Personagem] peça com ossos diferentes:', o.name); return; }
        const m = o.clone(); m.bind(new T.Skeleton(list, o.skeleton.boneInverses), o.bindMatrix);
        m.castShadow = this.shadows; view.model.add(m); added.push(m);
      });
      return added;
    }

    release(view){ if (!view) return; this.views.delete(view); if (view.anim) view.anim.dispose(); }

    // Atualiza as animações. Longe da câmera anima menos vezes por segundo (e no celular some mais cedo).
    update(dt, focus){
      this._frame++;
      const lod = this.isMobile ? this.cfg.mobile : this.cfg.desktop;
      this.views.forEach(v => {
        const p = v.root.position, d = focus ? Math.hypot(p.x - focus.x, p.z - focus.z) : 0;
        v.dist = d;
        if (v.local){ v.anim.update(dt); return; }
        const far = lod && d > lod.hideDistance;
        v.model.visible = !far;
        if (far) return;
        v.acc += dt;
        const every = !lod || d < lod.fullRateDistance ? 1 : d < lod.lowRateDistance ? 2 : 4;
        if (this._frame % every === 0){ v.anim.update(v.acc); v.acc = 0; }
      });
    }
  }
  window.ClaudoniaCharacterManager = CharacterManager;
})();
