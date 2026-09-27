// Reino De Claudonia - configuração dos personagens 3D (modelos GLB/GLTF rigados).
//
// USE_NEW_CHARACTER_MODEL
//   true  = usa o modelo GLB com esqueleto e animações (quando ele carrega).
//   false = usa o personagem procedural antigo (makeHero, feito dentro do index.html).
// Se o GLB não existir ou der erro, o jogo volta sozinho para o personagem antigo.
//
// Testes pelo endereço do jogo (não precisa mexer em código):
//   ?personagem=antigo       força o personagem antigo
//   ?personagem=placeholder  usa o boneco de teste (placeholder_mannequin.glb)
//   ?personagem=glb          força tentar o modelo principal
(function(){
  const cfg = {
    USE_NEW_CHARACTER_MODEL: true,

    // Modelo principal do jogador. Coloque aqui o seu arquivo exportado do Blender.
    model: 'assets/characters/base_male.glb',

    // Boneco de TESTE (não é o visual do jogo). Só é usado se usePlaceholderIfMissing
    // for true ou se o endereço tiver ?personagem=placeholder.
    placeholder: 'assets/characters/placeholder_mannequin.glb',
    usePlaceholderIfMissing: false,

    // Animações em arquivos separados (opcional). Cada arquivo pode ter várias animações;
    // os nomes são reconhecidos pela tabela "clips" abaixo. Ex.: 'assets/animations/base_locomotion.glb'
    animationFiles: [],

    // Altura do personagem dentro do jogo (o personagem antigo tem ~2,35). O modelo é
    // redimensionado automaticamente para essa altura, qualquer que seja a escala do Blender.
    targetHeight: 2.35,
    // Giro extra (em radianos) se o modelo estiver olhando para o lado errado.
    // O exportador do Blender já deixa a frente (-Y do Blender) virada para +Z, que é a frente do jogo.
    rotationY: 0,

    // Materiais: 'lambert' deixa o personagem com a mesma luz do resto do jogo e mais leve
    // no celular. 'original' mantém os materiais do arquivo (só no PC).
    materialMode: 'lambert',

    // Nomes aceitos para cada animação (primeiro que existir no arquivo). Maiúsculas,
    // espaços, "_" e prefixos como "Armature|" ou "mixamo.com" são ignorados na comparação.
    clips: {
      Idle:       ['Idle', 'Parado', 'Idle_Loop', 'Breathing Idle'],
      Walk:       ['Walk', 'Andar', 'Walking', 'Walk_Loop'],
      Run:        ['Run', 'Correr', 'Running', 'Run_Loop', 'Sprint'],
      Attack:     ['Attack', 'Ataque', 'Attack1', 'Slash', 'Sword_Attack'],
      Hit:        ['Hit', 'Dano', 'HitReact', 'Hit_Reaction', 'Damage'],
      Death:      ['Death', 'Morte', 'Die', 'Dying'],
      Jump:       ['Jump', 'Pulo', 'Jump_Start', 'Jumping'],
      Cast:       ['Cast', 'Magia', 'Spell', 'Spellcast', 'Cast_Spell'],
      FlyIdle:    ['FlyIdle', 'Fly_Idle', 'VooParado', 'Hover'],
      FlyForward: ['FlyForward', 'Fly_Forward', 'VooFrente', 'Fly'],
    },

    // Encaixes para equipamentos visíveis: nome do osso (vários nomes aceitos, do Blender,
    // Rigify ou Mixamo), mais posição e giro do objeto preso nele.
    sockets: {
      hand_r: { bones: ['Hand_R', 'hand.R', 'DEF-hand.R', 'RightHand', 'mixamorigRightHand', 'hand_r', 'Hand.R'], position: [0, 0.08, 0.02], rotation: [0, 0, 0] },
      hand_l: { bones: ['Hand_L', 'hand.L', 'DEF-hand.L', 'LeftHand', 'mixamorigLeftHand', 'hand_l', 'Hand.L'], position: [0, 0.08, 0.02], rotation: [0, 0, 0] },
      back:   { bones: ['Chest', 'spine.003', 'DEF-spine.003', 'Spine2', 'mixamorigSpine2', 'spine_03', 'Spine'], position: [0, 0.05, -0.18], rotation: [0, 0, 0.7] },
      head:   { bones: ['Head', 'head', 'DEF-spine.006', 'mixamorigHead'], position: [0, 0, 0], rotation: [0, 0, 0] },
    },

    // Celular: distância (em metros do jogo) a partir da qual os outros jogadores animam
    // com menos frequência ou somem, para economizar bateria.
    mobile: { fullRateDistance: 25, lowRateDistance: 70, hideDistance: 120 },
    desktop: { fullRateDistance: 60, lowRateDistance: 120, hideDistance: 200 },
  };

  try {
    const q = new URLSearchParams(location.search).get('personagem');
    if (q === 'antigo') cfg.USE_NEW_CHARACTER_MODEL = false;
    if (q === 'glb') cfg.USE_NEW_CHARACTER_MODEL = true;
    if (q === 'placeholder'){ cfg.USE_NEW_CHARACTER_MODEL = true; cfg.model = cfg.placeholder; }
  } catch (e) {}

  window.CLAUDONIA_CHARACTER_CONFIG = cfg;
})();
