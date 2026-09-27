# Reino De Claudonia

MMORPG 3D de navegador, com a jogabilidade inspirada no Flyff Universe. Nomes,
arte, mapas e textos são todos originais: não copiar nada do Flyff além das
regras de jogo.

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
- `server.js`: Node.js + Express + ws. Confere o login no Supabase, repassa
  posições (10 vezes por segundo), chat e salva o personagem a cada 15 s.
  O servidor usa o token do próprio jogador, então o banco (RLS) só deixa
  cada conta mexer nos próprios personagens. Também cuida de grupo (em
  memória), troca (confere a oferta contra os dados salvos e aplica nos
  dois) e guilda (no banco).
- `supabase/001_ilha_verde.sql`: tabela `iv_personagens` (nome único,
  `dados` em JSON com nível, atributos, classe, itens e equipamento), limite
  de 3 personagens por conta.
- `supabase/002_guildas.sql`: `iv_guildas`, `iv_guilda_membros` e
  `iv_guilda_convites`. Só entra quem o líder convidou; funções de apoio no
  schema `iv_privado` (fora da API). Já aplicado no Supabase.
- Itens aprimorados: na mochila a linha tem `up` (1 a 10); no corpo o nível
  fica em `dados.equp[slot]`.

## Estado atual (fases do documento de design)
- Fase 1: ilha 3D, personagem, câmera, controles de PC e celular. Pronta.
- Fase 2: monstros por zona, ataque por alvo, EXP, drops, mochila, janela
  Herói com atributos STR/STA/DEX/INT. Pronta.
- Fase 3: login, personagens, multiplayer (ver outros e chat). No ar.
- Fase 4: classes no nível 15 (Guerreiro, Druida, Mago, Arqueiro) com prova
  de materiais, 3 habilidades por classe, Golem de Musgo (níveis 16 a 20),
  voo com prancha ou vassoura no nível 20, Piloto Tito (loja). No ar
  (confirmado no Render em 27/09/2026).
- Fase 5: Ferreira Brunna na vila (aprimorar +1 a +10 com Pedra de
  Aprimoramento, comprar e vender equipamento), troca entre jogadores,
  grupo de até 8 (30% da EXP para quem está perto, chat `/g`), guilda de até
  30 (criar custa 1.000 de ouro no nível 15, chat `/gu`). Tocar em outro
  jogador abre o menu. Testada em 27/09/2026 com um Supabase falso local.

## Limites conhecidos (próximos passos)
- Os monstros ainda rodam no navegador de cada jogador: cada um vê os seus.
  Próximo passo: monstros, dano e drops decididos no servidor, o que também
  impede trapaças (hoje o servidor confia nos dados que o jogo manda).
- Grupo não é salvo: some quando alguém recarrega a página.
- Fase 6: novas regiões, masmorras com chefe, subclasses e mascotes.

## Como testar antes de enviar
- `node --check server.js` e conferir a sintaxe do script do `index.html`.
- Rodar local: `npm install` e depois `npm start` com as duas variáveis do
  Supabase; abrir http://localhost:3000.
- Depois do push, conferir os registros do Render.
