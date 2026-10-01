'use strict';

const {RARITIES,SOURCE_RARITY}=require('./rarities');

const E={};
const add=(id,data)=>{
  const rarity=data.rarity||SOURCE_RARITY[data.source]||'comum',R=RARITIES[rarity]||RARITIES.comum;
  E[id]=Object.freeze({id,name:data.name||id,slot:data.slot,req:data.req||1,cls:data.cls||null,atk:data.atk||null,def:data.def||0,
    rarity,source:data.source||'npc',tier:data.tier||Math.max(1,Math.ceil((data.req||1)/10)),setId:data.setId||null,
    socketCount:Number.isInteger(data.socketCount)?data.socketCount:R.sockets,model:data.model||null,visualSlot:data.visualSlot||null,
    modelScale:Array.isArray(data.modelScale)?Object.freeze([...data.modelScale]):(Number.isFinite(data.modelScale)?data.modelScale:null),
    modelPosition:Array.isArray(data.modelPosition)?Object.freeze([...data.modelPosition]):null,
    modelQuaternion:Array.isArray(data.modelQuaternion)?Object.freeze([...data.modelQuaternion]):null,
    affixBias:Array.isArray(data.affixBias)?Object.freeze([...data.affixBias]):Object.freeze([]),price:data.price||null,
    fly:data.fly||null,spd:data.spd||null,color:data.color||null});
};

// Compatibilidade integral com os 53 equipamentos anteriores.
const legacy={
  espada_treino:{name:'Espada de Treino',slot:'arma',req:1,atk:[4,7]},
  espada_ferro:{name:'Espada de Ferro',slot:'arma',req:5,atk:[8,12]},
  machado_rustico:{name:'Machado Rústico',slot:'arma',req:10,atk:[12,18],source:'common',rarity:'incomum'},
  espada_soldado:{name:'Espada de Soldado',slot:'arma',req:15,atk:[16,22],cls:'guerreiro'},
  machado_guerra:{name:'Machado de Guerra',slot:'arma',req:18,atk:[22,30],cls:'guerreiro',source:'common',rarity:'incomum'},
  cajado_carvalho:{name:'Cajado de Carvalho',slot:'arma',req:15,atk:[13,18],cls:'druida'},
  cajado_runico:{name:'Cajado Rúnico',slot:'arma',req:18,atk:[18,25],cls:'druida',source:'common',rarity:'incomum'},
  varinha_arcana:{name:'Varinha Arcana',slot:'arma',req:15,atk:[15,21],cls:'mago'},
  cetro_cristal:{name:'Cetro de Cristal',slot:'arma',req:18,atk:[21,29],cls:'mago',source:'common',rarity:'incomum'},
  arco_curto:{name:'Arco Curto',slot:'arma',req:15,atk:[14,20],cls:'arqueiro'},
  arco_longo:{name:'Arco Longo',slot:'arma',req:18,atk:[20,28],cls:'arqueiro',source:'common',rarity:'incomum'},
  gorro_couro:{name:'Gorro de Couro',slot:'capacete',req:3,def:2},
  botas_viajante:{name:'Botas de Viajante',slot:'botas',req:4,def:2},
  tunica_reforcada:{name:'Túnica Reforçada',slot:'peitoral',req:6,def:4},
  botas_ferro:{name:'Botas de Ferro',slot:'botas',req:10,def:4},
  capacete_ferro:{name:'Capacete de Ferro',slot:'capacete',req:12,def:5},
  peitoral_ferro:{name:'Peitoral de Ferro',slot:'peitoral',req:12,def:8},
  capacete_aco:{name:'Capacete de Aço',slot:'capacete',req:18,def:8},
  peitoral_aco:{name:'Peitoral de Aço',slot:'peitoral',req:18,def:12},
  botas_aco:{name:'Botas de Aço',slot:'botas',req:18,def:6},
  prancha_madeira:{name:'Prancha de Madeira',slot:'voo',req:20,source:'npc',price:300,fly:'board',spd:14,color:0xA8703A},
  vassoura_simples:{name:'Vassoura Simples',slot:'voo',req:20,source:'npc',price:300,fly:'broom',spd:14,color:0xA8703A},
  prancha_veloz:{name:'Prancha Veloz',slot:'voo',req:20,source:'npc',price:1500,fly:'board',spd:18,color:0x3F8CFF,rarity:'raro'},
  vassoura_veloz:{name:'Vassoura Veloz',slot:'voo',req:20,source:'npc',price:1500,fly:'broom',spd:18,color:0x3F8CFF,rarity:'raro'},
  prancha_celeste:{name:'Prancha Celeste',slot:'voo',req:20,source:'npc',price:4000,fly:'board',spd:22,color:0xF2C14E,rarity:'epico'},
  vassoura_celeste:{name:'Vassoura Celeste',slot:'voo',req:20,source:'npc',price:4000,fly:'broom',spd:22,color:0xF2C14E,rarity:'epico'}
};
for(const [id,data] of Object.entries(legacy))add(id,data);

