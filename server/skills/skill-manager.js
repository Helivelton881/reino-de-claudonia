'use strict';

const SKILLS=require('../data/skills');
const NPCS=require('../data/npcs');
const {CLASSES,SPECIALIZATIONS,publicCatalog:publicClassCatalog}=require('../data/classes');

const VERSION=2;
const TRAINERS={guerreiro:'guerreiro',druida:'druida',mago:'mago',arqueiro:'arqueiro'};

class SkillManager{
  constructor({send,now=Date.now}){this.send=send;this.now=now;}
  classOf(player){return player.dados&&player.dados.cls||'aprendiz';}
  levelOf(player){return Math.max(1,Math.floor(player.L||player.dados&&player.dados.L||1));}
  totalPoints(player){return Math.floor(this.levelOf(player)/2);}

  migrateState(player){
    const d=player.dados||(player.dados={});
    const old=d.skillTree;
    if(old&&old.version===VERSION&&old.ranks&&typeof old.ranks==='object')return old;
    const ranks={},legacyUnlocks=[];
    if(old&&old.ranks&&typeof old.ranks==='object'){
      for(const [id,v] of Object.entries(old.ranks)){if(SKILLS[id]&&Number(v)>0)ranks[id]=Math.floor(Number(v));}
      if(Array.isArray(old.legacyUnlocks))legacyUnlocks.push(...old.legacyUnlocks.filter(id=>SKILLS[id]));
    }else{
      const cls=this.classOf(player),level=this.levelOf(player);
      for(const [id,sk] of Object.entries(SKILLS)){
        if(sk.cls===cls&&!sk.specialization&&level>=sk.req&&level<=20){ranks[id]=1;legacyUnlocks.push(id);}
      }
    }
    d.skillTree={version:VERSION,ranks,legacyUnlocks:[...new Set(legacyUnlocks)],specialization:old&&typeof old.specialization==='string'?old.specialization:null,respecs:Math.max(0,Math.floor(old&&old.respecs||0))};
    player.dirty=true;return d.skillTree;
  }

  validSpecialization(player,id){
    const spec=SPECIALIZATIONS[id],cls=this.classOf(player);
    return !!spec&&spec.baseClass===cls;
  }

  ensureState(player){
    const state=this.migrateState(player),cls=this.classOf(player),level=this.levelOf(player);
    if(state.specialization&&!this.validSpecialization(player,state.specialization))state.specialization=null;
    const clean={};
    for(const [id,val] of Object.entries(state.ranks||{})){
      const sk=SKILLS[id],n=Math.floor(Number(val)||0);
      if(sk&&sk.cls===cls&&n>0&&level>=sk.req&&(!sk.specialization||sk.specialization===state.specialization))clean[id]=Math.min(sk.maxRank||1,n);
    }
    const legacyUnlocks=new Set((state.legacyUnlocks||[]).filter(id=>SKILLS[id]&&SKILLS[id].cls===cls));
    state.legacyUnlocks=[...legacyUnlocks];
    const sanitized={};let remaining=this.totalPoints(player);
    const ordered=Object.values(SKILLS).filter(sk=>sk.cls===cls&&level>=sk.req&&(!sk.specialization||sk.specialization===state.specialization)).sort((a,b)=>(a.tree?.row||0)-(b.tree?.row||0));
    const effective=id=>{const sk=SKILLS[id];if(!sk||sk.cls!==cls||level<sk.req)return 0;return Math.max(sk.autoRank1?1:0,Math.floor(sanitized[id]||0));};
    for(const sk of ordered){
      const base=sk.autoRank1?1:0;let target=Math.min(sk.maxRank||1,Math.floor(clean[sk.id]||0));
      const prereq=(sk.requires||[]).every(req=>effective(req.id)>=req.rank),legacyOne=legacyUnlocks.has(sk.id)&&target>=1;
      if(!prereq&&!legacyOne)continue;if(!prereq&&legacyOne)target=1;
      const extra=Math.min(Math.max(0,target-base),remaining),allowed=base+extra;
      if(allowed>base||(!sk.autoRank1&&allowed>0))sanitized[sk.id]=allowed;
      remaining-=extra;
    }
    state.ranks=sanitized;
    if(!Number.isInteger(state.respecs)||state.respecs<0)state.respecs=0;
    return state;
  }

