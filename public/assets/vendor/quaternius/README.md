# Kits da Quaternius usados no mundo

- **Autor:** Quaternius — https://quaternius.com
- **Como chegaram ao projeto:** o dono baixou os três .zip (versão Standard, grátis) e deixou em
  `C:\Users\Admin\Downloads` em 27/09/2026.
- **Data da integração:** 27/09/2026 (branch `feature/mundo-quaternius`).

| Pacote | Licença | Texto da licença |
|---|---|---|
| Stylized Nature MegaKit [Standard] | CC0 1.0 (domínio público) | `License_Stylized_Nature_MegaKit.txt` |
| Fantasy Props MegaKit [Standard] | CC0 1.0 (domínio público) | `License_Fantasy_Props_MegaKit.txt` |
| Bestiary - Dungeon Monsters Kit [Standard] | Quaternius Asset License (QAL) v1.0 | `License_Bestiary_Dungeon_Monsters_Kit.txt` |

Resumo da QAL (Bestiary): pode usar grátis em jogos, inclusive comerciais, sem crédito obrigatório;
**não pode revender nem redistribuir os modelos soltos como pacote de assets**. Dentro do jogo pode.

## O que foi usado (arquivos do jogo)

Os modelos foram juntados e otimizados por `tools/otimizar_kits_quaternius.mjs`:
texturas reduzidas para 512 px (sem mapas de relevo), folhas e grama em tons de cinza (o jogo
pinta cada árvore com as cores de outono), troncos com menos triângulos. A forma e o desenho
continuam os da Quaternius.

| Arquivo | Conteúdo | Tamanho |
|---|---|---|
| `assets/world/nature.glb` | CommonTree_3, CommonTree_5, Pine_2, TwistedTree_1, DeadTree_1, Bush_Common, Bush_Common_Flowers, Grass_Common_Short, Fern_1, Plant_1_Big, Clover_2, Flower_3_Group, Mushroom_Common, Mushroom_Laetiporus, Rock_Medium_1, Rock_Medium_3, Pebble_Round_1 | ~1,0 MB |
| `assets/world/props.glb` | 52 objetos: barris, caixotes, barracas, carroça, mesas, cadeiras, bancos, camas, baús, estantes, livros, poções, caldeirão, bigorna, bancada, ferramentas, boneco de treino, lanternas, velas... | ~1,6 MB |
| `assets/world/monsters/imp.glb` | Imp (sem animações no pacote grátis) | ~0,4 MB |
| `assets/world/monsters/puglin.glb` | Puglin (sem animações no pacote grátis) | ~0,2 MB |

Os .zip originais (cerca de 300 MB) não vão para o GitHub.
Para refazer os arquivos: descompacte os .zip numa pasta e rode o script (instruções no topo dele).
