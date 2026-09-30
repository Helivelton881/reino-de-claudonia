'use strict';

const EQUIPMENT=require('../data/equipment');
const {rollAffixes}=require('../data/items/affixes');

const STARTERS=new Set(['espada_treino','espada_soldado','cajado_carvalho','varinha_arcana','arco_curto']);
const equipmentPool=(monster)=>Object.keys(EQUIPMENT).filter(id=>{
  const item=EQUIPMENT[id];
  if(STARTERS.has(id)||item.slot==='voo')return false;
  const allowedSource=monster.giant?['common','giant'].includes(item.source):item.source==='common';
  return allowedSource&&item.req<=monster.level+2&&item.req>=Math.max(1,monster.level-8);
});

function rollLoot(monster,{rng=Math.random,luck=1,copies=1}={}){
  const drops=[],integer=(min,max)=>Math.floor(min+rng()*(max-min+1));
  for(let c=0;c<copies;c++){
    drops.push({gold:integer(monster.level*2+2,monster.level*4+5)*(monster.giant?5:1)});
    if(rng()<0.26)drops.push({id:'pocao_vida',n:1});
    if(rng()<0.14)drops.push({id:'pocao_mana',n:1});
    if(rng()<0.12)drops.push({id:'pocao_energia',n:1});
    if(rng()<0.55)drops.push({id:monster.material,n:monster.giant?5:1});
    if(rng()<(monster.giant?0.6:0.03+monster.level*0.002)*luck)drops.push({id:'pedra_aprimorar',n:1});
    if(rng()<(monster.giant?0.3:0.015+monster.level*0.0005)*luck)drops.push({id:monster.level>=16&&rng()<0.4?'runa_maior':'runa_menor',n:1});
    if(rng()<(monster.giant?0.72:0.055)*luck){
      const pool=equipmentPool(monster);
      if(pool.length){
        const id=pool[integer(0,pool.length-1)],item=EQUIPMENT[id];
        drops.push({id,n:1,rarity:item.rarity,affixes:rollAffixes(item,rng),socketed:[]});
      }
    }
  }
  return drops;
}

module.exports={rollLoot,equipmentPool};
