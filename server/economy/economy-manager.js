'use strict';

const EQUIPMENT=require('../data/equipment');
const QUESTS=require('../data/quests');
const {RARITIES}=require('../data/items/rarities');
const CARDS=require('../data/items/cards');

const CONSUMABLES={pocao_vida:{price:20},pocao_mana:{price:20},pocao_energia:{price:20},combustivel:{price:60},pedra_aprimorar:{price:150},runa_menor:{price:300},runa_maior:{price:1500},perg_protecao:{price:2500},perg_sorte:{price:1200},...Object.fromEntries(Object.values(CARDS).map(c=>[c.id,{price:c.price}]))};
const MATERIAL_VALUES={gosma:3,pelo:5,chapeu:8,presa:12,musgo:18,pele_lobo:24,seda:30,essencia:38,nucleo:48};
const UP_CHANCE=[1,1,1,1,.9,.8,.68,.55,.43,.32,.24];
const rarityOf=item=>RARITIES[item&&item.rarity]||RARITIES.comum;
const priceOf=id=>{const c=CONSUMABLES[id];if(c)return c.price;const item=EQUIPMENT[id];if(!item)return 0;if(item.price)return item.price;return Math.round((30*Math.pow(item.req,1.5)+60)*rarityOf(item).upgradeCost);};
const remove=(inv,id,n)=>{const row=inv.find(x=>x&&x.id===id&&!EQUIPMENT[x.id]);if(!row||row.n<n)return false;row.n-=n;if(row.n<=0)inv.splice(inv.indexOf(row),1);return true;};
const count=(inv,id)=>inv.filter(x=>x&&x.id===id).reduce((n,x)=>n+Math.max(0,Math.floor(x.n||0)),0);
const reservedQuestItems=player=>{const ids=new Set(),active=player.dados?.quests?.active||{};for(const id of Object.keys(active)){const q=QUESTS[id];if(!q)continue;for(const o of q.objectives||[])if((o.type==='collect'||o.type==='delivery')&&o.itemId)ids.add(o.itemId);}return ids;};

