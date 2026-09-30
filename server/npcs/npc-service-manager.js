'use strict';

const NPCS = require('../data/npcs');

class NpcServiceManager {
  constructor({send, combatManager, economyManager}) {
    this.send=send;
    this.combat=combatManager;
    this.economy=economyManager;
  }

  npcNear(player,npcId){
    const npc=NPCS.find(n=>n.id===npcId);
    if(!npc) return null;
    if(Math.hypot(player.x-npc.x,player.z-npc.z)>3.6) return null;
    return npc;
  }

  act(player,m={}){
    const npc=this.npcNear(player,m.npcId);
    if(!npc) return this.fail(player,'Aproxime-se do NPC para usar este serviço.');

    if(m.action==='heal'){
      if(npc.service!=='healer') return this.fail(player,'Este NPC não oferece cura.');
      if(player.dead) return this.fail(player,'Você precisa renascer antes de receber tratamento.');
      const stats=this.combat.refresh(player);
      player.hp=stats.maxHp; player.mp=stats.maxMp; player.fp=stats.maxFp;
      Object.assign(player.dados,{hp:player.hp,mp:player.mp,fp:player.fp});
      player.dirty=true;
      this.combat.sync(player);
      if(typeof this.combat.syncPartyHp==='function') this.combat.syncPartyHp(player);
      this.send(player.ws,{t:'npcServiceState',ok:true,msg:`${npc.name} restaurou seus atributos.`,npcId:npc.id});
      return true;
    }

    if(m.action==='buy'){
      if(npc.service!=='supply-shop') return this.fail(player,'Este NPC não possui loja de suprimentos.');
      const allowed=Array.isArray(npc.shopItems)?npc.shopItems:[];
      if(!allowed.includes(m.itemId)) return this.fail(player,'Item indisponível neste comerciante.');
      return this.economy.act(player,{action:'buy',itemId:m.itemId});
    }

    return this.fail(player,'Serviço de NPC inválido.');
  }

  fail(player,msg){
    this.send(player.ws,{t:'npcServiceState',ok:false,msg});
    return false;
  }
}

module.exports = NpcServiceManager;