  baseRank(player,id){
    const sk=SKILLS[id],state=this.ensureState(player);
    if(!sk||sk.cls!==this.classOf(player)||this.levelOf(player)<sk.req)return 0;
    if(sk.specialization&&state.specialization!==sk.specialization)return 0;
    return sk.autoRank1?1:0;
  }
  rank(player,id){
    const state=this.ensureState(player),sk=SKILLS[id];if(!sk)return 0;
    if(sk.cls!==this.classOf(player)||this.levelOf(player)<sk.req)return 0;
    if(sk.specialization&&state.specialization!==sk.specialization)return 0;
    return Math.max(this.baseRank(player,id),Math.min(sk.maxRank||1,Math.floor(state.ranks[id]||0)));
  }
  spentPoints(player){
    const state=this.ensureState(player),cls=this.classOf(player);let spent=0;
    for(const [id,sk] of Object.entries(SKILLS)){
      if(sk.cls!==cls||sk.specialization&&sk.specialization!==state.specialization)continue;
      const stored=Math.min(sk.maxRank||1,Math.floor(state.ranks[id]||0));spent+=Math.max(0,stored-this.baseRank(player,id));
    }
    return spent;
  }
  availablePoints(player){return Math.max(0,this.totalPoints(player)-this.spentPoints(player));}
  prerequisitesMet(player,sk){return (sk.requires||[]).every(req=>this.rank(player,req.id)>=req.rank);}

  resolved(player,id){
    const sk=SKILLS[id],rank=this.rank(player,id);if(!sk||rank<1||sk.type==='passive')return null;
    const rv=sk.ranks[Math.min(rank,sk.ranks.length)-1]||{};return {...sk,...rv,rank};
  }

  statBonuses(player){
    const state=this.ensureState(player),out={atk:0,def:0,hp:0,mp:0,fp:0,crit:0,attackSpeed:0,range:0,healing:0,magicAtk:0,dot:0,partyDamage:0};
    const spec=state.specialization&&SPECIALIZATIONS[state.specialization];
    if(spec)for(const [k,v] of Object.entries(spec.bonuses||{}))out[k]=(out[k]||0)+Number(v||0);
    for(const [id,sk] of Object.entries(SKILLS)){
      if(sk.type!=='passive')continue;const rank=this.rank(player,id);if(rank<1)continue;
      const rv=sk.ranks[Math.min(rank,sk.ranks.length)-1]||{};
      for(const [k,v] of Object.entries(rv.passive||{}))out[k]=(out[k]||0)+Number(v||0);
    }
    return out;
  }

  publicCatalog(){
    return Object.values(SKILLS).map(sk=>({
      id:sk.id,cls:sk.cls,specialization:sk.specialization||null,name:sk.name,icon:sk.icon,req:sk.req,type:sk.type,target:sk.target,around:sk.around||null,
      radius:sk.radius||null,range:sk.range||0,fp:sk.fp||0,mp:sk.mp||0,cooldown:sk.cooldown,maxRank:sk.maxRank||1,autoRank1:!!sk.autoRank1,magic:!!sk.magic,stat:sk.stat||null,
      description:sk.description||'',requires:(sk.requires||[]).map(x=>({...x})),tree:{...(sk.tree||{})},
      ranks:sk.ranks.map((r,i)=>({rank:i+1,multiplier:r.multiplier??null,healPower:r.healPower??null,buff:r.buff?{...r.buff}:null,passive:r.passive?{...r.passive}:null,debuff:r.debuff?{...r.debuff}:null,dot:r.dot?{...r.dot}:null,cc:r.cc?{...r.cc}:null,radius:r.radius??sk.radius??null,slow:r.slow??sk.slow??null,critAdd:r.critAdd??sk.critAdd??null}))
    }));
  }
  classCatalog(){return publicClassCatalog();}

