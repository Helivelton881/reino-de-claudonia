'use strict';

const EQUIPMENT=require('../data/equipment');
const SETS=require('../data/items/sets');
const {RARITIES}=require('../data/items/rarities');
const CARDS=require('../data/items/cards');
const NPCS=require('../data/npcs');

const SLOTS=Object.freeze(['arma','offhand','capacete','peitoral','luvas','botas','capa','acessorio1','acessorio2','voo']);
const INVENTORY_LIMIT=32,STORAGE_LIMIT=60;
const ALLOWED_AFFIX=new Set(['str','sta','dex','int','hpPct','mpPct','fpPct','atkPct','defPct','crit','attackSpeed','healing','dot','partyDamage','range']);

class ItemManager{
  constructor({send}){this.send=send;}
  ensurePlayer(player){
    const d=player.dados||(player.dados={});
    d.inv=Array.isArray(d.inv)?d.inv:[];d.storage=Array.isArray(d.storage)?d.storage:[];d.eq=d.eq&&typeof d.eq==='object'?d.eq:{};d.equp=d.equp&&typeof d.equp==='object'?d.equp:{};d.eqMeta=d.eqMeta&&typeof d.eqMeta==='object'?d.eqMeta:{};
    d.itemSeq=Math.max(0,Math.floor(Number(d.itemSeq)||0));
    for(const slot of SLOTS){if(!(slot in d.eq))d.eq[slot]=null;if(!(slot in d.equp))d.equp[slot]=0;if(!(slot in d.eqMeta))d.eqMeta[slot]=null;}
    d.inv=d.inv.slice(0,INVENTORY_LIMIT).map(e=>this.normalizeEntry(player,e)).filter(Boolean);
    d.storage=d.storage.slice(0,STORAGE_LIMIT).map(e=>this.normalizeEntry(player,e)).filter(Boolean);
    for(const slot of SLOTS){const id=d.eq[slot],item=EQUIPMENT[id];if(!item||item.slot!==slot){d.eq[slot]=null;d.equp[slot]=0;d.eqMeta[slot]=null;}else d.eqMeta[slot]=this.normalizeMeta(item,d.eqMeta[slot]);}
    return d;
  }
  nextUid(player,id){const d=player.dados;d.itemSeq=(d.itemSeq||0)+1;return `${player.id||'p'}:${d.itemSeq}:${id}`;}
  normalizeMeta(item,meta={}){
    const maxAffixes=(RARITIES[item.rarity]||RARITIES.comum).affixes||0;
    const affixes=Array.isArray(meta&&meta.affixes)?meta.affixes.filter(a=>a&&ALLOWED_AFFIX.has(a.stat)&&Number.isFinite(Number(a.value))).slice(0,maxAffixes).map(a=>({stat:a.stat,value:Number(a.value),name:String(a.name||a.stat).slice(0,40)})):[];
    const socketed=Array.isArray(meta&&meta.socketed)?meta.socketed.filter(id=>CARDS[id]).slice(0,item.socketCount||0):[];
    return {uid:typeof meta?.uid==='string'?meta.uid:null,rarity:item.rarity,affixes,socketed,locked:!!meta?.locked,favorite:!!meta?.favorite};
  }
  normalizeEntry(player,entry){
    if(!entry||typeof entry.id!=='string')return null;
    const item=EQUIPMENT[entry.id];
    if(!item)return {id:entry.id,n:Math.max(1,Math.floor(Number(entry.n)||1))};
    const meta=this.normalizeMeta(item,entry);
    return {id:entry.id,n:1,up:Math.max(0,Math.min(10,Math.floor(Number(entry.up)||0))),uid:meta.uid||this.nextUid(player,entry.id),rarity:item.rarity,affixes:meta.affixes,socketed:meta.socketed,locked:meta.locked,favorite:meta.favorite};
  }
  entryMeta(entry,item){const m=this.normalizeMeta(item,entry);return {...m,uid:entry.uid||m.uid};}
  equippedEntry(player,slot){
    const d=this.ensurePlayer(player),id=d.eq[slot],item=EQUIPMENT[id];if(!item)return null;
    return {id,n:1,up:d.equp[slot]||0,...this.normalizeMeta(item,d.eqMeta[slot])};
  }
  canEquip(player,item){const L=Math.max(1,Math.floor(player.L||player.dados.L||1)),cls=player.dados.cls||'aprendiz';return !!item&&item.req<=L&&(!item.cls||item.cls===cls);}
  equip(player,index){
    const d=this.ensurePlayer(player),i=Math.floor(Number(index)),entry=d.inv[i],item=entry&&EQUIPMENT[entry.id];
    if(!entry||!item||!this.canEquip(player,item))return this.fail(player,'Você não pode equipar este item.');
    const old=this.equippedEntry(player,item.slot);d.inv.splice(i,1);if(old)d.inv.push(old);
    d.eq[item.slot]=entry.id;d.equp[item.slot]=entry.up||0;d.eqMeta[item.slot]=this.entryMeta(entry,item);player.dirty=true;this.sync(player,{event:'equip',slot:item.slot});return true;
  }
  unequip(player,slot){
    const d=this.ensurePlayer(player),item=this.equippedEntry(player,slot);if(!item)return this.fail(player,'Equipamento inválido.');
    if(d.inv.length>=INVENTORY_LIMIT)return this.fail(player,'Mochila cheia.');
    d.inv.push(item);d.eq[slot]=null;d.equp[slot]=0;d.eqMeta[slot]=null;player.dirty=true;this.sync(player,{event:'unequip',slot});return true;
  }
  discard(player,index){
    const d=this.ensurePlayer(player),i=Math.floor(Number(index)),e=d.inv[i];if(!e)return this.fail(player,'Item inválido.');
    if(EQUIPMENT[e.id]&&e.locked)return this.fail(player,'Item bloqueado. Desbloqueie antes de descartar.');
    d.inv.splice(i,1);player.dirty=true;this.sync(player,{event:'discard'});return true;
  }
  flag(player,index,key,value){
    if(!['locked','favorite'].includes(key))return this.fail(player,'Flag inválida.');
    const d=this.ensurePlayer(player),e=d.inv[Math.floor(Number(index))];if(!e||!EQUIPMENT[e.id])return this.fail(player,'Item inválido.');
    e[key]=!!value;player.dirty=true;this.sync(player,{event:'flag',index:Number(index),key,value:!!value});return true;
  }
  storageNear(player){const npc=NPCS.find(n=>n.id==='escriva_mira');return !!npc&&Math.hypot(player.x-npc.x,player.z-npc.z)<=4.5;}
  storagePut(player,index){
    if(!this.storageNear(player))return this.fail(player,'Aproxime-se da Escrivã Mira para usar o banco.');
    const d=this.ensurePlayer(player),i=Math.floor(Number(index)),e=d.inv[i];if(!e)return this.fail(player,'Item inválido.');
    if(d.storage.length>=STORAGE_LIMIT)return this.fail(player,'Banco cheio.');
    d.inv.splice(i,1);d.storage.push(e);player.dirty=true;this.sync(player,{event:'storage-put'});return true;
  }
  storageTake(player,index){
    if(!this.storageNear(player))return this.fail(player,'Aproxime-se da Escrivã Mira para usar o banco.');
    const d=this.ensurePlayer(player),i=Math.floor(Number(index)),e=d.storage[i];if(!e)return this.fail(player,'Item inválido.');
    if(d.inv.length>=INVENTORY_LIMIT)return this.fail(player,'Mochila cheia.');
    d.storage.splice(i,1);d.inv.push(e);player.dirty=true;this.sync(player,{event:'storage-take'});return true;
  }
  socket(player,where,ref,cardId){
    const d=this.ensurePlayer(player),card=CARDS[cardId];if(!card)return this.fail(player,'Carta inválida.');
    const cardRow=d.inv.find(x=>x&&x.id===cardId&&!EQUIPMENT[x.id]);if(!cardRow||cardRow.n<1)return this.fail(player,'Você não possui esta carta.');
    let entry,item,commit;
    if(where==='inventory'){const i=Math.floor(Number(ref));entry=d.inv[i];item=entry&&EQUIPMENT[entry.id];commit=()=>{};}
    else{const slot=String(ref);entry=this.equippedEntry(player,slot);item=entry&&EQUIPMENT[entry.id];commit=()=>{d.eqMeta[slot]=this.entryMeta(entry,item);};}
    if(!entry||!item||item.slot==='voo')return this.fail(player,'Equipamento inválido.');
    entry.socketed=Array.isArray(entry.socketed)?entry.socketed:[];if(entry.socketed.length>=(item.socketCount||0))return this.fail(player,'Sem socket livre.');
    entry.socketed.push(cardId);cardRow.n--;if(cardRow.n<=0)d.inv.splice(d.inv.indexOf(cardRow),1);commit();player.dirty=true;this.sync(player,{event:'socket',cardId});return true;
  }
  addItem(player,value){
    const d=this.ensurePlayer(player),id=value&&value.id,item=EQUIPMENT[id];
    if(!id)return false;
    if(item){if(d.inv.length>=INVENTORY_LIMIT)return false;d.inv.push(this.normalizeEntry(player,{...value,n:1}));return true;}
    const n=Math.max(1,Math.floor(Number(value.n)||1)),row=d.inv.find(x=>x&&x.id===id&&!EQUIPMENT[id]);
    if(row){row.n+=n;return true;}if(d.inv.length>=INVENTORY_LIMIT)return false;d.inv.push({id,n});return true;
  }
  catalog(){
    return {equipment:Object.values(EQUIPMENT).map(x=>({...x})),sets:Object.values(SETS).map(s=>({...s,bonuses:{2:s.bonuses[2].map(x=>({...x})),3:s.bonuses[3].map(x=>({...x})),4:s.bonuses[4].map(x=>({...x}))}})),rarities:Object.values(RARITIES).map(x=>({...x})),cards:Object.values(CARDS).map(x=>({...x})),inventoryLimit:INVENTORY_LIMIT,storageLimit:STORAGE_LIMIT};
  }
  snapshot(player){const d=this.ensurePlayer(player);return {inv:d.inv,storage:d.storage,eq:d.eq,equp:d.equp,eqMeta:d.eqMeta,itemSeq:d.itemSeq};}
  sync(player,extra={}){const d=this.ensurePlayer(player);this.send(player.ws,{t:'itemState',state:this.snapshot(player),gold:d.gold||0,...extra});}
  fail(player,msg){this.send(player.ws,{t:'itemState',ok:false,msg,state:this.snapshot(player)});return false;}
}

module.exports={ItemManager,SLOTS,INVENTORY_LIMIT,STORAGE_LIMIT,CARDS};