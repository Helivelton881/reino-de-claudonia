'use strict';

const EQUIPMENT = require('../data/equipment');
const { CLASSES } = require('../data/classes');
const UP_ATK = [0,2,4,6,8,10,13,16,19,21,24];
const UP_DEF = [0,2,4,6,8,10,12,14,16,18,20];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

function derivePlayer(data = {}) {
  const cls = CLASSES[data.cls] ? data.cls : 'aprendiz';
  const C = CLASSES[cls];
  const level = clamp(Math.floor(data.L || 1), 1, cls === 'aprendiz' ? 15 : 60);
  const stat = key => clamp(Math.floor(data[key] || 15), 1, 500);
  const eq = data.eq && typeof data.eq === 'object' ? data.eq : {};
  const upgrades = data.equp && typeof data.equp === 'object' ? data.equp : {};
  const candidateWeapon = EQUIPMENT[eq.arma];
  const weapon = candidateWeapon && candidateWeapon.req<=level && (!candidateWeapon.cls||candidateWeapon.cls===cls) ? candidateWeapon : null;
  const baseWeapon = weapon && weapon.atk ? weapon.atk : [1,3];
  const weaponUp = Math.floor(clamp(upgrades.arma, 0, 10));
  const weaponMultiplier = 1 + UP_ATK[weaponUp] / 100;
  const w = baseWeapon.map(n => Math.round(n * weaponMultiplier));
  let armor = 0;
  for (const slot of ['capacete','peitoral','botas']) {
    const item = EQUIPMENT[eq[slot]] && EQUIPMENT[eq[slot]].req<=level ? EQUIPMENT[eq[slot]] : null;
    if (item && item.def) armor += item.def * (1 + UP_DEF[Math.floor(clamp(upgrades[slot],0,10))] / 100);
  }
  const stats = { str:stat('str'), sta:stat('sta'), dex:stat('dex'), int:stat('int') };
  const main = stats[C.main];
  return {
    cls, level, ...stats, weapon:w, mainStat:C.main,
    atkMin:w[0] + main*0.5 + level*0.8, atkMax:w[1] + main*0.5 + level*0.8,
    defense:stats.sta*0.25 + armor,
    maxHp:Math.round((60 + level*12 + stats.sta*4)*C.hp),
    maxMp:Math.round(20 + level*4 + stats.int*(C.mpInt || 3)),
    maxFp:Math.round(15 + level*3 + stats.sta*2),
    crit:0.03 + stats.dex*0.0015 + (cls === 'arqueiro' ? 0.03 + stats.dex*0.0008 : 0),
    attackSpeed:1 + stats.dex*0.006, ranged:!!C.ranged
  };
}

function playerDamage(stats, monster, options = {}, rng = Math.random) {
  const hitChance = clamp(0.88 + (stats.level-monster.level)*0.02 + (stats.dex-15)*0.004, 0.4, 0.98);
  if (!options.magic && rng() > hitChance) return { damage:0, miss:true, critical:false };
  const stat = stats[options.stat || stats.mainStat];
  const roll = stats.weapon[0] + rng() * (stats.weapon[1]-stats.weapon[0]);
  let damage = (roll + stat*0.5 + stats.level*0.8) * (options.multiplier || 1) * (1+(options.attackBonus||0)) - monster.defense;
  const critical = rng() < stats.crit + (options.critBonus||0) + (options.critAdd||0);
  if (critical) damage *= 1.8;
  return { damage:Math.max(1, Math.round(damage)), miss:false, critical };
}

function monsterDamage(monster, stats, options = {}, rng = Math.random) {
  const dodge = clamp(0.04 + (stats.dex-15)*0.003 + (stats.level-monster.level)*0.01, 0, 0.3);
  if (rng() < dodge) return { damage:0, dodged:true };
  const damage = monster.attack*(0.85+rng()*0.3) - stats.defense*(1+(options.defenseBonus||0));
  return { damage:Math.max(1, Math.round(damage)), dodged:false };
}

module.exports = { CLASSES, derivePlayer, playerDamage, monsterDamage };
