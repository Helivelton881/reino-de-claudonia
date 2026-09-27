# Armaduras e roupas (futuro)

Peças que **se deformam com o corpo** (peitoral, botas, capa) devem ser feitas no Blender sobre
o **mesmo esqueleto** do personagem (`base_male.glb`), com os mesmos nomes de ossos, e exportadas
em GLB separado (uma peça por arquivo).

O sistema liga essas peças ao esqueleto do jogador pelo nome dos ossos
(`CharacterManager.attachSkinnedPart(view, cenaDaPeca)`).

Nomes sugeridos: `capacete_ferro.glb`, `peitoral_ferro.glb`, `botas_ferro.glb` — iguais aos ids
dos itens do jogo, para ligar cada item ao seu modelo depois.
