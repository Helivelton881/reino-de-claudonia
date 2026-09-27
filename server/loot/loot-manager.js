'use strict';

const { rollLoot } = require('./loot-tables');

class LootManager {
  constructor({ players, send, emitNearby, now = Date.now, rng = Math.random, ttlMs = 90000, inventoryLimit = 24 }) {
    this.players=players; this.send=send; this.emitNearby=emitNearby; this.now=now; this.rng=rng; this.ttlMs=ttlMs; this.inventoryLimit=inventoryLimit;
    this.loot=new Map(); this.nextId=1;
  }
  spawn(monster, killer, options={}) {
    const allowed = new Set(options.allowedIds || [killer.id]);
    const made=[];
    for (const value of rollLoot(monster,{rng:this.rng,luck:options.luck||1,copies:options.copies||1})) {
      const id=this.nextId++;
      const angle=this.rng()*Math.PI*2, radius=0.35+this.rng()*0.9;
      const entity={ id, x:monster.x+Math.cos(angle)*radius, z:monster.z+Math.sin(angle)*radius, value, allowed, expiresAt:this.now()+this.ttlMs };
      this.loot.set(id,entity); made.push(entity); this.emitNearby(entity,{t:'lootSpawn',loot:this.public(entity)});
    }
    return made;
  }
  public(entity){ return {lootId:entity.id,x:entity.x,z:entity.z,...entity.value,expiresAt:entity.expiresAt}; }
  snapshotFor(player,radius=110){ return [...this.loot.values()].filter(e=>this.allowed(e,player)&&Math.hypot(e.x-player.x,e.z-player.z)<=radius).map(e=>this.public(e)); }
  allowed(entity,player){ return entity.allowed.has(player.id); }
  pickup(player,id) {
    const entity=this.loot.get(Number(id));
    if (!entity) return this.reject(player,id,'Loot indisponível.');
    if (!this.allowed(entity,player)) return this.reject(player,id,'Este loot pertence a outro jogador ou grupo.');
    if (Math.hypot(entity.x-player.x,entity.z-player.z)>2.6) return this.reject(player,id,'Loot distante demais.');
    if (entity.value.id && !this.addItem(player,entity.value.id,entity.value.n||1)) return this.reject(player,id,'Mochila cheia.');
    if (entity.value.gold) player.dados.gold=Math.max(0,Math.floor(Number(player.dados.gold)||0))+entity.value.gold;
    this.loot.delete(entity.id); player.dirty=true;
    this.emitNearby(entity,{t:'lootRemove',id:entity.id});
    this.send(player.ws,{t:'pickupResult',ok:true,id:entity.id,value:entity.value,gold:player.dados.gold,inv:player.dados.inv});
    return true;
  }
  addItem(player,id,n){
    const inv=Array.isArray(player.dados.inv)?player.dados.inv:(player.dados.inv=[]);
    const found=inv.find(x=>x&&x.id===id&&!x.up);
    if (found){ found.n=Math.max(0,Math.floor(found.n||0))+n; return true; }
    if (inv.length>=this.inventoryLimit) return false;
    inv.push({id,n}); return true;
  }
  reject(player,id,msg){ this.send(player.ws,{t:'pickupResult',ok:false,id,msg}); return false; }
  tick(){ const now=this.now(); for(const [id,e] of this.loot) if(e.expiresAt<=now){this.loot.delete(id);this.emitNearby(e,{t:'lootRemove',id});} }
}

module.exports = LootManager;