class EconomyManager{
  constructor({send,rng=Math.random,itemManager=null}){this.send=send;this.rng=rng;this.itemManager=itemManager;}
  setItemManager(manager){this.itemManager=manager;}
  ensure(player){if(this.itemManager)this.itemManager.ensurePlayer(player);return player.dados;}
  act(player,m={}){
    if(player.trade||player.shop)return this.fail(player,'Feche a troca ou loja pessoal primeiro.');
    if(m.action==='buy')return this.buy(player,m);
    if(m.action==='sellEquipment')return this.sellEquipment(player,m);
    if(m.action==='sellMaterials')return this.sellMaterials(player);
    if(m.action==='enhance')return this.enhance(player,m);
    return this.fail(player,'Ação econômica inválida.');
  }
  buy(player,m){
    const d=this.ensure(player),item=EQUIPMENT[m.itemId],cons=CONSUMABLES[m.itemId],price=priceOf(m.itemId);
    if(!price||(!cons&&!item))return this.fail(player,'Item inválido.');
    if(item&&item.source!=='npc')return this.fail(player,'Este equipamento não é vendido por NPC.');
    if((d.gold||0)<price)return this.fail(player,'Ouro insuficiente.');
    if(item){if(!this.itemManager)return this.fail(player,'Sistema de itens indisponível.');if(!this.itemManager.addItem(player,{id:m.itemId,n:1,rarity:item.rarity,affixes:[],socketed:[]}))return this.fail(player,'Mochila cheia.');}
    else{const stack=d.inv.find(x=>x.id===m.itemId&&!EQUIPMENT[x.id]);if(stack)stack.n++;else{if(d.inv.length>=32)return this.fail(player,'Mochila cheia.');d.inv.push({id:m.itemId,n:1});}}
    d.gold-=price;return this.done(player,`Comprou ${item?.name||m.itemId}.`);
  }
  sellEquipment(player,m){
    const d=this.ensure(player),inv=d.inv||[],i=Math.floor(Number(m.index)),entry=inv[i],item=entry&&EQUIPMENT[entry.id];
    if(!item)return this.fail(player,'Equipamento inválido.');if(entry.locked)return this.fail(player,'Item bloqueado. Desbloqueie antes de vender.');
    const R=rarityOf(item),value=Math.floor(priceOf(entry.id)*.25*(1+.18*(entry.up||0))*(1+R.rank*.12));inv.splice(i,1);d.gold=(d.gold||0)+value;return this.done(player,`Equipamento vendido por ${value} ouro.`);
  }
  sellMaterials(player){
    const d=this.ensure(player),inv=d.inv||[],reserved=reservedQuestItems(player);let total=0;
    for(let i=inv.length-1;i>=0;i--){const value=MATERIAL_VALUES[inv[i].id];if(value&&!reserved.has(inv[i].id)){total+=value*inv[i].n;inv.splice(i,1);}}
    d.gold=(d.gold||0)+total;return this.done(player,`Materiais vendidos por ${total} ouro.`);
  }
  enhance(player,m){
    const d=this.ensure(player),inv=d.inv||[],kind=m.kind,ref=m.ref;let entry,slot,item;
    if(kind==='inventory'){entry=inv[Math.floor(Number(ref))];item=entry&&EQUIPMENT[entry.id];}
    else{slot=String(ref);const id=d.eq&&d.eq[slot];item=EQUIPMENT[id];if(item)entry={id,up:(d.equp&&d.equp[slot])||0};}
    if(!entry||!item||item.slot==='voo')return this.fail(player,'Item inválido.');
    if(kind==='inventory'&&entry.locked&&m.allowLocked!==true)return this.fail(player,'Item bloqueado. Desbloqueie antes de aprimorar.');
    const current=entry.up||0,next=current+1;if(next>10)return this.fail(player,'Item no nível máximo.');
    const R=rarityOf(item),stones=Math.ceil(next/2)+(R.rank>=3&&next>=7?1:0),rune=next<=5?'runa_menor':'runa_maior',gold=Math.round((40*next*next+60)*R.upgradeCost);
    if(count(inv,'pedra_aprimorar')<stones||count(inv,rune)<1||(d.gold||0)<gold)return this.fail(player,'Materiais ou ouro insuficientes.');
    const protection=!!m.protection&&count(inv,'perg_protecao')>0,luck=!!m.luck&&count(inv,'perg_sorte')>0;
    remove(inv,'pedra_aprimorar',stones);remove(inv,rune,1);if(protection)remove(inv,'perg_protecao',1);if(luck)remove(inv,'perg_sorte',1);d.gold-=gold;
    const chance=Math.min(.98,UP_CHANCE[next]+Math.min(8,d.upPity||0)*.04+(luck?.1:0));let result='failed',finalLevel=current;
    if(this.rng()<chance){finalLevel=next;d.upPity=0;result='success';}
    else{d.upPity=Math.min(8,(d.upPity||0)+1);if(next>=7&&!protection){if(this.rng()<.35){result='broken';finalLevel=0;}else{result='downgraded';finalLevel=Math.max(3,current-1);}}}
    if(result==='broken'){if(kind==='inventory')inv.splice(inv.indexOf(entry),1);else{d.eq[slot]=null;d.equp[slot]=0;if(d.eqMeta)d.eqMeta[slot]=null;}}
    else if(kind==='inventory')entry.up=finalLevel;else d.equp[slot]=finalLevel;
    return this.done(player,result,{result,level:finalLevel,chance,cost:{stones,rune,gold},pity:d.upPity||0});
  }
  done(player,msg,extra={}){player.dirty=true;const d=this.ensure(player);this.send(player.ws,{t:'economyState',ok:true,msg,dados:{inv:d.inv,storage:d.storage,gold:d.gold,eq:d.eq,equp:d.equp,eqMeta:d.eqMeta,upPity:d.upPity},...extra});return true;}
  fail(player,msg){this.send(player.ws,{t:'economyState',ok:false,msg});return false;}
}

module.exports=EconomyManager;
module.exports.priceOf=priceOf;
module.exports.UP_CHANCE=UP_CHANCE;