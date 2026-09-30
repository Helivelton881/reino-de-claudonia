'use strict';

const SKILLS=require('../data/skills');
const NPCS=require('../data/npcs');

const VERSION=1;
const TRAINERS={guerreiro:'guerreiro',druida:'druida',mago:'mago',arqueiro:'arqueiro'};

class SkillManager{
  constructor({send,now=Date.now}){this.send=send;this.now=now;}
  classOf(player){return player.dados&&player.dados.cls||'aprendiz';}
  levelOf(player){return Math.max(1,Math.floor(player.L||player.dados&&player.dados.L||1));}
  totalPoints(player){return Math.floor(this.levelOf(player)/2);}

  ensureState(player){
    const d=player.dados||(player.dados={});
    let state=d.skillTree;
    if(!state||state.version!==VERSION||!state.ranks||typeof state.ranks!=='object'){
      const legacy=!state,ranks={};
      if(legacy){
        const cls=this.classOf(player),level=this.levelOf(player);
        for(const [id,sk] of Object.entries(SKILLS))if(sk.cls===cls&&level>=sk.req)ranks[id]=1;
      }
      state={version:VERSION,ranks,legacyUnlocks:legacy?Object.keys(ranks):[],specialization:null,respecs:0};
      d.skillTree=state;player.dirty=true;
    }
    const clean={};
    for(const [id,val] of Object.entries(state.ranks||{})){
      const sk=SKILLS[id],n=Math.floor(Number(val)||0);
      if(sk&&n>0)clean[id]=Math.min(sk.maxRank||1,n);
    }
    if(!Array.isArray(state.legacyUnlocks))state.legacyUnlocks=[];
    const legacyUnlocks=new Set(state.legacyUnlocks.filter(id=>SKILLS[id]));
    state.legacyUnlocks=[...legacyUnlocks];
    const cls=this.classOf(player),level=this.levelOf(player),sanitized={};
    let remaining=this.totalPoints(player);
    const ordered=Object.values(SKILLS).filter(sk=>sk.cls===cls&&level>=sk.req).sort((a,b)=>(a.tree&&a.tree.row||0)-(b.tree&&b.tree.row||0));
    const effective=id=>{const sk=SKILLS[id];if(!sk||sk.cls!==cls||level<sk.req)return 0;return Math.max(sk.autoRank1?1:0,Math.floor(sanitized[id]||0));};
    for(const sk of ordered){
      const base=sk.autoRank1?1:0;
      let target=Math.min(sk.maxRank||1,Math.floor(clean[sk.id]||0));
      const prereq=(sk.requires||[]).every(req=>effective(req.id)>=req.rank),legacyOne=legacyUnlocks.has(sk.id)&&target>=1;
      if(!prereq&&!legacyOne)continue;
      if(!prereq&&legacyOne)target=1;
      const extra=Math.min(Math.max(0,target-base),remaining);
      const allowed=base+extra;
      if(allowed>base||(!sk.autoRank1&&allowed>0))sanitized[sk.id]=allowed;
      remaining-=extra;
    }
    state.ranks=sanitized;
    if(!Number.isInteger(state.respecs)||state.respecs<0)state.respecs=0;
    if(state.specialization!==null&&typeof state.specialization!=='string')state.specialization=null;
    return state;
  }

  baseRank(player,id){
    const sk=SKILLS[id];if(!sk)return 0;
    if(sk.cls!==this.classOf(player)||this.levelOf(player)<sk.req)return 0;
    return sk.autoRank1?1:0;
  }

  rank(player,id){
    const state=this.ensureState(player),sk=SKILLS[id];if(!sk)return 0;
    if(sk.cls!==this.classOf(player)||this.levelOf(player)<sk.req)return 0;
    return Math.max(this.baseRank(player,id),Math.min(sk.maxRank||1,Math.floor(state.ranks[id]||0)));
  }

