'use strict';

const CLASSES=Object.freeze({
  aprendiz:Object.freeze({id:'aprendiz',name:'Aprendiz',role:'Iniciante',main:'str',hp:1,ranged:false,specializations:[]}),
  guerreiro:Object.freeze({id:'guerreiro',name:'Guerreiro',role:'Melee DPS / Tank',main:'str',hp:1.2,ranged:false,specializations:['guardiao','duelista']}),
  druida:Object.freeze({id:'druida',name:'Druida',role:'Heal / Support',main:'str',hp:1.05,mpInt:4,ranged:false,specializations:['sacerdote','monge']}),
  mago:Object.freeze({id:'mago',name:'Mago',role:'Ranged DPS / Controle',main:'int',hp:.9,mpInt:4.5,ranged:true,specializations:['arcanista','elementalista']}),
  arqueiro:Object.freeze({id:'arqueiro',name:'Arqueiro',role:'Ranged DPS / Controle',main:'dex',hp:.95,ranged:true,specializations:['cacador','atirador']})
});

const SPECIALIZATIONS=Object.freeze({
  guardiao:Object.freeze({id:'guardiao',baseClass:'guerreiro',name:'Guardiao',role:'Tank',description:'Defesa, controle de ameaca e protecao de grupo.',bonuses:{hp:.12,def:.15}}),
  duelista:Object.freeze({id:'duelista',baseClass:'guerreiro',name:'Duelista',role:'Melee DPS',description:'Pressao corpo a corpo, velocidade e sequencias ofensivas.',bonuses:{atk:.1,attackSpeed:.08}}),
  sacerdote:Object.freeze({id:'sacerdote',baseClass:'druida',name:'Sacerdote',role:'Heal / Support',description:'Cura de grupo, protecao e sustentacao prolongada.',bonuses:{healing:.18,mp:.12}}),
  monge:Object.freeze({id:'monge',baseClass:'druida',name:'Monge',role:'Melee DPS / Support',description:'Combos de proximidade e resistencia equilibrada.',bonuses:{atk:.08,def:.08}}),
  arcanista:Object.freeze({id:'arcanista',baseClass:'mago',name:'Arcanista',role:'Ranged DPS / Controle',description:'Explosao arcana, vulnerabilidade e controle preciso.',bonuses:{magicAtk:.12,crit:.04}}),
  elementalista:Object.freeze({id:'elementalista',baseClass:'mago',name:'Elementalista',role:'Ranged DPS / DoT',description:'Dano elemental persistente e controle de area.',bonuses:{dot:.18,mp:.1}}),
  cacador:Object.freeze({id:'cacador',baseClass:'arqueiro',name:'Cacador',role:'Ranged DPS / Support',description:'Marcas, pressao coordenada e sinergia de grupo.',bonuses:{crit:.05,partyDamage:.06}}),
  atirador:Object.freeze({id:'atirador',baseClass:'arqueiro',name:'Atirador',role:'Ranged DPS',description:'Alcance, precisao e dano de alvo unico.',bonuses:{atk:.1,range:2}})
});

const publicCatalog=()=>({
  classes:Object.values(CLASSES).map(c=>({...c,specializations:[...c.specializations]})),
  specializations:Object.values(SPECIALIZATIONS).map(s=>({...s,bonuses:{...s.bonuses}}))
});

module.exports={CLASSES,SPECIALIZATIONS,publicCatalog};