  snapshot(player){
    const state=this.ensureState(player),ranks={};
    for(const id of Object.keys(SKILLS)){const r=this.rank(player,id);if(r>0)ranks[id]=r;}
    const spec=state.specialization?SPECIALIZATIONS[state.specialization]:null;
    return {version:VERSION,cls:this.classOf(player),level:this.levelOf(player),total:this.totalPoints(player),spent:this.spentPoints(player),available:this.availablePoints(player),ranks,specialization:state.specialization,specializationName:spec?.name||null,role:spec?.role||CLASSES[this.classOf(player)]?.role||null,respecs:state.respecs};
  }

  learn(player,id){
    const sk=SKILLS[id],state=this.ensureState(player);
    if(!sk||sk.cls!==this.classOf(player))return this.fail(player,'Habilidade incompatível com sua classe.');
    if(sk.specialization&&state.specialization!==sk.specialization)return this.fail(player,'Essa habilidade pertence a outra especialização.');
    if(sk.type==='passive'&&sk.autoRank1)return this.fail(player,'Passiva automática.');
    if(this.levelOf(player)<sk.req)return this.fail(player,'Requer nível '+sk.req+'.');
    if(!this.prerequisitesMet(player,sk))return this.fail(player,'Pré-requisitos da árvore ainda não foram cumpridos.');
    const next=this.rank(player,id)+1;if(next>(sk.maxRank||1))return this.fail(player,'Habilidade já está no rank máximo.');
    if(this.availablePoints(player)<1)return this.fail(player,'Você não possui pontos de habilidade disponíveis.');
    state.ranks[id]=next;player.dirty=true;this.sync(player,{event:'learned',skillId:id});return true;
  }

  trainerFor(player,npcId){
    const expected=TRAINERS[this.classOf(player)];if(!expected||npcId!==expected)return null;
    const npc=NPCS.find(n=>n.id===npcId);if(!npc)return null;
    if(Math.hypot(player.x-npc.x,player.z-npc.z)>3.6)return null;return npc;
  }
  respec(player,npcId){
    const npc=this.trainerFor(player,npcId);if(!npc)return this.fail(player,'Fale com o mestre da sua classe para redefinir a árvore.');
    const state=this.ensureState(player);state.ranks={};state.legacyUnlocks=[];state.respecs++;player.dirty=true;this.sync(player,{event:'respec',npcId:npc.id});return true;
  }
  chooseSpecialization(player,specId,npcId){
    const state=this.ensureState(player),spec=SPECIALIZATIONS[specId];
    if(this.levelOf(player)<60)return this.fail(player,'Especialização libera no nível 60.');
    if(!spec||spec.baseClass!==this.classOf(player))return this.fail(player,'Especialização incompatível com sua classe.');
    if(state.specialization)return this.fail(player,'Especialização já definida para este personagem.');
    const npc=this.trainerFor(player,npcId);if(!npc)return this.fail(player,'Escolha a especialização junto ao mestre da sua classe.');
    state.specialization=specId;player.dirty=true;this.sync(player,{event:'specialization',specialization:specId,npcId:npc.id});return true;
  }
  onClassChange(player){player.dados.skillTree={version:VERSION,ranks:{},legacyUnlocks:[],specialization:null,respecs:0};player.dirty=true;this.sync(player,{event:'class-change'});}
  initializePlayer(player){this.ensureState(player);return this.snapshot(player);}
  sync(player,extra={}){this.send(player.ws,{t:'skillTreeState',state:this.snapshot(player),...extra});}
  fail(player,msg){this.send(player.ws,{t:'skillTreeState',ok:false,msg,state:this.snapshot(player)});return false;}
}

module.exports=SkillManager;