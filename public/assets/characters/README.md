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
| Attack | Attack, Ataque |
| Hit | Hit, Dano |
| Death | Death, Morte |
| Jump | Jump, Pulo |
| Cast | Cast, Magia |
| FlyIdle | FlyIdle, VooParado |
| FlyForward | FlyForward, VooFrente |

Se faltar alguma, o jogo usa uma parecida (ex.: sem Run usa Walk; sem Cast usa Attack).
A lista completa de nomes aceitos fica em `public/js/claudonia-character-config.js` (`clips`).

## Ossos usados para equipamentos
Arma na mão direita: `Hand_R` (ou `hand.R`, `RightHand`, `mixamorigRightHand`).
Arma nas costas: `Chest` (ou `spine.003`, `Spine2`). Cabeça: `Head`.
Dá para trocar os nomes, a posição e o giro em `sockets` na configuração.

## placeholder_mannequin.glb — SÓ PARA TESTE
Manequim cinza com mãos e pés laranja, gerado por `tools/gerar_placeholder_glb.js`.
**Não é o visual do jogo.** Serve para testar o sistema. Para vê-lo no jogo, abra o
endereço com `?personagem=placeholder` no final.
