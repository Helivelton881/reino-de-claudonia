'use strict';

const { STATIC_NPCS } = require('../../public/js/world-collision-map');

const META = Object.freeze({
  guerreiro:{name:'Capitão Borin',tag:'[Mestre Guerreiro] Borin',role:'Instrutor de Guerreiro',service:'class-trial',classId:'guerreiro'},
  druida:{name:'Irmã Aurélia',tag:'[Mestra Druida] Aurélia',role:'Instrutora de Druida',service:'class-trial',classId:'druida'},
  mago:{name:'Mestre Eldran',tag:'[Mestre Mago] Eldran',role:'Instrutor de Mago',service:'class-trial',classId:'mago'},
  arqueiro:{name:'Caçadora Nyra',tag:'[Mestra Arqueira] Nyra',role:'Instrutora de Arqueiro',service:'class-trial',classId:'arqueiro'},
  voo:{name:'Piloto Tito',tag:'[Mestre de Voo] Tito',role:'Mestre de Voo e mercador',service:'flight-shop'},
  ferreiro:{name:'Ferreira Brunna',tag:'[Ferreira] Brunna',role:'Ferreira: aprimora, compra e vende equipamentos',service:'forge'},
  vigia_lobos:{name:'Vigia Cael',tag:'[Vigia da Trilha] Cael',role:'Vigia da Trilha dos Lobos',service:'quest-giver'},
  batedora_teias:{name:'Batedora Maelis',tag:'[Batedora da Mata] Maelis',role:'Batedora da Mata das Teias',service:'quest-giver'},
  guardia_lago:{name:'Guardiã Neris',tag:'[Guardiã do Lago] Neris',role:'Guardiã do Lago Espelhado',service:'quest-giver'}
});

const NPCS = Object.freeze(STATIC_NPCS.map(p=>Object.freeze({
  id:p.id, x:p.x, z:p.z, r:p.r, ...(META[p.id]||{})
})));

module.exports = NPCS;
