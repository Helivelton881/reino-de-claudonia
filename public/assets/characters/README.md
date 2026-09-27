# Personagens (GLB/GLTF rigados)

Coloque aqui o personagem principal com o nome **`base_male.glb`**.
O jogo tenta carregar esse arquivo sozinho. Se ele não existir ou der erro, o jogo
continua com o personagem antigo (procedural), sem travar.

## Como exportar do Blender
- Personagem em pé, pés no chão (Z = 0 no Blender), olhando para **-Y** (a frente padrão do Blender).
- Uma armadura (esqueleto) com a malha ligada a ela (Armature Deform / pesos).
- Escala real (ex.: 1,75 m). O jogo ajusta a altura sozinho (`targetHeight` na configuração).
- Arquivo > Exportar > glTF 2.0 (.glb), com **Animações** e **Skinning** ligados, "+Y Up" ligado.
- Nomes das animações (ações do Blender) — em inglês ou português:

| Estado do jogo | Nomes reconhecidos |
|---|---|
| Idle | Idle, Parado |
| Walk | Walk, Andar |
| Run | Run, Correr |
| Attack | **Attack_01**, Attack, Ataque |
| Hit | Hit, Dano |
| Death | Death, Morte |
| Jump | Jump, Pulo |
| Cast | Cast, Magia |
| FlyIdle | FlyIdle, VooParado |
| FlyForward | FlyForward, VooFrente |

Se faltar alguma, o jogo usa uma parecida (ex.: sem Run usa Walk; sem Cast usa Attack).
A lista completa de nomes aceitos fica em `public/js/claudonia-character-config.js` (`clips`).

## Ossos para equipamentos (opcional, recomendado)
Crie no Blender ossos extras com estes nomes, filhos da mão/peito:
- `Weapon_R` — arma na mão direita (filho de `Hand_R`)
- `Weapon_L` — escudo/arma na mão esquerda (filho de `Hand_L`)
- `Back` — arma guardada nas costas (filho do peito)

Se eles não existirem, o jogo usa a mão (`Hand_R`, `RightHand`...) ou, em último caso, uma âncora
auxiliar presa ao corpo. Nada quebra. Nomes e posições ficam em `anchors` na configuração.

## Escala
O modelo é medido e ajustado para `CHARACTER_HEIGHT` (2,35, igual ao personagem antigo).
Ajustes finos: `CHARACTER_SCALE`, `CHARACTER_Y_OFFSET` e `CHARACTER_ROTATION_OFFSET` em
`public/js/claudonia-character-config.js`.

## placeholder_mannequin.glb — SÓ PARA TESTE
Manequim cinza com mãos e pés laranja, gerado por `tools/gerar_placeholder_glb.js`.
**Não é o visual do jogo.** Serve para testar o sistema. Para vê-lo no jogo, abra o
endereço com `?personagem=placeholder` no final.
