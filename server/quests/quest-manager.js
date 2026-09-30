'use strict';

const QUESTS = require('../data/quests');
const NPCS = require('../data/npcs');
const { ZONES } = require('../data/monsters');

const CLASS_QUEST_BY_CLASS = Object.freeze(
  Object.fromEntries(Object.values(QUESTS).filter(q=>q.reward&&q.reward.classId).map(q=>[q.reward.classId,q.id]))
);

class QuestManager {
  constructor({send, now=Date.now}) {
    this.send=send;
    this.now=now;
  }

  initializePlayer(player) {
    const state=this.ensureState(player);
    this.migrateLegacy(player,state);
    this.migrateHistoricalClass(player,state);
    this.syncLegacy(player,state);
    return state;
  }

  ensureState(player) {
    const d=player.dados||(player.dados={});
    let q=d.quests;
    if(!q||typeof q!=='object'||Array.isArray(q)) q={};
    if(!q.active||typeof q.active!=='object'||Array.isArray(q.active)) q.active={};
    if(!Array.isArray(q.completed)) q.completed=[];
    q.completed=[...new Set(q.completed.filter(id=>typeof id==='string'&&QUESTS[id]))];
    d.quests=q;
    return q;
  }

  migrateLegacy(player,state=this.ensureState(player)) {
    const legacy=player.dados&&player.dados.quest;
    const cls=legacy&&legacy.cls;
    const questId=cls&&CLASS_QUEST_BY_CLASS[cls];
    if(!questId||state.completed.includes(questId)||state.active[questId]) return false;
    state.active[questId]={startedAt:this.now(),progress:{}};
    player.dirty=true;
    return true;
  }

  migrateHistoricalClass(player,state=this.ensureState(player)) {
    const cls=player.dados&&player.dados.cls;
    const questId=cls&&CLASS_QUEST_BY_CLASS[cls];
    if(!questId||cls==='aprendiz') return false;
    let changed=false;
    if(state.active[questId]){delete state.active[questId];changed=true;}
    if(!state.completed.includes(questId)){state.completed.push(questId);changed=true;}
    if(changed)player.dirty=true;
    return changed;
  }

  syncLegacy(player,state=this.ensureState(player)) {
    const activeClass=Object.keys(state.active).find(id=>QUESTS[id]&&QUESTS[id].category==='class-trial');
    if(activeClass){
      const def=QUESTS[activeClass];
      player.dados.quest={id:activeClass,cls:def.reward.classId};
    }else player.dados.quest=null;
  }

  publicCatalog() {
    return Object.values(QUESTS).map(q=>({
      id:q.id,title:q.title,description:q.description||'',npcId:q.npcId,category:q.category,exclusiveGroup:q.exclusiveGroup||null,
      abandonable:q.abandonable!==false,
      requirements:{...(q.requirements||{})},
      objectives:(q.objectives||[]).map(o=>({...o})),
      reward:q.reward?{...q.reward}:null
    }));
  }

  snapshot(player) {
    const state=this.initializePlayer(player);
    const active=Object.keys(state.active).filter(id=>QUESTS[id]).map(id=>this.publicQuestState(player,id));
    return {active,completed:[...state.completed]};
  }

  publicQuestState(player,id) {
    const def=QUESTS[id],state=this.ensureState(player),entry=state.active[id];
    if(!def||!entry) return null;
    return {
      id,
      startedAt:entry.startedAt||0,
      objectives:def.objectives.map((o,index)=>({
        index,type:o.type,label:o.label||o.type,current:this.objectiveProgress(player,id,index),required:o.count||1
      }))
    };
  }

  requirementError(player,def) {
    const req=def.requirements||{};
    const level=Number(player.L||player.dados&&player.dados.L)||1;
    const cls=player.dados&&player.dados.cls||'aprendiz';
    if(req.level&&level<req.level) return `Requer nível ${req.level}.`;
    if(req.cls&&cls!==req.cls) return 'Sua classe atual não pode iniciar esta missão.';
    if(req.clsNot&&cls===req.clsNot) return 'Sua classe atual não pode iniciar esta missão.';
    const state=this.ensureState(player);
    if(req.completedQuest){
      const list=Array.isArray(req.completedQuest)?req.completedQuest:[req.completedQuest];
      if(list.some(id=>!state.completed.includes(id))) return 'Pré-requisito de missão não concluído.';
    }
    if(req.completedAny){
      const list=Array.isArray(req.completedAny)?req.completedAny:[req.completedAny];
      if(!list.some(id=>state.completed.includes(id))) return 'Pré-requisito de missão não concluído.';
    }
    return null;
  }

