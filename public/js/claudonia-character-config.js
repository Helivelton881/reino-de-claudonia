// Reino De Claudonia - configuração dos personagens 3D (modelos GLB/GLTF rigados).
// TODOS os números de personagem ficam aqui (nada de números mágicos espalhados pelo código).
//
// USE_NEW_CHARACTER_MODEL
//   true  = usa o modelo GLB com esqueleto e animações (quando ele carrega).
//   false = usa o personagem procedural antigo (makeLegacyHero, dentro do index.html).
// Se o GLB não existir ou der erro, o jogo volta sozinho para o personagem antigo.
//
// Testes pelo endereço do jogo (não precisa mexer em código):
//   ?personagem=antigo       força o personagem antigo
//   ?personagem=placeholder  usa o boneco de teste (placeholder_mannequin.glb)
//   ?personagem=glb          força tentar o modelo principal
//   ?debug=1                 mostra as trocas de animação no console
(function(){
  // Resumo do personagem principal (o resto da configuração fica logo abaixo).
  // Modelo atual: "Ranger" do pacote KayKit Adventurers 2.0 FREE (Kay Lousberg, licença CC0),
  // já com as animações do mesmo pacote dentro do arquivo. Origem e licença:
  // public/assets/vendor/kaykit/README.md
  const CHARACTER_CONFIG = {
    useGLB: true,
    model: '/assets/characters/base_male/base_male.glb',
    label: 'KayKit base male',
    scale: 1,
    yOffset: 0,
    rotationOffset: 0,
  };

  const cfg = {
    USE_NEW_CHARACTER_MODEL: CHARACTER_CONFIG.useGLB,

    // Modelo principal do jogador (definido no CHARACTER_CONFIG acima)
    model: CHARACTER_CONFIG.model,
    modelLabel: CHARACTER_CONFIG.label,

    // Boneco de TESTE (não é o visual do jogo). Só é usado se usePlaceholderIfMissing
    // for true ou se o endereço tiver ?personagem=placeholder.
    placeholder: 'assets/characters/placeholder_mannequin.glb',
    usePlaceholderIfMissing: false,

    // Animações em arquivos separados (opcional), com o MESMO esqueleto do personagem.
    // Ex.: 'assets/animations/base_locomotion.glb'
    animationFiles: [],

    /* ---------- Escala e posição (compatível com terreno, NPCs, monstros, câmera e colisões) ----------
       O modelo é medido e redimensionado para CHARACTER_HEIGHT (o personagem antigo tem ~2,35).
       CHARACTER_SCALE multiplica esse resultado (1 = igual ao antigo).
       CHARACTER_Y_OFFSET sobe/desce o modelo depois de apoiar os pés no chão.
       CHARACTER_ROTATION_OFFSET gira o modelo (radianos). O Blender já exporta com a frente
       (-Y do Blender) virada para +Z, que é a frente do jogo, então o normal é 0. */
    CHARACTER_HEIGHT: 2.35,
    CHARACTER_SCALE: CHARACTER_CONFIG.scale,
    CHARACTER_Y_OFFSET: CHARACTER_CONFIG.yOffset,
    CHARACTER_ROTATION_OFFSET: CHARACTER_CONFIG.rotationOffset,

    // Materiais: 'lambert' deixa o personagem com a mesma luz do resto do jogo e mais leve.
    // 'original' mantém os materiais do arquivo (só no PC; no celular sempre vira 'lambert').
    materialMode: 'lambert',
    // Texturas maiores que isso são reduzidas ao carregar (poupa memória no celular).
    maxTextureSize: { desktop: 1024, mobile: 512 },
    // Sombra real (cara) só no seu próprio personagem; os outros usam a sombra redonda simples.
    realShadowOnlyLocal: true,

    // KayKit (arquivo atual): Idle_A, Walking_A, Running_A, Throw (golpe; o pacote grátis não
    // tem ataque de espada), Hit_A, Death_A, Jump_Start, Use_Item (magia), Idle_B (voo parado).
    // Nomes aceitos para cada animação (o primeiro que existir no arquivo). Maiúsculas,
    // espaços, "_" e prefixos como "Armature|" ou "mixamo.com" são ignorados na comparação.
    clips: {
      Idle:       ['Idle_A', 'Idle', 'Parado', 'Idle_Loop', 'Breathing Idle'],
      Walk:       ['Walking_A', 'Walk', 'Andar', 'Walking', 'Walk_Loop'],
      Run:        ['Running_A', 'Run', 'Correr', 'Running', 'Run_Loop', 'Sprint'],
      Attack:     ['Attack_01', 'Attack', 'Ataque', 'Attack1', 'Slash', 'Sword_Attack', 'Throw'],
      Hit:        ['Hit_A', 'Hit', 'Dano', 'HitReact', 'Hit_Reaction', 'Damage'],
      Death:      ['Death_A', 'Death', 'Morte', 'Die', 'Dying'],
      Jump:       ['Jump', 'Pulo', 'Jump_Start', 'Jumping'],
      Cast:       ['Cast', 'Magia', 'Spell', 'Spellcast', 'Cast_Spell', 'Use_Item'],
      FlyIdle:    ['FlyIdle', 'Fly_Idle', 'VooParado', 'Hover', 'Idle_B'],
      FlyForward: ['FlyForward', 'Fly_Forward', 'VooFrente', 'Fly'],
    },

    /* ---------- Encaixes (anchors) para equipamentos visíveis ----------
       Para cada encaixe: a lista de ossos procurados (o primeiro que existir). Se achar o osso
       com o nome exato do encaixe (ex.: "Weapon_R"), usa posição 0. Se achar um osso parecido
       (ex.: a mão "Hand_R"), aplica boneOffset. Se não achar nenhum, cria uma âncora auxiliar
       presa à raiz do personagem em fallbackPosition (em unidades do jogo; a frente é +Z e o
       lado direito do personagem é -X). Assim nada quebra, mesmo sem os ossos. */
    anchors: {
      // slotBones: ossos que JÁ são o ponto de pegada (ex.: handslot.r do KayKit): a arma vai
      // direto neles, sem deslocamento nem giro.
      Weapon_R: { slotBones: ['handslot.r'], bones: ['Weapon_R', 'Hand_R', 'hand.R', 'DEF-hand.R', 'RightHand', 'mixamorigRightHand', 'hand_r'],
                  boneOffset: [0, 0.08, 0.02], rotation: [0, 0, 0], fallbackPosition: [-0.36, 0.95, 0.12] },
      Weapon_L: { slotBones: ['handslot.l'], bones: ['Weapon_L', 'Hand_L', 'hand.L', 'DEF-hand.L', 'LeftHand', 'mixamorigLeftHand', 'hand_l'],
                  boneOffset: [0, 0.08, 0.02], rotation: [0, 0, 0], fallbackPosition: [0.36, 0.95, 0.12] },
      Back:     { bones: ['Back', 'Chest', 'spine.003', 'DEF-spine.003', 'Spine2', 'mixamorigSpine2', 'spine_03', 'Spine'],
                  boneOffset: [0, 0.05, -0.18], rotation: [0, 0, 0.7], fallbackPosition: [0, 1.55, -0.28] },
      Chest:    { bones: ['Chest', 'spine.003', 'DEF-spine.003', 'Spine2', 'mixamorigSpine2', 'spine_03', 'Spine'],
                  boneOffset: [0, 0.02, 0.12], rotation: [0, 0, 0], fallbackPosition: [0, 1.35, 0.12] },
      Head:     { bones: ['Head', 'head', 'DEF-spine.006', 'mixamorigHead'],
                  boneOffset: [0, 0, 0], rotation: [0, 0, 0], fallbackPosition: [0, 2.05, 0] },
    },
    // Slots de equipamento e onde cada um se prende. "skinned" = peça que deforma com o corpo
    // (feita no mesmo esqueleto, ligada pelos nomes dos ossos). As outras vão numa âncora.
    slots: {
      head:   { anchor: 'Head' },
      hair:   { anchor: 'Head', skinned: true },
      chest:  { skinned: true },
      hands:  { skinned: true },
      legs:   { skinned: true },
      feet:   { skinned: true },
      weapon:    { anchor: 'Weapon_R' },
      offhand:   { anchor: 'Weapon_L' },
      back:      { anchor: 'Back' },
      cape:      { anchor: 'Back' },
      chestRigid:{ anchor: 'Chest' },
    },
    // Armas em GLB (futuro). Enquanto a lista estiver vazia, o jogo usa as armas antigas
    // (weaponMesh). Quando os arquivos existirem, basta preencher, por exemplo:
    //   guerreiro: 'assets/weapons/sword_01.glb', arqueiro: 'assets/weapons/bow_01.glb',
    //   mago: 'assets/weapons/staff_01.glb', druida: 'assets/weapons/staff_01.glb', aprendiz: 'assets/weapons/sword_01.glb'
    weaponModels: {
      aprendiz: 'assets/weapons/kaykit_sword_1handed.glb', guerreiro: 'assets/weapons/kaykit_sword_1handed.glb',
      mago: 'assets/weapons/kaykit_staff.glb', druida: 'assets/weapons/kaykit_staff.glb',
      arqueiro: 'assets/weapons/kaykit_bow.glb',
    },
    // Partes do modelo que só aparecem em algumas classes (nome da malha -> classes).
    classOnlyMeshes: { Ranger_Quiver: ['arqueiro'] },

    // Economia de bateria: distância (metros do jogo) em que os outros jogadores animam
    // com menos frequência ou somem.
    mobile: { fullRateDistance: 25, lowRateDistance: 70, hideDistance: 120 },
    desktop: { fullRateDistance: 60, lowRateDistance: 120, hideDistance: 200 },
  };

  try {
    const q = new URLSearchParams(location.search);
    const p = q.get('personagem');
    if (p === 'antigo') cfg.USE_NEW_CHARACTER_MODEL = false;
    if (p === 'glb') cfg.USE_NEW_CHARACTER_MODEL = true;
    if (p === 'placeholder'){ cfg.USE_NEW_CHARACTER_MODEL = true; cfg.model = cfg.placeholder; cfg.modelLabel = null; }
    cfg.debug = q.get('debug') === '1';
  } catch (e) {}

  window.CLAUDONIA_CHARACTER_CONFIG = cfg;
})();
