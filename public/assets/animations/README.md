# Animações separadas (opcional)

Se as animações estiverem em arquivos próprios (ex.: um GLB só com "Walk" e "Run"), coloque-os
aqui e liste em `animationFiles` na configuração (`public/js/claudonia-character-config.js`):

```js
animationFiles: ['assets/animations/base_locomotion.glb', 'assets/animations/base_combate.glb'],
```

Regras:
- O esqueleto precisa ter **os mesmos nomes de ossos** do personagem (`base_male.glb`).
- Os nomes das animações seguem a mesma tabela de `characters/README.md`.