  spentPoints(player){
    const state=this.ensureState(player),cls=this.classOf(player);
    let spent=0;
    for(const [id,sk] of Object.entries(SKILLS)){
      if(sk.cls!==cls)continue;
      const stored=Math.min(sk.maxRank||1,Math.floor(state.ranks[id]||0));
      spent+=Math.max(0,stored-this.baseRank(player,id));
    }
    return spent;
  }
  availablePoints(player){return Math.max(0,this.totalPoints(player)-this.spentPoints(player));}
  prerequisitesMet(player,sk){
    for(const req of sk.requires||[])if(this.rank(player,req.id)<req.rank)return false;
    return true;
  }

  resolved(player,id){
    const sk=SKILLS[id],rank=this.rank(player,id);
    if(!sk||rank<1)return null;
    const rv=sk.ranks[Math.min(rank,sk.ranks.length)-1]||{};
    return {...sk,...rv,rank};
  }

  publicCatalog(){
    return Object.values(SKILLS).map(sk=>({
      id:sk.id,cls:sk.cls,name:sk.name,icon:sk.icon,req:sk.req,type:sk.type,target:sk.target,
      fp:sk.fp||0,mp:sk.mp||0,cooldown:sk.cooldown,maxRank:sk.maxRank||1,autoRank1:!!sk.autoRank1,
      description:sk.description||'',requires:(sk.requires||[]).map(x=>({...x})),tree:{...(sk.tree||{})},
      ranks:sk.ranks.map((r,i)=>({rank:i+1,multiplier:r.multiplier||null,healPower:r.healPower||null,buff:r.buff?{...r.buff}:null,radius:r.radius||sk.radius||null,slow:r.slow||sk.slow||null,critAdd:r.critAdd||sk.critAdd||null}))
    }));
  }

  snapshot(player){
    this.ensureState(player);
    const ranks={};
    for(const id of Object.keys(SKILLS)){const r=this.rank(player,id);if(r>0)ranks[id]=r;}
    return {version:VERSION,cls:this.classOf(player),level:this.levelOf(player),total:this.totalPoints(player),spent:this.spentPoints(player),available:this.availablePoints(player),ranks,specialization:player.dados.skillTree.specialization,respecs:player.dados.skillTree.respecs};
  }
  learn(player,id){
    const sk=SKILLS[id],state=this.ensureState(player);
    if(!sk||sk.cls!==this.classOf(player))return this.fail(player,'Habilidade incompatível com sua classe.');
    if(this.levelOf(player)<sk.req)return this.fail(player,'Requer nível '+sk.req+'.');
    if(!this.prerequisitesMet(player,sk))return this.fail(player,'Pré-requisitos da árvore ainda não foram cumpridos.');
    const current=this.rank(player,id),next=current+1;
    if(next>(sk.maxRank||1))return this.fail(player,'Habilidade já está no rank máximo.');
    if(this.availablePoints(player)<1)return this.fail(player,'Você não possui pontos de habilidade disponíveis.');
    state.ranks[id]=next;player.dirty=true;
    this.sync(player,{event:'learned',skillId:id});
    return true;
  }

  trainerFor(player,npcId){
    const expected=TRAINERS[this.classOf(player)];
    if(!expected||npcId!==expected)return null;
    const npc=NPCS.find(n=>n.id===npcId);if(!npc)return null;
    if(Math.hypot(player.x-npc.x,player.z-npc.z)>3.6)return null;
    return npc;
  }

  respec(player,npcId){
    const npc=this.trainerFor(player,npcId);
    if(!npc)return this.fail(player,'Fale com o mestre da sua classe para redefinir a árvore.');
    const state=this.ensureState(player);
    state.ranks={};state.legacyUnlocks=[];state.respecs++;player.dirty=true;
    this.sync(player,{event:'respec',npcId:npc.id});
    return true;
  }
  onClassChange(player){
    player.dados.skillTree={version:VERSION,ranks:{},specialization:null,respecs:0};
    player.dirty=true;this.sync(player,{event:'class-change'});
  }

  initializePlayer(player){this.ensureState(player);return this.snapshot(player);}
  sync(player,extra={}){this.send(player.ws,{t:'skillTreeState',state:this.snapshot(player),...extra});}
  fail(player,msg){this.send(player.ws,{t:'skillTreeState',ok:false,msg,state:this.snapshot(player)});return false;}
}

module.exports=SkillManager;