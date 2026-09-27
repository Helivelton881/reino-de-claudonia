# KayKit Adventurers 2.0 (FREE)

- **Pacote:** KayKit : Adventurers Character Pack (2.0), versão FREE
- **Autor:** Kay Lousberg — www.kaylousberg.com
- **Onde conseguir:** página do autor no itch.io (kaylousberg.itch.io). O link não foi aberto nesta integração: o arquivo foi enviado pelo dono.
- **Licença:** Creative Commons Zero (CC0) — http://creativecommons.org/publicdomain/zero/1.0/
  Uso livre em projetos pessoais, educacionais e comerciais; crédito não obrigatório.
  Texto original da licença: `License.txt` (nesta pasta).
- **Como chegou ao projeto:** o dono enviou o arquivo `KayKit_Adventurers_2.0_FREE.zip` (13 MB) em 27/09/2026.
- **Data da integração:** 27/09/2026 (branch `feature/quaternius-character`).

Crédito (opcional, mas gentil): "Personagens e armas: Kay Lousberg, www.kaylousberg.com".

## Arquivos usados no jogo

| No jogo | Origem no pacote | Tamanho |
|---|---|---|
| `assets/characters/base_male/base_male.glb` | `Characters/gltf/Ranger.glb` + animações de `Animations/gltf/Rig_Medium/Rig_Medium_General.glb` e `Rig_Medium_MovementBasic.glb` (juntas num arquivo só) | 1,0 MB |
| `assets/weapons/kaykit_sword_1handed.glb` | `Assets/gltf/sword_1handed.gltf` (+ .bin + knight_texture.png) | 27 KB |
| `assets/weapons/kaykit_staff.glb` | `Assets/gltf/staff.gltf` (+ .bin + mage_texture.png) | 35 KB |
| `assets/weapons/kaykit_bow.glb` | `Assets/gltf/bow_withString.gltf` (+ .bin + ranger_texture.png) | 64 KB |

Nada foi redesenhado: só juntei os arquivos (gltf-transform), sem mudar malhas, texturas ou animações.
O script usado é `tools/montar_base_male.mjs` (precisa de `npm i @gltf-transform/core @gltf-transform/functions`,
fora do projeto). As poses paradas (`T-Pose`, `Death_A_Pose`, `Death_B_Pose`) foram deixadas de fora.

## O que tem no pacote FREE (conferido nos arquivos)

- 6 personagens, todos no mesmo esqueleto `Rig_Medium` (23 ossos: root, hips, spine, chest, head,
  upperarm/lowerarm/wrist/hand/handslot .l/.r, upperleg/lowerleg/foot/toes .l/.r):
  Knight (5.800 triângulos), Barbarian (7.123), Mage (6.668), Ranger (8.900), Rogue (7.562), Rogue_Hooded (7.185).
  Cada um: 1 material, 1 textura 1024×1024 (PNG, ~13 KB). Formatos: GLB e FBX.
- Os personagens NÃO trazem animações; elas vêm em 2 arquivos separados (mesmo esqueleto):
  - General: Death_A, Death_B, Hit_A, Hit_B, Idle_A, Idle_B, Interact, PickUp, Spawn_Air, Spawn_Ground, Throw, Use_Item
  - MovementBasic: Jump_Full_Long, Jump_Full_Short, Jump_Idle, Jump_Land, Jump_Start, Running_A, Running_B, Walking_A, Walking_B, Walking_C
  - Não há ataque de espada, magia nem voo na versão FREE.
- Peças separadas por personagem (capacete, viseira, chapéu, capa, aljava, máscara) — dá para mostrar/esconder.
- 34 objetos (armas, escudos, canecas, livros...) em GLTF, FBX e OBJ.
- Não há roupas modulares nem cabelos separados.

## Personagem escolhido: Ranger
Homem, roupa simples de aventureiro (túnica clara, lenço azul, cinto, botas, capa). A aljava
(`Ranger_Quiver`) só aparece no Arqueiro (`classOnlyMeshes` na configuração).
