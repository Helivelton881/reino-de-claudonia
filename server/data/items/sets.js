'use strict';

const pct=(stat,value)=>Object.freeze({stat,value,mode:'pct'});
const flat=(stat,value)=>Object.freeze({stat,value,mode:'flat'});

const SETS={};
const TIERS=[
  {key:'vigilia',name:'Vigília',req:20},
  {key:'astral',name:'Astral',req:40},
  {key:'soberano',name:'Soberano',req:60}
];
const CLASS_INFO={
  guerreiro:{name:'Bastião',two:[pct('defPct',.05)],three:[pct('hpPct',.06)],four:[pct('atkPct',.06),flat('sta',4)]},
  druida:{name:'Aurora',two:[pct('healing',.06)],three:[pct('mpPct',.08)],four:[pct('defPct',.05),flat('int',4)]},
  mago:{name:'Eclipse',two:[pct('atkPct',.06)],three:[pct('mpPct',.08)],four:[pct('dot',.08),flat('int',4)]},
  arqueiro:{name:'Horizonte',two:[pct('crit',.03)],three:[pct('attackSpeed',.05)],four:[pct('atkPct',.06),flat('dex',4)]}
};

for(const tier of TIERS){
  for(const [cls,info] of Object.entries(CLASS_INFO)){
    const id=`${cls}_${tier.key}`;
    SETS[id]=Object.freeze({
      id,
      cls,
      req:tier.req,
      name:`${info.name} ${tier.name}`,
      bonuses:Object.freeze({
        2:Object.freeze(info.two.map(x=>Object.freeze({...x,value:x.value*(tier.req===60?1.5:tier.req===40?1.25:1)}))),
        3:Object.freeze(info.three.map(x=>Object.freeze({...x,value:x.value*(tier.req===60?1.5:tier.req===40?1.25:1)}))),
        4:Object.freeze(info.four.map(x=>Object.freeze({...x,value:typeof x.value==='number'&&x.mode==='pct'?x.value*(tier.req===60?1.5:tier.req===40?1.25:1):x.value+(tier.req===60?4:tier.req===40?2:0)})))
      })
    });
  }
}

module.exports=Object.freeze(SETS);