for(const [req,key,name] of [[25,'prata','Prata'],[35,'runico','Rúnico'],[45,'celeste','Celeste'],[55,'dragao','Dragão']]){
  const rarity=req>=55?'epico':req>=45?'raro':'incomum',source=req>=45?'giant':'common';
  add(`capacete_${key}`,{name:`Elmo ${name}`,slot:'capacete',req,def:Math.round(req*.45),rarity,source});
  add(`peitoral_${key}`,{name:`Armadura ${name}`,slot:'peitoral',req,def:Math.round(req*.7),rarity,source});
  add(`botas_${key}`,{name:`Botas ${name}`,slot:'botas',req,def:Math.round(req*.35),rarity,source});
  const atk=[Math.round(req*1.15),Math.round(req*1.55)];
  add(`espada_${key}`,{name:`Espada ${name}`,slot:'arma',req,atk,cls:'guerreiro',rarity,source});
  add(`cajado_${key}`,{name:`Cajado ${name}`,slot:'arma',req,atk:[atk[0]-2,atk[1]-3],cls:'druida',rarity,source});
  add(`cetro_${key}`,{name:`Cetro ${name}`,slot:'arma',req,atk:[atk[0]+1,atk[1]+2],cls:'mago',rarity,source});
  add(`arco_${key}`,{name:`Arco ${name}`,slot:'arma',req,atk:[...atk],cls:'arqueiro',rarity,source});
}

const CLASS_VISUAL={
  guerreiro:{weapon:'kaykit/guerreiro_espada.glb',offhand:'kaykit/guerreiro_escudo.glb',helmet:'helmet_bastion.glb',chest:'armor_bastion.glb',cape:'cape_bastion.glb'},
  druida:{weapon:'kaykit/druida_varinha.glb',offhand:'kaykit/druida_totem.glb',helmet:'helmet_aurora.glb',chest:'armor_aurora.glb',cape:'cape_aurora.glb'},
  mago:{weapon:'kaykit/mago_cajado.glb',offhand:'kaykit/mago_grimorio.glb',helmet:'helmet_eclipse.glb',chest:'armor_eclipse.glb',cape:'cape_eclipse.glb'},
  arqueiro:{weapon:'kaykit/arqueiro_arco.glb',offhand:'offhand_horizon_quiver.glb',helmet:'helmet_horizon.glb',chest:'armor_horizon.glb',cape:'cape_horizon.glb'}
};
const asset=n=>`assets/equipment/phase9/${n}`;
const className={guerreiro:'Guerreiro',druida:'Druida',mago:'Mago',arqueiro:'Arqueiro'};
const weaponNoun={guerreiro:'Lâmina',druida:'Cajado',mago:'Cetro',arqueiro:'Arco'};
const WEAPON_SCALE={guerreiro:.58,druida:.58,mago:.60,arqueiro:.60};
const OFFHAND_SCALE={guerreiro:.75,druida:.72,mago:.72,arqueiro:.68};
const Q_WEAPON=Object.freeze([0,0,-0.70710678,0.70710678]);
const Q_OFFHAND=Object.freeze([.5,.5,.5,-.5]);
const HELMET_SCALE=.90,HELMET_POSITION=Object.freeze([0,.18,.10]);
const weaponLevels=[8,16,24,32,40,48,56,60];
const weaponTier=['Bruma','Ferro Vivo','Vigília','Orbe','Astral','Fenda','Regente','Soberano'];
const sourceAt={8:'npc',16:'common',24:'giant',32:'dungeon',40:'giant',48:'dungeon',56:'boss',60:'boss'};
for(const cls of Object.keys(CLASS_VISUAL)){
  for(let i=0;i<weaponLevels.length;i++){
    const req=weaponLevels[i],source=sourceAt[req],rarity=SOURCE_RARITY[source],R=RARITIES[rarity],base=req*(cls==='mago'?1.2:cls==='druida'?1.08:1.15)*R.statMult;
    add(`${cls}_arma_${req}`,{name:`${weaponNoun[cls]} ${weaponTier[i]} do ${className[cls]}`,slot:'arma',req,cls,atk:[Math.round(base*.86),Math.round(base*1.18)],source,rarity,tier:i+1,model:asset(CLASS_VISUAL[cls].weapon),visualSlot:'weapon',modelScale:WEAPON_SCALE[cls],modelQuaternion:Q_WEAPON,affixBias:cls==='guerreiro'?['str','sta']:cls==='druida'?['int','healing']:cls==='mago'?['int','atkPct']:['dex','crit']});
  }
}


