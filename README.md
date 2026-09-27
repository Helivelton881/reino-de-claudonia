# Reino De Claudonia (versão 0.6)

MMORPG 3D de navegador. Já tem: login, até 3 personagens por conta,
outros jogadores visíveis na ilha, chat, progresso salvo no banco,
4 classes (Guerreiro, Druida, Mago, Arqueiro) com prova no nível 15,
habilidades por classe e voo de prancha ou vassoura a partir do nível 20.

Fase 5, com as regras do Flyff: aprimoramento +1 a +10 (com risco de quebrar
do +4 em diante e pergaminhos de proteção e sorte), loja pessoal, troca de
itens e ouro, grupo de até 8 com nível, pontos e habilidades de grupo, e
guildas com nível, doações e cargos. O mundo virou um continente de outono
com 9 regiões de monstros até o nível 60.

## Peças
- `public/index.html`: o jogo (Three.js) com login e escolha de personagem.
- `server.js`: servidor Node.js. Serve o jogo, confere o login e cuida
  das posições, do chat e do salvamento (WebSocket em `/ws`).
- `supabase/001_ilha_verde.sql`: tabela `iv_personagens` com regras de
  segurança (cada conta só vê e altera os próprios personagens).
- `supabase/002_guildas.sql` e `supabase/003_guilda_niveis.sql`: guildas,
  membros, convites, nível, doações e cargos, com regras de segurança
  (só entra quem foi convidado).

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
