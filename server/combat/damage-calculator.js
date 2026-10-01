'use strict';

const EQUIPMENT=require('../data/equipment');
const SETS=require('../data/items/sets');
const CARDS=require('../data/items/cards');
const {CLASSES}=require('../data/classes');

const UP_ATK=[0,2,4,6,8,10,13,16,19,21,24];
const UP_DEF=[0,2,4,6,8,10,12,14,16,18,20];
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number(n)||0));
const EQUIP_SLOTS=['arma','offhand','capacete','peitoral','luvas','botas','capa','acessorio1','acessorio2'];

function collectItemBonuses(data={}){
  const eq=data.eq&&typeof data.eq==='object'?data.eq:{};
  const meta=data.eqMeta&&typeof data.eqMeta==='object'?data.eqMeta:{};
  const sets={};
  const out={str:0,sta:0,dex:0,int:0,hpPct:0,mpPct:0,fpPct:0,atkPct:0,defPct:0,crit:0,attackSpeed:0,healing:0,dot:0,partyDamage:0,range:0};
  for(const slot of EQUIP_SLOTS){
    const item=EQUIPMENT[eq[slot]];if(!item)continue;
    if(item.setId)sets[item.setId]=(sets[item.setId]||0)+1;
    const m=meta[slot]||{};
    for(const a of Array.isArray(m.affixes)?m.affixes:[]){if(a&&Object.prototype.hasOwnProperty.call(out,a.stat))out[a.stat]+=Number(a.value)||0;}
    for(const cardId of Array.isArray(m.socketed)?m.socketed:[]){const c=CARDS[cardId];if(c&&Object.prototype.hasOwnProperty.call(out,c.stat))out[c.stat]+=Number(c.value)||0;}
  }
  for(const [setId,count] of Object.entries(sets)){
    const set=SETS[setId];if(!set)continue;
    for(const threshold of [2,3,4]){
      if(count<threshold)continue;
      for(const bonus of set.bonuses[threshold]||[]){
        if(!Object.prototype.hasOwnProperty.call(out,bonus.stat))continue;
        if(bonus.mode==='flat')out[bonus.stat]+=Number(bonus.value)||0;
        else out[bonus.stat]+=Number(bonus.value)||0;
      }
    }
  }
  return {bonuses:out,setCounts:sets};
}

function derivePlayer(data={}){
  const cls=CLASSES[data.cls]?data.cls:'aprendiz',C=CLASSES[cls];
  const level=clamp(Math.floor(data.L||1),1,cls==='aprendiz'?15:100);
  const itemBonus=collectItemBonuses(data).bonuses;
  const stat=key=>clamp(Math.floor(data[key]||15)+Math.floor(itemBonus[key]||0),1,700);
  const eq=data.eq&&typeof data.eq==='object'?data.eq:{};
  const upgrades=data.equp&&typeof data.equp==='object'?data.equp:{};
  const candidateWeapon=EQUIPMENT[eq.arma];
  const weapon=candidateWeapon&&candidateWeapon.req<=level&&(!candidateWeapon.cls||candidateWeapon.cls===cls)?candidateWeapon:null;
  const baseWeapon=weapon&&weapon.atk?weapon.atk:[1,3],weaponUp=Math.floor(clamp(upgrades.arma,0,10)),weaponMultiplier=1+UP_ATK[weaponUp]/100;
  const w=baseWeapon.map(n=>Math.round(n*weaponMultiplier));
  let armor=0;
  for(const slot of ['offhand','capacete','peitoral','luvas','botas','capa']){
    const item=EQUIPMENT[eq[slot]]&&EQUIPMENT[eq[slot]].req<=level&&(!EQUIPMENT[eq[slot]].cls||EQUIPMENT[eq[slot]].cls===cls)?EQUIPMENT[eq[slot]]:null;
    if(item&&item.def)armor+=item.def*(1+UP_DEF[Math.floor(clamp(upgrades[slot],0,10))]/100);
  }
  const stats={str:stat('str'),sta:stat('sta'),dex:stat('dex'),int:stat('int')},main=stats[C.main];
  const atkPct=itemBonus.atkPct||0,defPct=itemBonus.defPct||0;
  return {
    cls,level,...stats,weapon:w,mainStat:C.main,itemBonuses:itemBonus,
    atkMin:(w[0]+main*.5+level*.8)*(1+atkPct),
    atkMax:(w[1]+main*.5+level*.8)*(1+atkPct),
    defense:(stats.sta*.25+armor)*(1+defPct),
    maxHp:Math.round((60+level*12+stats.sta*4)*C.hp*(1+(itemBonus.hpPct||0))),
    maxMp:Math.round((20+level*4+stats.int*(C.mpInt||3))*(1+(itemBonus.mpPct||0))),
    maxFp:Math.round((15+level*3+stats.sta*2)*(1+(itemBonus.fpPct||0))),
    crit:0.03+stats.dex*.0015+(cls==='arqueiro'?0.03+stats.dex*.0008:0)+(itemBonus.crit||0),
    attackSpeed:(1+stats.dex*.006)*(1+(itemBonus.attackSpeed||0)),
    ranged:!!C.ranged,healingBonus:itemBonus.healing||0,dotBonus:itemBonus.dot||0,partyDamage:itemBonus.partyDamage||0,rangeBonus:itemBonus.range||0
  };
}

function playerDamage(stats,monster,options={},rng=Math.random){
  const hitChance=clamp(.88+(stats.level-monster.level)*.02+(stats.dex-15)*.004,.4,.98);
  if(!options.magic&&rng()>hitChance)return{damage:0,miss:true,critical:false};
  const stat=stats[options.stat||stats.mainStat],roll=stats.weapon[0]+rng()*(stats.weapon[1]-stats.weapon[0]);
  const itemAttackBonus=Number(stats.itemBonuses&&stats.itemBonuses.atkPct||0);
  let damage=(roll+stat*.5+stats.level*.8)*(options.multiplier||1)*(1+(options.attackBonus||0)+itemAttackBonus)-monster.defense;
  const critical=rng()<stats.crit+(options.critBonus||0)+(options.critAdd||0);if(critical)damage*=1.8;
  return{damage:Math.max(1,Math.round(damage)),miss:false,critical};
}

function monsterDamage(monster,stats,options={},rng=Math.random){
  const dodge=clamp(.04+(stats.dex-15)*.003+(stats.level-monster.level)*.01,0,.3);if(rng()<dodge)return{damage:0,dodged:true};
  const damage=monster.attack*(.85+rng()*.3)-stats.defense*(1+(options.defenseBonus||0));return{damage:Math.max(1,Math.round(damage)),dodged:false};
}

module.exports={CLASSES,derivePlayer,playerDamage,monsterDamage,collectItemBonuses,UP_ATK,UP_DEF};