// Reino De Claudonia - AnimationManager
// Controla as animações de UM personagem com THREE.AnimationMixer, usando uma máquina de estados:
//   estados de base (repetem): Idle, Walk, Run, FlyIdle, FlyForward, Jump, Death
//   estados de ação (tocam uma vez e voltam para a base): Attack, Hit, Cast
// O jogo chama setState() todo quadro com o estado de base e trigger() quando algo acontece
// (golpe, dano, magia). Se o arquivo não tiver alguma animação, usa uma parecida (fallback).
(function(){
  const STATES = ['Idle', 'Walk', 'Run', 'Attack', 'Hit', 'Death', 'Jump', 'Cast', 'FlyIdle', 'FlyForward'];
  const ONE_SHOT = { Attack: true, Hit: true, Cast: true };
  const CLAMP = { Death: true, Jump: true };             // tocam uma vez e ficam no último quadro
  const PRIORITY = { Death: 100, Hit: 60, Attack: 50, Cast: 50 };
  const FALLBACK = {
    Run: ['Walk', 'Idle'], Walk: ['Idle'], FlyForward: ['FlyIdle', 'Run', 'Idle'], FlyIdle: ['Idle'],
    Cast: ['Attack', 'Idle'], Attack: ['Idle'], Hit: ['Idle'], Jump: ['Idle'], Death: ['Idle'], Idle: [],
  };
  const norm = s => String(s || '').toLowerCase().replace(/^.*\|/, '').replace(/mixamo\.com|armature|action/g, '').replace(/[^a-z0-9]/g, '');

  class AnimationManager {
    constructor(THREE, root, clips, aliases, opts){
      this.THREE = THREE;
      this.mixer = new THREE.AnimationMixer(root);
      this.actions = {};          // estado -> AnimationAction (já com fallback resolvido)
      this.found = {};            // estado -> nome do clipe encontrado (ou null)
      this.fade = (opts && opts.fade) || 0.18;
      this.base = 'Idle'; this.current = null; this.oneShot = null;
      const byName = new Map();
      (clips || []).forEach(c => { if (!byName.has(norm(c.name))) byName.set(norm(c.name), c); });
      const direct = {};
      STATES.forEach(st => {
        const names = [st].concat((aliases && aliases[st]) || []);
        const clip = names.map(n => byName.get(norm(n))).find(Boolean) || null;
        direct[st] = clip; this.found[st] = clip ? clip.name : null;
      });
      STATES.forEach(st => {
        let clip = direct[st];
        // a reserva precisa ser do mesmo tipo (repetição x uma vez), senão as duas dividiriam o mesmo controle
        const once = s => !!(ONE_SHOT[s] || CLAMP[s]);
        if (!clip) for (const alt of FALLBACK[st]) if (direct[alt] && once(alt) === once(st)){ clip = direct[alt]; break; }
        if (!clip) return;
        const a = this.mixer.clipAction(clip);
        if (ONE_SHOT[st] || CLAMP[st]){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
        else a.setLoop(THREE.LoopRepeat, Infinity);
        this.actions[st] = a;
      });
      this.mixer.addEventListener('finished', e => {
        if (this.oneShot && e.action === this.actions[this.oneShot]){ this.oneShot = null; this._go(this.base); }
      });
      this._go('Idle', true);
    }
    // Quais estados têm animação própria no arquivo (para conferir o modelo)
    report(){ return STATES.map(s => `${s}: ${this.found[s] || '(usa reserva)'}`).join(', '); }
    has(state){ return !!this.actions[state]; }

    // Estado de base (chamado todo quadro). Não interrompe uma ação que ainda está tocando,
    // a não ser a morte.
    setState(state, opts){
      if (!STATES.includes(state)) return;
      this.base = state;
      const speed = opts && opts.speed;
      if (speed && this.current === state && this.actions[state]) this.actions[state].timeScale = speed;
      if (this.oneShot && state !== 'Death') return;
      if (state === 'Death') this.oneShot = null;
      if (this.current !== state) this._go(state);
    }
    // Ação que toca uma vez (Attack, Hit, Cast). restart=true reinicia se já estiver tocando.
    trigger(state){
      if (!ONE_SHOT[state] || !this.actions[state]) return;
      if (this.base === 'Death') return;
      if (this.oneShot && (PRIORITY[this.oneShot] || 0) > (PRIORITY[state] || 0)) return;
      this.oneShot = state;
      this._go(state, false, true);
    }
    _go(state, instant, restart){
      const next = this.actions[state]; if (!next) { this.current = state; return; }
      const prev = this.current && this.actions[this.current];
      if (prev === next && !restart){ this.current = state; return; }
      next.reset(); next.enabled = true; next.setEffectiveWeight(1); next.timeScale = next.timeScale || 1;
      next.play();
      if (prev && prev !== next && !instant) prev.crossFadeTo(next, this.fade, false);
      else if (prev && prev !== next) prev.stop();
      this.current = state;
    }
    update(dt){ this.mixer.update(dt); }
    dispose(){ this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.mixer.getRoot()); }
  }
  AnimationManager.STATES = STATES;
  window.ClaudoniaAnimationManager = AnimationManager;
})();
