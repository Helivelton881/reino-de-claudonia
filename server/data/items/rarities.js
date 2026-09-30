'use strict';

const RARITIES=Object.freeze({
  comum:Object.freeze({id:'comum',name:'Comum',rank:0,color:'#B9C0C8',statMult:1,affixes:0,sockets:0,upgradeCost:1}),
  incomum:Object.freeze({id:'incomum',name:'Incomum',rank:1,color:'#64C77B',statMult:1.05,affixes:1,sockets:0,upgradeCost:1.1}),
  raro:Object.freeze({id:'raro',name:'Raro',rank:2,color:'#4EA1FF',statMult:1.11,affixes:2,sockets:1,upgradeCost:1.25}),
  epico:Object.freeze({id:'epico',name:'Épico',rank:3,color:'#B56CFF',statMult:1.18,affixes:3,sockets:2,upgradeCost:1.45}),
  lendario:Object.freeze({id:'lendario',name:'Lendário',rank:4,color:'#F2B84B',statMult:1.26,affixes:4,sockets:3,upgradeCost:1.7})
});

const SOURCE_RARITY=Object.freeze({
  npc:'comum',
  common:'incomum',
  giant:'raro',
  dungeon:'epico',
  boss:'lendario'
});

module.exports={RARITIES,SOURCE_RARITY};
