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
  cada conta mexer nos próprios personagens.
- `supabase/001_ilha_verde.sql`: tabela `iv_personagens` (nome único,
  `dados` em JSON com nível, atributos, classe, itens e equipamento), limite
  de 3 personagens por conta.

## Estado atual (fases do documento de design)
- Fase 1: ilha 3D, personagem, câmera, controles de PC e celular. Pronta.
- Fase 2: monstros por zona, ataque por alvo, EXP, drops, mochila, janela
  Herói com atributos STR/STA/DEX/INT. Pronta.
- Fase 3: login, personagens, multiplayer (ver outros e chat). No ar.
- Fase 4: classes no nível 15 (Guerreiro, Druida, Mago, Arqueiro) com prova
  de materiais, 3 habilidades por classe, Golem de Musgo (níveis 16 a 20),
  voo com prancha ou vassoura no nível 20, Piloto Tito (loja). Enviada ao
  GitHub em 27/09/2026 (commit 2d4115d); conferir se o Render publicou.

## Limites conhecidos (próximos passos)
- Os monstros ainda rodam no navegador de cada jogador: cada um vê os seus.
  Próximo passo: monstros, dano e drops decididos no servidor, o que também
  impede trapaças (hoje o servidor confia nos dados que o jogo manda).
- Fase 5: aprimoramento de equipamento (+1 a +10), lojas, troca entre
  jogadores, grupo de até 8 e guilda.
- Fase 6: novas regiões, masmorras com chefe, subclasses e mascotes.

## Como testar antes de enviar
- `node --check server.js` e conferir a sintaxe do script do `index.html`.
- Rodar local: `npm install` e depois `npm start` com as duas variáveis do
  Supabase; abrir http://localhost:3000.
- Depois do push, conferir os registros do Render.