  accept(player,id) {
    const def=QUESTS[id],state=this.ensureState(player);
    if(!def) return this.fail(player,'Missão inválida.');
    if(state.completed.includes(id)) return this.fail(player,'Esta missão já foi concluída.');
    if(state.active[id]) return this.fail(player,'Esta missão já está ativa.');
    const reqErr=this.requirementError(player,def);
    if(reqErr) return this.fail(player,reqErr);
    if(def.exclusiveGroup){
      const conflict=Object.keys(state.active).find(qid=>QUESTS[qid]&&QUESTS[qid].exclusiveGroup===def.exclusiveGroup);
      if(conflict) return this.fail(player,'Você já está realizando outra missão desse tipo.');
    }
    state.active[id]={startedAt:this.now(),progress:{}};
    this.syncLegacy(player,state);
    player.dirty=true;
    this.sync(player,{event:'accepted',questId:id});
    return true;
  }

  abandon(player,id) {
    const def=QUESTS[id],state=this.ensureState(player);
    if(!def||!state.active[id]) return this.fail(player,'Missão não está ativa.');
    if(def.abandonable===false) return this.fail(player,'Esta missão não pode ser abandonada.');
    delete state.active[id];
    this.syncLegacy(player,state);
    player.dirty=true;
    this.sync(player,{event:'abandoned',questId:id});
    return true;
  }

  itemCount(player,itemId) {
    const inv=Array.isArray(player.dados&&player.dados.inv)?player.dados.inv:[];
    return inv.filter(x=>x&&x.id===itemId).reduce((n,x)=>n+Math.max(0,Math.floor(Number(x.n)||0)),0);
  }

  reservedItemIds(player) {
    const state=this.ensureState(player),ids=new Set();
    for(const id of Object.keys(state.active)){
      const def=QUESTS[id]; if(!def) continue;
      for(const o of (def.objectives||[])) if((o.type==='collect'||o.type==='delivery')&&o.itemId) ids.add(o.itemId);
    }
    return ids;
  }

  removeItem(player,itemId,count) {
    let left=Math.max(0,Math.floor(Number(count)||0));
    const inv=Array.isArray(player.dados&&player.dados.inv)?player.dados.inv:[];
    if(this.itemCount(player,itemId)<left) return false;
    for(let i=inv.length-1;i>=0&&left>0;i--){
      const s=inv[i]; if(!s||s.id!==itemId) continue;
      const n=Math.max(0,Math.floor(Number(s.n)||0)),take=Math.min(n,left);
      s.n=n-take; left-=take; if(s.n<=0) inv.splice(i,1);
    }
    return left===0;
  }

  consumeDeliveries(player,def) {
    const deliveries=(def.objectives||[]).filter(o=>o.type==='delivery');
    if(deliveries.some(o=>this.itemCount(player,o.itemId)<(o.count||1))) return false;
    for(const o of deliveries) if(!this.removeItem(player,o.itemId,o.count||1)) return false;
    return true;
  }

  talk(player,npcId) {
    if(typeof npcId!=='string') return false;
    const npc=NPCS.find(n=>n.id===npcId); if(!npc) return false;
    if(Math.hypot(player.x-npc.x,player.z-npc.z)>3.6) return false;
    return this.recordEvent(player,'talk',{npcId,count:1});
  }

  recordPosition(player,x,z) {
    if(!Number.isFinite(x)||!Number.isFinite(z)) return false;
    const state=this.ensureState(player);
    let changed=false;
    for(const [id,entry] of Object.entries(state.active)){
      const def=QUESTS[id]; if(!def) continue;
      def.objectives.forEach((o,index)=>{
        if(o.type!=='explore') return;
        const zone=ZONES[o.areaId]; if(!zone) return;
        const need=o.count||1,current=Math.max(0,Math.floor(Number(entry.progress[index])||0));
        if(current>=need) return;
        const radius=Math.max(2,Number(o.radius)||zone.radius*.8);
        if(Math.hypot(x-zone.x,z-zone.z)<=radius){entry.progress[index]=need;changed=true;}
      });
    }
    if(changed){player.dirty=true;this.sync(player,{event:'progress'});}
    return changed;
  }

