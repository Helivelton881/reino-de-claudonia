'use strict';

const ZONES = Object.freeze({
  bolota: { x: 30, z: 32, radius: 16 },
  coelhorn: { x: -42, z: 40, radius: 18 },
  cogumelo: { x: -58, z: -38, radius: 18 },
  javali: { x: 62, z: -32, radius: 18 },
  golem: { x: 5, z: -88, radius: 20 },
  lobo: { x: 105, z: 42, radius: 22 },
  aranha: { x: -105, z: -85, radius: 22 },
  espirito: { x: -80, z: 98, radius: 24 },
  ciclope: { x: 40, z: 128, radius: 22 }
});

const MONSTER_TYPES = Object.freeze({
  bolota: { name: 'Bolota', aggressive: false, levels: [1, 3], count: 12, height: 1.1, radius: 0.8, speed: 2.4, material: 'gosma', movement: 'hop', expMultiplier: 1 },
  coelhorn: { name: 'Coelhorn', aggressive: false, levels: [4, 7], count: 12, height: 1.5, radius: 0.8, speed: 3.2, material: 'pelo', movement: 'hop', expMultiplier: 1 },
  cogumelo: { name: 'Cogumelo Bravo', aggressive: true, levels: [8, 11], count: 12, height: 1.7, radius: 0.85, speed: 2.8, material: 'chapeu', expMultiplier: 1 },
  javali: { name: 'Javali de Pedra', aggressive: true, levels: [12, 15], count: 11, height: 1.5, radius: 1, speed: 3.6, material: 'presa', expMultiplier: 1 },
  golem: { name: 'Golem Runico', aggressive: true, levels: [16, 20], count: 11, height: 2.4, radius: 1, speed: 2.6, material: 'musgo', expMultiplier: 2 },
  lobo: { name: 'Lobo Cinzento', aggressive: true, levels: [21, 28], count: 12, height: 1.9, radius: 1, speed: 4.2, material: 'pele_lobo', expMultiplier: 2.2 },
  aranha: { name: 'Aranha Sombria', aggressive: true, levels: [29, 37], count: 12, height: 1.6, radius: 1.2, speed: 3.4, material: 'seda', expMultiplier: 2.4 },
  espirito: { name: 'Espirito do Lago', aggressive: true, levels: [38, 47], count: 10, height: 2.2, radius: 0.9, speed: 3, material: 'essencia', expMultiplier: 2.6 },
  ciclope: { name: 'Ciclope de Lava', aggressive: true, levels: [48, 60], count: 9, height: 3.6, radius: 1.3, speed: 2.8, material: 'nucleo', expMultiplier: 3 }
});

module.exports = { ZONES, MONSTER_TYPES };
