# Armas (futuro)

Modelos GLB de armas **sem esqueleto** (objetos rígidos). O EquipmentManager prende a arma nas
âncoras `Weapon_R` (slot `weapon`), `Weapon_L` (slot `offhand`) e `Back` (slot `back`).

Nomes sugeridos: `sword_01.glb`, `bow_01.glb`, `staff_01.glb`.
Para ligar, preencha `weaponModels` em `public/js/claudonia-character-config.js`, por exemplo:
```js
weaponModels: { guerreiro: 'assets/weapons/sword_01.glb', arqueiro: 'assets/weapons/bow_01.glb', mago: 'assets/weapons/staff_01.glb' },
```
Cada arquivo é baixado uma vez só e copiado para cada jogador. Se faltar, fica a arma antiga.

Padrão sugerido para cada arma:
- Origem (ponto 0,0,0) no lugar onde a mão segura.
- Lâmina/cano apontando para +Y do Blender (para cima).
- Escala real em metros.

Enquanto não houver armas em GLB, o jogo usa as armas antigas (espada, cajado, arco) presas
na mão do novo personagem.
