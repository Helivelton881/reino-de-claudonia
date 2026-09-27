# Reino De Claudonia (Fase 3)

MMORPG 3D de navegador. Nesta fase: login, até 3 personagens por conta,
outros jogadores visíveis na ilha, chat e progresso salvo no banco.

## Peças
- `public/index.html`: o jogo (Three.js) com login e escolha de personagem.
- `server.js`: servidor Node.js. Serve o jogo, confere o login e cuida
  das posições, do chat e do salvamento (WebSocket em `/ws`).
- `supabase/001_ilha_verde.sql`: tabela `iv_personagens` com regras de
  segurança (cada conta só vê e altera os próprios personagens).

## Variáveis de ambiente (no Render)
- `SUPABASE_URL`: endereço do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave pública (anon ou publishable) do projeto.

Nenhuma chave secreta é usada.

## Rodar no computador
```
npm install
SUPABASE_URL=... SUPABASE_ANON_KEY=... npm start
```
Depois abra http://localhost:3000

## Publicar no Render
- Tipo: Web Service, ambiente Node.
- Build: `npm install`
- Start: `npm start`

## Limites desta fase
- Os monstros ainda são simulados no navegador de cada jogador.
- O servidor confia nos dados de nível e itens enviados pelo jogo.
Os dois pontos passam para o servidor na próxima etapa.