  objectiveProgress(player,id,index) {
    const def=QUESTS[id],state=this.ensureState(player),entry=state.active[id];
    if(!def||!entry||!def.objectives[index]) return 0;
    const o=def.objectives[index],need=o.count||1;
    if(o.type==='collect'||o.type==='delivery') return Math.min(need,this.itemCount(player,o.itemId));
    return Math.min(need,Math.max(0,Math.floor(Number(entry.progress&&entry.progress[index])||0)));
  }

  ready(player,id) {
    const def=QUESTS[id],state=this.ensureState(player);
    if(!def||!state.active[id]) return false;
    return def.objectives.every((o,index)=>this.objectiveProgress(player,id,index)>=(o.count||1));
  }

  turnIn(player,id,handlers={}) {
    const def=QUESTS[id],state=this.ensureState(player);
    if(!def||!state.active[id]) return this.fail(player,'Missão não está ativa.');
    if(!this.ready(player,id)) return this.fail(player,'Os objetivos da missão ainda não foram concluídos.');
    if(def.reward&&def.reward.classId){
      if(typeof handlers.changeClass!=='function'||handlers.changeClass(player,def.reward.classId)!==true)
        return this.fail(player,'Não foi possível concluir a troca de classe.');
    }
    const hasGenericReward=def.reward&&(def.reward.exp||def.reward.gold||(Array.isArray(def.reward.items)&&def.reward.items.length));
    if(hasGenericReward){
      if(typeof handlers.grantReward!=='function'||handlers.grantReward(player,def.reward,def)!==true)
        return this.fail(player,'Não foi possível aplicar a recompensa da missão.');
    }
    if(!this.consumeDeliveries(player,def)) return this.fail(player,'Os itens de entrega não estão mais no inventário.');
    delete state.active[id];
    if(!state.completed.includes(id)) state.completed.push(id);
    this.syncLegacy(player,state);
    player.dirty=true;
    this.sync(player,{event:'completed',questId:id,inventory:Array.isArray(player.dados.inv)?player.dados.inv:[]});
    return true;
  }

  recordEvent(player,type,payload={}) {
    const state=this.ensureState(player);
    let changed=false;
    for(const [id,entry] of Object.entries(state.active)){
      const def=QUESTS[id]; if(!def) continue;
      def.objectives.forEach((o,index)=>{
        if(o.type!==type||o.type==='collect') return;
        if(o.monsterKey&&o.monsterKey!==payload.monsterKey) return;
        if(o.npcId&&o.npcId!==payload.npcId) return;
        if(o.areaId&&o.areaId!==payload.areaId) return;
        if(o.itemId&&o.itemId!==payload.itemId) return;
        if(o.giant!==undefined&&!!o.giant!==!!payload.giant) return;
        const need=o.count||1,current=Math.max(0,Math.floor(Number(entry.progress[index])||0));
        if(current<need){entry.progress[index]=Math.min(need,current+Math.max(1,Math.floor(Number(payload.count)||1)));changed=true;}
      });
    }
    if(changed){player.dirty=true;this.sync(player,{event:'progress'});}
    return changed;
  }

  handle(player,message={},handlers={}) {
    const id=typeof message.questId==='string'?message.questId:'';
    if(message.action==='accept') return this.accept(player,id);
    if(message.action==='abandon') return this.abandon(player,id);
    if(message.action==='turnIn') return this.turnIn(player,id,handlers);
    return this.fail(player,'Ação de missão inválida.');
  }

  sync(player,extra={}) {
    this.send(player.ws,{t:'questState',state:this.snapshot(player),legacy:player.dados.quest||null,...extra});
  }

  fail(player,msg) {
    this.send(player.ws,{t:'questState',ok:false,msg,state:this.snapshot(player),legacy:player.dados.quest||null});
    return false;
  }
}

module.exports = QuestManager;
