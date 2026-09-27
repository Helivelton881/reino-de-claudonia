# Armas (futuro)

Modelos GLB de armas **sem esqueleto** (objetos rígidos). O sistema já prende objetos nos ossos
pelos encaixes `hand_r`, `hand_l` e `back` (`CharacterManager.equip(view, 'hand_r', objeto)`).

Padrão sugerido para cada arma:
- Origem (ponto 0,0,0) no lugar onde a mão segura.
- Lâmina/cano apontando para +Y do Blender (para cima).
- Escala real em metros.

Enquanto não houver armas em GLB, o jogo usa as armas antigas (espada, cajado, arco) presas
na mão do novo personagem.
