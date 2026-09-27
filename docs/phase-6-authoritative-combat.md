# Fase 6 — monstros, combate e drops autoritativos

## Fluxo

1. Após autenticar o personagem, o servidor envia `welcome` com o snapshot
   dos monstros e drops dentro da área de interesse.
2. O cliente envia intenções de ataque, habilidade, coleta e uso de item.
3. O servidor valida estado, distância, cooldown, classe, nível e recursos.
4. O servidor calcula dano, IA, morte, experiência, loot e inventário.
5. Os resultados são transmitidos como eventos; o cliente apenas os apresenta.

O snapshot periódico `worldSnapshot` permite entrar em outra região sem
recriar monstros no navegador. IDs são globais no processo do servidor e o
mesmo monstro é observado pelos jogadores próximos.

## Módulos

- `server/data`: tabelas canônicas de monstros, habilidades e equipamentos.
- `server/world`: geração de spawn, estados de IA, aggro, perseguição,
  retorno e respawn.
- `server/combat`: atributos derivados, dano, cooldown, recursos, buffs,
  morte e renascimento.
- `server/loot`: tabelas, entidades no chão, dono/grupo, expiração e coleta.
- `server/economy`: compra, venda e aprimoramento validados no servidor.

## Segurança e validações

- mensagens antigas `pkill` e `hp` são ignoradas no modo autoritativo;
- `save` não pode sobrescrever nível, EXP, ouro, inventário, equipamento,
  atributos nem HP/MP/FP;
- ataques distantes, spam, habilidades desconhecidas e recursos
  insuficientes são rejeitados;
- teletransportes incompatíveis com o intervalo de posição são rejeitados;
- uma entidade de loot é removida atomicamente antes de uma segunda coleta;
- itens e estatísticas usados no dano vêm das tabelas do servidor.

## Rollback

Defina `COMBATE_AUTORITATIVO=0` no processo do servidor e reinicie. O cliente
receberá `authoritativeCombat: false` e ativará a simulação legada. Esta flag
é uma ponte de rollback e deve ser removida após a estabilização em produção.

## Testes

Execute `npm test`. Os testes cobrem cálculo de atributos/dano, validação de
alcance e cooldown, mensagens forjadas, morte única, snapshots compartilhados,
disputa de loot e economia. O teste manual multicliente exige as variáveis
Supabase e duas contas/personagens válidos.
