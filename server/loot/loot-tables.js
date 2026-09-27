'use strict';

const EQUIPMENT = require('../data/equipment');
const EQUIPMENT_IDS = Object.keys(EQUIPMENT).filter(id => !['espada_treino','espada_soldado','cajado_carvalho','varinha_arcana','arco_curto'].includes(id));

function rollLoot(monster, { rng = Math.random, luck = 1, copies = 1 } = {}) {
  const drops = [];
  const integer = (min,max) => Math.floor(min+rng()*(max-min+1));
  for (let c=0;c<copies;c++) {
    drops.push({ gold:integer(monster.level*2+2,monster.level*4+5)*(monster.giant?5:1) });
    if (rng()<0.26) drops.push({ id:'pocao_vida', n:1 });
    if (rng()<0.14) drops.push({ id:'pocao_mana', n:1 });
    if (rng()<0.12) drops.push({ id:'pocao_energia', n:1 });
    if (rng()<0.55) drops.push({ id:monster.material, n:monster.giant?5:1 });
    if (rng()<(monster.giant?0.6:0.03+monster.level*0.002)*luck) drops.push({ id:'pedra_aprimorar', n:1 });
    if (rng()<(monster.giant?0.3:0.015+monster.level*0.0005)*luck) drops.push({ id:monster.level>=16&&rng()<0.4?'runa_maior':'runa_menor', n:1 });
    if (rng()<(monster.giant?0.7:0.05)*luck) {
      const pool = EQUIPMENT_IDS.filter(id => EQUIPMENT[id].req<=monster.level+2 && EQUIPMENT[id].req>=monster.level-8);
      if (pool.length) drops.push({ id:pool[integer(0,pool.length-1)], n:1 });
    }
  }
  return drops;
}

module.exports = { rollLoot };