// Fase 11: recompensas da Cripta dos Ecos (20-30), uma arma rara funcional por classe.
for(const cls of Object.keys(CLASS_VISUAL)){
 const req=28,base=req*(cls==='mago'?1.2:cls==='druida'?1.08:1.15)*RARITIES.raro.statMult;
 add(cls+'_eco_28',{name:weaponNoun[cls]+' dos Ecos',slot:'arma',req,cls,atk:[Math.round(base*.86),Math.round(base*1.18)],source:'dungeon',rarity:'raro',tier:3,model:asset(CLASS_VISUAL[cls].weapon),visualSlot:'weapon',modelScale:WEAPON_SCALE[cls],modelQuaternion:Q_WEAPON,affixBias:cls==='guerreiro'?['str','sta']:cls==='druida'?['int','healing']:cls==='mago'?['int','atkPct']:['dex','crit']});
}

const setTiers=[
  {req:20,key:'vigilia',source:'giant',rarity:'raro',label:'Vigília'},
  {req:40,key:'astral',source:'dungeon',rarity:'epico',label:'Astral'},
  {req:60,key:'soberano',source:'boss',rarity:'lendario',label:'Soberano'}
];
const pieces=[
  {slot:'capacete',label:'Elmo',def:.32,visualSlot:'head',model:'helmet'},
  {slot:'peitoral',label:'Peitoral',def:.55,visualSlot:'chest',model:'chest'},
  {slot:'luvas',label:'Manoplas',def:.2,visualSlot:'hands'},
  {slot:'botas',label:'Botas',def:.24,visualSlot:'feet'},
  {slot:'capa',label:'Capa',def:.12,visualSlot:'back',model:'cape'}
];
const setFamily={guerreiro:'Bastião',druida:'Aurora',mago:'Eclipse',arqueiro:'Horizonte'};
for(const cls of Object.keys(CLASS_VISUAL)){
  for(const tier of setTiers){
    const R=RARITIES[tier.rarity],setId=`${cls}_${tier.key}`;
    for(const piece of pieces){
      const model=piece.model?asset(CLASS_VISUAL[cls][piece.model]):null;
      add(`${setId}_${piece.slot}`,{name:`${piece.label} ${setFamily[cls]} ${tier.label}`,slot:piece.slot,req:tier.req,cls,def:Math.max(1,Math.round(tier.req*piece.def*R.statMult)),source:tier.source,rarity:tier.rarity,setId,model,visualSlot:piece.visualSlot,modelScale:piece.slot==='capacete'?HELMET_SCALE:null,modelPosition:piece.slot==='capacete'?HELMET_POSITION:null,affixBias:cls==='guerreiro'?['sta','defPct']:cls==='druida'?['int','healing']:cls==='mago'?['int','mpPct']:['dex','crit']});
    }
  }
}

const offhandName={guerreiro:'Escudo Bastião',druida:'Totem Verdejante',mago:'Grimório Arcano',arqueiro:'Aljava Horizonte'};
for(const cls of Object.keys(CLASS_VISUAL)){
  for(const tier of setTiers){
    add(`${cls}_offhand_${tier.req}`,{name:`${offhandName[cls]} ${tier.label}`,slot:'offhand',req:tier.req,cls,def:Math.round(tier.req*(cls==='guerreiro'?.28:.12)*RARITIES[tier.rarity].statMult),source:tier.source,rarity:tier.rarity,tier:tier.req/20,model:asset(CLASS_VISUAL[cls].offhand),visualSlot:'offhand',modelScale:OFFHAND_SCALE[cls],modelQuaternion:Q_OFFHAND,affixBias:cls==='guerreiro'?['sta','defPct']:cls==='druida'?['healing','mpPct']:cls==='mago'?['int','crit']:['dex','attackSpeed']});
  }
}

const accessories=[
  ['guerreiro','selo_bastiao_40','Selo do Bastião Astral','acessorio1',40,'dungeon','epico',['sta','hpPct']],
  ['guerreiro','medalha_regente_60','Medalha do Regente','acessorio2',60,'boss','lendario',['str','defPct']],
  ['druida','broche_aurora_40','Broche da Aurora Astral','acessorio1',40,'dungeon','epico',['int','healing']],
  ['druida','relicario_vida_60','Relicário da Vida Soberana','acessorio2',60,'boss','lendario',['healing','mpPct']],
  ['mago','anel_eclipse_40','Anel do Eclipse Astral','acessorio1',40,'dungeon','epico',['int','atkPct']],
  ['mago','sigilo_arcano_60','Sigilo Arcano Soberano','acessorio2',60,'boss','lendario',['crit','dot']],
  ['arqueiro','anel_horizonte_40','Anel do Horizonte Astral','acessorio1',40,'dungeon','epico',['dex','crit']],
  ['arqueiro','insignia_predador_60','Insígnia do Predador Soberano','acessorio2',60,'boss','lendario',['attackSpeed','range']]
];
for(const [cls,id,name,slot,req,source,rarity,affixBias] of accessories)add(id,{name,slot,req,cls,source,rarity,affixBias});

module.exports=Object.freeze(E);