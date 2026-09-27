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
  - Mundo: continente de raio 185 (`R`), vila no centro, 9 regiões em `ZONES`
    (caminhos de terra até cada uma), lago, serra na borda, ilhotas voadoras.
  - Objetos parados da vila são "assados" em 2 malhas (`bake`/`finishBake`);
    vegetação usa InstancedMesh; peças dos monstros viram 1 a 3 malhas
    (`mergeBody`). Isso mantém o celular leve; siga esse padrão.
  - Colisões numa grade (`addCollider`, `colAt`), não num array percorrido.
  - Visual: sombreado suave (Lambert), sombras reais só no PC (`HQ`), árvores de
    copa fofa, grama em cartões com textura desenhada, personagem procedural em
    estilo anime (`makeHero`, cabeça grande, rosto em textura).
- Personagens GLB rigados (versão 0.7): `public/js/claudonia-character-config.js`
  (chave `USE_NEW_CHARACTER_MODEL`, caminhos, nomes das animações, ossos dos
  encaixes), `public/js/character-manager.js` e `public/js/animation-manager.js`
  (AnimationMixer, 10 estados). O modelo principal é
  `public/assets/characters/base_male.glb` (ainda não existe: o jogo usa o
  `makeHero` como reserva). Boneco de teste: `?personagem=placeholder`
  (gerado por `tools/gerar_placeholder_glb.js`). Diagnóstico: `?debug=1`.
  Os NPCs e moradores continuam com `makeHero`.
- Scripts `blender_etapa_*.py` na raiz são do dono (modelagem no Blender);
  não mexer e não enviar ao GitHub sem ele pedir.
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
- Fases 1 a 4: ilha, combate, classes, voo, login e multiplayer. No ar.
- Fase 5 (versão 0.6.0, regras do Flyff):
  - Aprimoramento +1 a +10 com Pedras, Runa Menor/Maior e ouro. +1 e +2 sempre
    dão certo; no +3 a falha só gasta material; do +4 em diante o item quebra,
    a não ser com Pergaminho de Proteção. Pergaminho da Sorte +10%. Cada falha
    seguida +3%. Bônus: arma até +24%, armadura até +20% (tabela do Flyff).
  - Loja pessoal: o jogador senta e vende até 8 itens; outros tocam nele para comprar.
  - Grupo até 8: nível próprio, vira avançado no nível 10, pontos, 4 habilidades
    de 1 minuto, EXP dividida por nível ou por contribuição, bônus por membro.
  - Guilda: fundar exige nível 20, 10.000 de ouro e grupo com mais 2 pessoas;
    sobe de nível com doações de ouro e materiais; membros por nível (10 a 100);
    cargos Líder, Conselheiro (5), Capitão (10), Apoiador (20), Novato;
    +1% de EXP por nível da guilda (até 10%).
  - Visual novo e mundo grande com 9 regiões de monstros até o nível 60
    (Lobo Cinzento, Aranha da Mata, Espírito do Lago, Ciclope Rochoso novos),
    equipamentos dos níveis 25 a 55, moradores andando na vila, borboletas e pássaros.

## Limites conhecidos (próximos passos)
- Os monstros ainda rodam no navegador de cada jogador: cada um vê os seus.
  Próximo passo: monstros, dano e drops decididos no servidor, o que também
  impede trapaças (hoje o servidor confia nos dados que o jogo manda).
- Grupo e loja pessoal não são salvos: somem quando alguém recarrega a página.
- Próximas ideias no estilo Flyff: missões (quests), masmorras com chefe,
  subclasses, mascotes, conjuntos de equipamento, guerra de guildas.

## Como testar antes de enviar
- `node --check server.js` e conferir a sintaxe do script do `index.html`.
- Rodar local: `npm install` e depois `npm start` com as duas variáveis do
  Supabase; abrir http://localhost:3000.
- Para testar multiplayer sem mexer no banco real, dá para usar um Supabase
  falso local (login + tabelas em memória) e abrir duas abas com endereços
  diferentes (localhost e 127.0.0.1) para ter duas contas ao mesmo tempo.
- Regras do banco: testar dentro de uma transação que termina desfeita.
- Depois do push, conferir os registros do Render.
