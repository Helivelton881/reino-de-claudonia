# Reino De Claudonia

MMORPG 3D de navegador. O dono quer a jogabilidade e o clima **o mais perto
possível do Flyff Universe** (https://universe.flyff.com): regras, sistemas,
fórmulas e o jeito da interface (retrato redondo, barras HP/MP/FP, minimapa com
aro, botões redondos, chat embaixo, mundo de outono). Mas nomes, arte, mapas,
ícones e textos são todos originais: não copiar nada do Flyff além das regras.
Antes de criar um sistema, pesquisar como ele funciona no Flyff Universe.

## Sobre o dono do projeto
- Não programa. Explique tudo em português simples e faça as mudanças você mesmo.
- Regra de ouro: não mexer no que já funciona; só adicionar o que foi pedido.
- Testa no PC e no celular. Tudo precisa funcionar com toque (joystick e botões).

## Onde as coisas estão
- Código: https://github.com/Helivelton881/reino-de-claudonia (branch `main`).
- Servidor: Render, serviço `reino-de-claudonia` (plano gratuito), publica
  sozinho a cada push na `main`. Endereço: https://reino-de-claudonia.onrender.com
- Banco e login: Supabase, projeto "Reino De Claudonia" (região São Paulo).
- Variáveis no Render: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (chave pública) e
  `NODE_VERSION=22`. Nenhuma chave secreta é usada; não coloque chaves no código.

## Arquitetura
- `public/index.html`: o jogo inteiro (Three.js r128 pelo cdnjs, supabase-js
  pelo jsdelivr). Mundo 3D, HUD, janelas, login e escolha de personagem.
  - Mundo: continente de raio 330 (`R`), vila no centro, 13 regiões em `ZONES`
    (caminhos de terra até cada uma), lago, serra na borda, ilhotas voadoras (pousáveis).
    `public/js/world-collision-map.js` exporta `heightAt` com o mesmo relevo do cliente
    (`TERRAIN_R` = 330) e usa o raio antigo 185 só para gerar árvores/arbustos/pedras sólidos
    nas mesmas posições (`layoutHeightAt`). Servidor e cliente escolhem ilhota ou chão pela altura.
  - Objetos parados da vila são "assados" em 2 malhas (`bake`/`finishBake`);
    vegetação usa InstancedMesh; peças dos monstros viram 1 a 3 malhas
    (`mergeBody`). Isso mantém o celular leve; siga esse padrão.
  - Colisões numa grade (`addCollider`, `colAt`), não num array percorrido.
  - Visual: sombreado suave (Lambert), sombras reais só no PC (`HQ`).
  - Vegetação, objetos da vila e 2 monstros vêm dos kits da Quaternius (versão 0.10), já
    otimizados em `public/assets/world/` (nature.glb, props.glb, monsters/*.glb) por
    `tools/otimizar_kits_quaternius.mjs`. Origem e licenças: `public/assets/vendor/quaternius/`.
    `public/js/world-asset-manager.js` desenha cada modelo com InstancedMesh em blocos de 80 m
    (cada bloco some longe da câmera; o celular desenha menos longe). As posições são calculadas
    no index.html (`VEG`, `trees`, `PROPS_AT`), iguais para todos, com colisão na hora.
    Folhas e grama vêm cinza no arquivo e recebem a cor de cada árvore (outono).
    Quatro construções abertas mobiliadas: `OPEN_HALLS` (taverna, forja, alquimista, estalagem).
    Orçamento medido: celular ~540 desenhos e ~1,1 milhão de triângulos por quadro.
- Personagens GLB rigados (versão 0.7): `public/js/claudonia-character-config.js`
  (chave `USE_NEW_CHARACTER_MODEL`, caminhos, nomes das animações, ossos dos
  encaixes), `public/js/character-manager.js` e `public/js/animation-manager.js`
  (AnimationMixer, 10 estados). O modelo principal é
  `public/assets/characters/base_male/base_male.glb`: o "Ranger" do KayKit Adventurers 2.0
  FREE (Kay Lousberg, CC0), com as animações do pacote dentro (Idle_A, Walking_A, Running_A,
  Throw = ataque, Hit_A, Death_A, Jump_Start, Use_Item = magia). Origem e licença em
  `public/assets/vendor/kaykit/`. Armas KayKit em `public/assets/weapons/kaykit_*.glb`.
  Se o GLB faltar, o jogo usa o `makeLegacyHero` como reserva. Boneco de teste: `?personagem=placeholder`
  (gerado por `tools/gerar_placeholder_glb.js`). Diagnóstico: `?debug=1`.
  Os NPCs e moradores continuam com `makeLegacyHero` (o antigo `makeHero`, reserva do GLB).
  Equipamentos: `public/js/equipment-manager.js` (slots, âncoras Weapon_R/Weapon_L/Back/Head,
  armas GLB em `weaponModels`). Escala: `CHARACTER_HEIGHT/SCALE/Y_OFFSET/ROTATION_OFFSET`.
  Logs com prefixo `[Character]`. Teste de ponta a ponta: Chrome invisível com a placa de vídeo
  (`--use-angle=d3d11`); sem placa de vídeo roda a ~1 quadro por segundo.
- Scripts `blender_etapa_*.py` na raiz são do dono (modelagem no Blender);
  não mexer e não enviar ao GitHub sem ele pedir.
- Blender MCP é obrigatório a partir da Fase 9 para qualquer asset 3D novo ou
  retrabalho visual. Primitivas podem existir apenas como blockout interno; o
  resultado integrado deve ter silhueta trabalhada, detalhes, materiais,
  proporção/pivô revisados e acabamento consistente com MMORPG. Não integrar
  cubos/placeholders ou modelagem provisória como arte final.
- `server.js`: Node.js + Express + ws. Confere o login no Supabase, repassa
  posições (10 vezes por segundo), chat e salva o personagem a cada 15 s.
  O servidor usa o token do próprio jogador, então o banco (RLS) só deixa
  cada conta mexer nos próprios personagens. Cuida também de: grupo (em
  memória: nível, pontos, modo de EXP, habilidades), troca e loja pessoal
  (confere os itens contra os dados salvos e aplica nos dois) e guilda (no banco).
- `supabase/001_ilha_verde.sql`: tabela `iv_personagens` (nome único,
  `dados` em JSON com nível, atributos, classe, itens e equipamento), limite
  de 3 personagens por conta.
- `supabase/002_guildas.sql` e `003_guilda_niveis.sql`: guildas, membros,
  convites, nível da guilda, contribuição, cargos e as funções
  `iv_guilda_doar` e `iv_guilda_cargo`. Funções de apoio no schema
  `iv_privado` (fora da API). Os dois já estão aplicados no Supabase.
- Itens aprimorados: na mochila a linha tem `up` (1 a 10); no corpo o nível
  fica em `dados.equp[slot]`. `dados.upPity` guarda as falhas seguidas.

## Estado atual
- Fases 1 a 5: mundo aberto contínuo, login/multiplayer, classes, voo, grupo,
  guilda, troca, loja pessoal, equipamentos, economia e upgrade +1 a +10.
- Fase 6: movimento, colisão, combate, monstros, dano, HP, EXP, loot e respawn
  são server-authoritative. Jogador, NPC e monstros usam A* sobre o mesmo mapa
  físico compartilhado; servidor bloqueia speedhack, teleporte e atravessar obstáculos.
- Fase 7.1: QuestManager data-driven e server-authoritative; provas das quatro
  classes migradas; aceitar, abandonar, concluir e progresso são validados no servidor.
- Fase 7.2: diário de missões, atalho J, botão mobile e marcadores !/? no mundo
  e minimapa.
- Fase 7.3: jornada original nível 1-15 com 12 quests e objetivos talk, kill,
  explore, delivery e collect; provas de classe exigem jornada concluída.
- Fase 7.4: jornada pós-classe nível 15-20 com 6 quests, tracker HUD,
  navegação ao objetivo, beacon 3D e marcador de objetivo no minimapa.
- Fase 7.5: cadeia nível 20-28 na Trilha dos Lobos com 7 novas quests e o NPC
  regional Vigia Cael. O modelo `npc_vigia_cael.glb` foi criado no Blender e
  integrado com fallback para o personagem legado.
- Fase 7.6: cadeia nível 29-37 na Mata das Teias com 7 novas quests e a NPC
  regional Batedora Maelis. O modelo `npc_batedora_maelis.glb` foi criado no
  Blender e integrado pelo carregador GLTF dos NPCs regionais.
- Fase 7.7: cadeia nível 38-47 no Lago Espelhado com 7 novas quests e a NPC
  regional Guardiã Neris. O modelo `npc_guardia_neris.glb` foi criado no Blender
  e integrado pelo mesmo carregador GLTF dos NPCs regionais.
- Fase 7.8: cadeia nível 48-60 nas Ruínas do Ciclope com 7 novas quests e o NPC
  regional Sentinela Oren. O modelo `npc_sentinela_oren.glb` foi criado no Blender
  e integrado pelo carregador GLTF dos NPCs regionais.
- Fase 7.9: camada de conteúdo paralelo com 4 side quests e 4 missões diárias
  repetíveis. As diárias usam cooldown server-authoritative de 24 horas, estado
  persistido em `quests.lastCompletedAt`, aba própria no diário e contador de
  disponibilidade no NPC. Nesta subfase foram reutilizados NPCs já existentes,
  portanto nenhum asset 3D novo foi necessário.
- Fase 7.10: fechamento do Quest & NPC Engine com 15 novos NPCs originais
  distribuídos pela vila e rotas regionais. Todos os 15 modelos foram criados no
  Blender e integrados como GLB. Entraram serviços data-driven de cura,
  suprimentos, registro social/guilda e guias de rota. Cura e compras usam
  validação server-authoritative de proximidade e whitelist por NPC.
- A engine também passou a cobrir objetivos `use-item` e `boss`, completando os
  tipos previstos para a Fase 7. Duas side quests usam esses objetivos.
- Progressão principal da Fase 7 cobre do nível 1 ao 60.
- Catálogo atual: 60 quests (46 de história + 6 side + 4 diárias + 4 provas) e
  25 NPCs funcionais.
- Fase 8 concluída: Classes, Especializações e Skill Tree agora são
  server-authoritative e data-driven. O catálogo possui 42 skills com custo,
  cooldown, range, alvo, requisitos, ranks e dependências. Skill points são
  separados dos atributos; `SkillManager` v2 controla migração, orçamento,
  investimento, respec junto ao mestre da classe e bloqueios anti-cheat.
- O combate cobre skills ativas e passivas, buffs, debuffs, DoT, root/stun,
  taunt, cura, cura em party e buffs de party. Monstros respeitam crowd control,
  debuffs e DoT no servidor. Passivas e especializações alteram atributos
  derivados sem confiar no cliente.
- Existem 8 especializações originais no nível 60: Guerreiro -> Guardião/Duelista;
  Druida -> Sacerdote/Monge; Mago -> Arcanista/Elementalista; Arqueiro ->
  Caçador/Atirador. Cada caminho possui papel e skills próprias, e o HUD de grupo
  exibe especialização/papel para reforçar tank, heal/support, melee DPS,
  ranged DPS e controle.
- A UI da Skill Tree mostra árvore base e ramificações, comparação entre ranks,
  confirmação de investimento/especialização e barra configurável de 3 skills,
  com atalho K. VFX desta fase usam apenas efeitos matemáticos/rings já existentes;
  portanto nenhum novo asset 3D foi necessário e o Blender não gerou GLB novo.
- Fase 9 concluída no código local: itemização server-authoritative e data-driven em
  `server/data/items/*` + `ItemManager`. O catálogo foi ampliado para 165 equipamentos,
  com raridades Comum/Incomum/Raro/Épico/Lendário, fontes NPC/common/Giant/dungeon/boss,
  slots arma/off-hand/capacete/peitoral/luvas/botas/capa/acessórios/voo, 12 sets de
  classe com bônus 2/3/4 peças, affixes por faixa de nível, sockets/cards, lock/favorito,
  filtros, comparação, banco 32/60 e upgrade +1..+10 rebalanceado por raridade + pity.
- Equipamentos únicos carregam `uid`, affixes, sockets, flags e upgrade em inventário,
  storage, equipamento, troca e loja pessoal sem confiar no cliente. Gear visível é
  sincronizado para outros jogadores e usa GLBs pelo `EquipmentManager`.
- Blender/MCP produziu 20 famílias visuais originais e leves para a Fase 9 em
  `public/assets/equipment/phase9/`: 4 armas, 4 off-hands, 4 capacetes, 4 peitorais e
  4 capas. O maior arquivo fica abaixo de 256 KB. Armas, off-hands e capacetes usam
  metadados de `modelScale`/posição/quaternion validados no personagem GLB para não
  entrar gigantes, atravessados ou desalinhados no gameplay.
- QA atual: 118 testes automatizados passando. A suíte da Fase 9 cobre catálogo,
  raridades/fontes/slots, affixes, set bonus, requisito nível/classe, mochila cheia,
  lock/favorito, banco, sockets, compra NPC, drop com metadata/UID, upgrade
  lendário/pity/quebra, assets e UI. Antes da Fase 10, o inventário recebeu rework
  visual baseado em referência Canva: janela larga fantasy, busca, tabs, 40 slots
  visuais (32 ativos + 8 bloqueados), paper doll com 10 slots e viewport 3D real
  do personagem/equipamentos, com rotação por arraste e layout responsivo mobile;
  landscape baixo (ex.: 926x428) usa composição compacta sem overflow ou distorção.
- Produção da Fase 9 foi validada no Render: catálogo 165, 12 sets, 5 raridades,
  `itemState` sincronizado, personagem GLB ativo, WebGL íntegro e 20/20 famílias
  visuais carregadas no gameplay online sem erro JS ou request falho.
- Fase 9.1: rework da janela de Habilidades com referência Canva
  `DAHWrUd5IMQ` (`Reino de Claudonia — Habilidades UI Reference`). A UI agora usa
  progressão visual por classe/especialização, árvore data-driven horizontal,
  detalhes de rank atual/próximo, PdH/custo/nível, barra de combo, Finalizar,
  Resetar e controles + / máx. O `máx.` envia somente a intenção `learnMax` e o
  servidor calcula quantos ranks podem ser aplicados; respec continua exigindo
  proximidade do mestre. Desktop, portrait e landscape baixo possuem layouts
  dedicados. Nenhum asset 3D novo foi necessário nesta subfase.
- Fase 9.2: as 42 habilidades agora possuem ícones SVG próprios em
  `public/assets/ui/skills/`, sem siglas como arte final. A mesma imagem é reutilizada
  na árvore, painel de detalhes, barra de combo, hotbar e buffs. As paletas distinguem
  Aprendiz/Guerreiro/Druida/Mago/Arqueiro e cada skill possui pictograma coerente com
  sua função. Os SVGs são leves (menos de 6 KB cada), vetoriais e responsivos.
  Esta etapa é UI 2D, portanto não exigiu Blender/GLB.

## Estado operacional atual (Fases 10–17)
- Fases 10–13 concluídas: ecossistema PvE/Giants/World Bosses, dungeon cooperativa, pets/social e expansão/revitalização do mundo, mantendo servidor autoritativo e assets 3D otimizados.
- Fase 14 concluída: PvP/Guild endgame e integrações competitivas sobre a base server-authoritative.
- Fase 15 concluída: Lifestyle com coleta, crafting, profissões, materiais de Giant/dungeon, reparo e sinks econômicos.
- Fase 16 concluída: Live Ops com achievements, objetivos diários/semanais, temporada gratuita, calendário/eventos rotativos e telemetria server-side.
- Fase 17 concluída no código: camada operacional com observabilidade, rate limiting/validação WebSocket, Admin auditado (inspect/mute/kick/ban), migration/rollback documentados, load test, asset budget, regressão multiplataforma e PWA. Métricas privadas não são expostas por HTTP público.
- Segurança operacional: mensagens WebSocket passam por token-bucket por tipo; operações críticas continuam validadas pelos managers server-side. Admin exige simultaneamente UUID autorizado de conta e personagem.
- PWA: manifest + service worker cacheiam somente shell/assets GET; API, WebSocket e Supabase/auth nunca entram no cache offline.
- Banco: migrations novas são versionadas em `supabase/`; nunca editar migration aplicada. Procedimento em `docs/OPERATIONS_PHASE17.md`.

## Limites conhecidos (próximos passos)
- As Fases 7, 8 e 9 estão formalmente fechadas e publicadas.
- Pré-Fase 10 UI: inventário e Habilidades foram concluídos. Referências editáveis
  Canva: inventário `DAHWrK1NTLE` e Habilidades `DAHWrUd5IMQ`. A implementação
  runtime continua própria do Reino de Claudonia e usa dados/regras atuais do jogo.
- Fases 10 a 17 já foram implementadas; o trabalho seguinte deve ser tratado como manutenção, conteúdo incremental, balanceamento, performance e operação contínua, não como retorno à Fase 10.
- Qualquer novo NPC, monstro, boss, arma, armadura, pet, montaria, prop ou objeto
  3D de skill continua passando pelo Blender aberto no PC antes de entrar no jogo.

## Como testar antes de enviar
- `node --check server.js` e conferir a sintaxe do script do `index.html`.
- Rodar local: `npm install` e depois `npm start` com as duas variáveis do
  Supabase; abrir http://localhost:3000.
- Para testar multiplayer sem mexer no banco real, dá para usar um Supabase
  falso local (login + tabelas em memória) e abrir duas abas com endereços
  diferentes (localhost e 127.0.0.1) para ter duas contas ao mesmo tempo.
- Regras do banco: testar dentro de uma transação que termina desfeita.
- Depois do push, conferir os registros do Render.
