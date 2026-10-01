// Reino De Claudonia - CharacterManager
// Carrega o personagem GLB/GLTF rigado em segundo plano (UMA vez, com cache), cria uma cópia
// animada para cada jogador (local e multiplayer) com SkeletonUtils.clone (clone correto de
// SkinnedMesh), cuida de posição/escala/rotação/visibilidade e repassa os equipamentos ao
// EquipmentManager. Se algo falhar, "ready" fica false e o jogo usa o personagem antigo.
(function(){
  const fileName = url => String(url || '').split('/').pop();

  class CharacterManager {
    constructor(THREE, scene, config, opts){
      this.THREE = THREE; this.scene = scene; this.cfg = config || {};
      this.isMobile = !!(opts && opts.isMobile); this.shadows = !!(opts && opts.shadows);
      this.available = !!(THREE && THREE.GLTFLoader && THREE.SkeletonUtils && window.ClaudoniaAnimationManager && window.ClaudoniaEquipmentManager);
      this.enabled = !!this.cfg.USE_NEW_CHARACTER_MODEL && this.available;
      this.ready = false; this.error = null; this.source = null; this.missing = false;
      this.template = null; this.templates = {}; this.clips = []; this.views = new Set(); this._frame = 0;
      this.onReady = [];
      if (this.available){
        this.loader = new THREE.GLTFLoader();
        // modelos comprimidos com Draco (opcional): o decodificador só baixa se o arquivo precisar
        if (THREE.DRACOLoader){ const dl = new THREE.DRACOLoader(); dl.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/'); this.loader.setDRACOLoader(dl); }
        this.equipment = new window.ClaudoniaEquipmentManager(THREE, this.cfg, {loader: this.loader, shadows: this.shadows});
      }
    }
    _load(url){ return new Promise((res, rej) => this.loader.load(url, res, undefined, rej)); }

    // Carrega o modelo principal (e, se configurado, o placeholder) e as animações extras.
    async load(){
      if (!this.enabled){ this.error = this.available ? 'desligado na configuração' : 'GLTFLoader não carregou'; return false; }
      const tries = [this.cfg.model];
      if (this.cfg.usePlaceholderIfMissing && this.cfg.placeholder && this.cfg.placeholder !== this.cfg.model) tries.push(this.cfg.placeholder);
      let gltf = null;
      if (this.cfg.modelLabel) console.info(`[Character] Loading ${this.cfg.modelLabel}...`);
      for (const url of tries){
        console.info(`[Character] Loading ${fileName(url)}`);
        try { gltf = await this._load(url); this.source = url; break; }
        catch (e){
          const status = e && e.target && e.target.status;
          if (status === 404){ this.missing = true; this.error = `${fileName(url)} não existe`; console.warn('[Character] GLB não encontrado. Usando fallback.'); }
          else { this.error = `erro ao carregar ${fileName(url)} (${status ? 'HTTP ' + status : (e && e.message) || 'desconhecido'})`; console.warn(`[Character] ${this.error}. Usando fallback.`); }
        }
      }
      if (!gltf){ console.warn('[Character] GLB failed. Using legacy fallback.'); return false; }
      try {
        this.clips = (gltf.animations || []).slice();
        for (const url of (this.cfg.animationFiles || [])){
          try { const a = await this._load(url); this.clips.push(...(a.animations || [])); }
          catch (e){ console.warn(`[Character] Animações não carregaram: ${fileName(url)}`); }
        }
        this.template = this._prepare(gltf.scene);
        this.templates.male = this.template;
        const femaleUrl = this.cfg.models && this.cfg.models.female;
        if (femaleUrl){ try { const female = await this._load(femaleUrl); this.templates.female = this._prepare(female.scene); console.info('[Character] Female model loaded: ' + fileName(femaleUrl)); } catch(e){ console.warn('[Character] Female model failed; male fallback active.', e); } }
        this.ready = true; this.error = null;
        console.info(`[Character] Model loaded: ${fileName(this.source)}${/placeholder/.test(this.source) ? ' (PLACEHOLDER DE TESTE)' : ''}`);
        console.info('[Character] Model loaded successfully.');
        console.info(`[Character] Animation clips: ${this.clips.map(c => c.name).join(', ') || '(nenhuma)'}`);
        const test = new window.ClaudoniaAnimationManager(this.THREE, new this.THREE.Object3D(), this.clips, this.cfg.clips);
        console.info(`[Character] Animations: ${test.report()}`);
        test.dispose();
        this.onReady.forEach(f => { try { f(); } catch (e){ console.error(e); } });
        return true;
      } catch (e){
        this.error = 'o modelo carregou mas não pôde ser preparado'; this.ready = false;
        console.error(`[Character] ${this.error}. Usando fallback.`, e);
        console.warn('[Character] GLB failed. Using legacy fallback.'); return false;
      }
    }

    // Reduz texturas grandes demais (memória do celular)
    _shrink(tex){
      const max = this.isMobile ? (this.cfg.maxTextureSize || {}).mobile || 512 : (this.cfg.maxTextureSize || {}).desktop || 1024;
      const img = tex && tex.image; if (!img || !img.width || (img.width <= max && img.height <= max)) return;
      const k = max / Math.max(img.width, img.height), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      tex.image = c; tex.needsUpdate = true;
    }

    // Ajusta materiais, escala, altura e giro do modelo original (feito UMA vez; as cópias reaproveitam).
    _prepare(scene){
      const T = this.THREE, lambert = this.isMobile || this.cfg.materialMode !== 'original', done = new Map();
      scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = false; o.receiveShadow = false;    // sombra real só no personagem local (ver setLocal)
        const conv = m => {
          if (done.has(m)) return done.get(m);           // mesmo material em várias malhas: converte uma vez
          if (m.map){ m.map.encoding = T.LinearEncoding; m.map.anisotropy = this.isMobile ? 1 : 4; this._shrink(m.map); }
          let out = m;
          if (!lambert){ if (o.isSkinnedMesh) m.skinning = true; m.needsUpdate = true; }
          else {
            out = new T.MeshLambertMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null,
              transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side,
              vertexColors: m.vertexColors, skinning: !!o.isSkinnedMesh });
            out.name = m.name;
          }
          done.set(m, out); return out;
        };
        o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
        if (o.isSkinnedMesh && o.geometry){ o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere) o.geometry.boundingSphere.radius *= 1.6; }
      });
      const holder = new T.Group(); holder.name = 'CharacterModel';
      holder.add(scene);
      scene.rotation.y = this.cfg.CHARACTER_ROTATION_OFFSET || 0;
      holder.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(scene), h = Math.max(0.001, box.max.y - box.min.y);
      const s = (this.cfg.CHARACTER_HEIGHT || 2.35) / h * (this.cfg.CHARACTER_SCALE || 1);
      scene.scale.multiplyScalar(s);
      holder.updateMatrixWorld(true);
      const box2 = new T.Box3().setFromObject(scene);
      scene.position.y += -box2.min.y + (this.cfg.CHARACTER_Y_OFFSET || 0);   // pés no chão + ajuste
      return holder;
    }

    // Cria o personagem de um jogador (clone do modelo em cache + animações + âncoras).
    createView(opts){
      if (!this.ready) return null;
      const T = this.THREE, root = new T.Group(); root.rotation.order = 'YXZ';
      const gender = opts && opts.gender === 'female' ? 'female' : 'male';
      const template = this.templates[gender] || this.templates.male || this.template;
      const model = T.SkeletonUtils.clone(template);
      root.add(model);
      const anim = new window.ClaudoniaAnimationManager(T, model, this.clips, this.cfg.clips);
      const view = { isGLB: true, root, model, anim, opts: opts || {}, dist: 0, acc: 0, local: false };
      this.equipment.createAnchors(view);
      if (this.shadows && this.cfg.realShadowOnlyLocal === false) model.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.views.add(view);
      return view;
    }
    // Marca o personagem do próprio jogador: anima todo quadro, faz sombra real e registra as trocas de estado.
    setLocal(view){
      if (!view) return;
      view.local = true;
      const cast = this.shadows;
      view.model.traverse(o => { if (o.isMesh) o.castShadow = cast; });
      Object.values(view.equipment || {}).forEach(e => (Array.isArray(e) ? e : [e]).forEach(x => x && x.traverse(o => { if (o.isMesh) o.castShadow = cast; })));
      view.anim.onChange = (a, b) => console.info(`[Character] State: ${a} -> ${b}`);
    }
    setPosition(view, x, y, z){ view.root.position.set(x, y, z); }
    setRotation(view, yaw){ view.root.rotation.y = yaw; }
    setVisible(view, visible){ view.root.visible = visible; }

    // Atalhos para os equipamentos
    equip(view, slot, obj){ return this.equipment.equip(view, slot, obj); }
    equipSkinned(view, slot, scene){ return this.equipment.equipSkinned(view, slot, scene); }

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
