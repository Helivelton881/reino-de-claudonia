'use strict';

const {RARITIES}=require('./rarities');

const TABLES=Object.freeze({
  1:Object.freeze(['str','sta','dex','int','hpPct','mpPct']),
  20:Object.freeze(['str','sta','dex','int','hpPct','mpPct','fpPct','atkPct','defPct']),
  40:Object.freeze(['str','sta','dex','int','hpPct','mpPct','fpPct','atkPct','defPct','crit','attackSpeed','healing']),
  60:Object.freeze(['str','sta','dex','int','hpPct','mpPct','fpPct','atkPct','defPct','crit','attackSpeed','healing','dot','partyDamage','range'])
});

const DISPLAY=Object.freeze({
  str:'Força',sta:'Vigor',dex:'Destreza',int:'Inteligência',
  hpPct:'Vida',mpPct:'Mana',fpPct:'Energia',atkPct:'Ataque',defPct:'Defesa',
  crit:'Crítico',attackSpeed:'Velocidade de ataque',healing:'Cura',dot:'Dano contínuo',partyDamage:'Dano de grupo',range:'Alcance'
});

function bracket(level){
  if(level>=55)return 60;
  if(level>=35)return 40;
  if(level>=18)return 20;
  return 1;
}

function poolFor(level,cls,slot){
  let pool=[...TABLES[bracket(level)]];
  const preferred={
    guerreiro:['str','sta','hpPct','defPct','atkPct'],
    druida:['int','sta','healing','mpPct','defPct'],
    mago:['int','mpPct','atkPct','crit','dot'],
    arqueiro:['dex','crit','attackSpeed','atkPct','range']
  }[cls]||[];
  if(slot==='acessorio1'||slot==='acessorio2')pool=[...new Set([...preferred,...pool])];
  else pool=[...preferred,...pool.filter(x=>!preferred.includes(x))];
  return pool;
}

function rollValue(stat,level,rarityRank,rng=Math.random){
  const t=Math.max(1,Math.floor(level));
  const scale=1+rarityRank*.18;
  if(['str','sta','dex','int'].includes(stat))return Math.max(1,Math.round((1+t/16)*scale*(.85+rng()*.3)));
  if(stat==='range')return +(0.25+(t/60)*.5+rarityRank*.08).toFixed(2);
  const base={
    hpPct:.018,mpPct:.018,fpPct:.015,atkPct:.012,defPct:.012,crit:.007,
    attackSpeed:.009,healing:.012,dot:.012,partyDamage:.008
  }[stat]||.01;
  return +(base*(1+t/45)*(1+rarityRank*.22)*(.85+rng()*.3)).toFixed(4);
}

function rollAffixes(item,rng=Math.random){
  const rarity=RARITIES[item.rarity]||RARITIES.comum;
  const count=Math.max(0,rarity.affixes||0);
  const preferred=Array.isArray(item.affixBias)?item.affixBias:[];
  const available=[...new Set([...preferred,...poolFor(item.req||1,item.cls,item.slot)])].filter(x=>DISPLAY[x]);
  const picked=[];
  while(picked.length<count&&available.length){
    const idx=Math.min(available.length-1,Math.floor(Math.max(0,Math.min(.999999,Number(rng())||0))*available.length));
    const [stat]=available.splice(idx,1);
    picked.push({stat,value:rollValue(stat,item.req||1,rarity.rank,rng),name:DISPLAY[stat]||stat});
  }
  return picked;
}

function publicAffixName(a){
  if(!a)return'';
  const pct=!['str','sta','dex','int','range'].includes(a.stat);
  return `${DISPLAY[a.stat]||a.stat} +${pct?(a.value*100).toFixed(1)+'%':a.value}`;
}

module.exports={TABLES,DISPLAY,poolFor,rollValue,rollAffixes,publicAffixName};
