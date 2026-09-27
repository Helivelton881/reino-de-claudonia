# Cabelos (futuro)

Cabelos em GLB separados, feitos sobre o **mesmo esqueleto** do personagem (ligados ao osso
`Head`), para o jogador escolher o penteado sem precisar de um personagem inteiro novo.

- Com pele (skinning) no osso `Head`: use `CharacterManager.attachSkinnedPart`.
- Sem esqueleto (objeto rígido): prenda no encaixe `head` com `CharacterManager.equip(view, 'head', objeto)`.
