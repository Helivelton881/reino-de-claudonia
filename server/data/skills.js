'use strict';

module.exports = Object.freeze({
  golpe_forte: { cls: 'aprendiz', req: 1, fp: 6, cooldown: 4, type: 'hit', multiplier: 1.8 },
  corte_duplo: { cls: 'aprendiz', req: 8, fp: 10, cooldown: 7, type: 'double', multiplier: 1.2 },
  investida: { cls: 'guerreiro', req: 15, fp: 8, cooldown: 5, type: 'hit', multiplier: 2.1 },
  grito: { cls: 'guerreiro', req: 17, mp: 10, cooldown: 30, type: 'buff', buff: { id: 'grito', seconds: 30, atk: 0.2 } },
  redemoinho: { cls: 'guerreiro', req: 20, fp: 15, cooldown: 10, type: 'aoe', around: 'self', radius: 4, multiplier: 1.4 },
  cura: { cls: 'druida', req: 15, mp: 12, cooldown: 3, type: 'heal' },
  bencao: { cls: 'druida', req: 17, mp: 15, cooldown: 45, type: 'buff', buff: { id: 'bencao', seconds: 60, def: 0.25, regen: 1 } },
  punho: { cls: 'druida', req: 20, fp: 10, cooldown: 6, type: 'hit', multiplier: 1.9, stat: 'int' },
  bola_fogo: { cls: 'mago', req: 15, mp: 8, cooldown: 2.5, type: 'bolt', multiplier: 1.9, magic: true },
  lanca_gelo: { cls: 'mago', req: 17, mp: 12, cooldown: 6, type: 'bolt', multiplier: 1.5, magic: true, slow: 4 },
  tempestade: { cls: 'mago', req: 20, mp: 25, cooldown: 12, type: 'aoe', around: 'target', radius: 4.5, multiplier: 1.5, magic: true },
  tiro_certeiro: { cls: 'arqueiro', req: 15, fp: 6, cooldown: 3, type: 'bolt', multiplier: 1.9, critAdd: 0.5 },
  olho_aguia: { cls: 'arqueiro', req: 17, mp: 10, cooldown: 40, type: 'buff', buff: { id: 'aguia', seconds: 30, crit: 0.25 } },
  chuva_flechas: { cls: 'arqueiro', req: 20, fp: 15, cooldown: 10, type: 'aoe', around: 'target', radius: 4.5, multiplier: 1.4 }
});
