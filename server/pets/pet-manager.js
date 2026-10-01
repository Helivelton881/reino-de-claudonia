'use strict';const {PETS}=require('../data/pets');
class PetManager{
 constructor({send,itemManager,lootManager}){this.send=send;this.itemManager=itemManager;this.lootManager=lootManager;}
 ensure(p){const d=p.dados||(p.dados={});d.pets=d.pets&&typeof d.pets==='object'?d.pets:{};d.petActive=typeof d.petActive==='string'?d.petActive:null;return d;}
 snapshot(p){const d=this.ensure(p),pets=Object.values(d.pets).map(x=>({...x,config:PETS[x.id]}));return {active:d.petActive,pets,catalog:Object.values(PETS)};}
 sync(p,extra={}){this.send(p.ws,{t:'petState',state:this.snapshot(p),...extra});}
 grant(p,id){if(!PETS[id])return false;const d=this.ensure(p);if(!d.pets[id])d.pets[id]={id,level:1,exp:0,tier:1,nickname:null};p.dirty=true;this.sync(p,{event:'grant'});return true;}
 summon(p,id){const d=this.ensure(p);if(!d.pets[id]||!PETS[id])return false;d.petActive=id;p.dirty=true;this.sync(p,{event:'summon'});return true;}
 unsummon(p){const d=this.ensure(p);d.petActive=null;p.dirty=true;this.sync(p,{event:'unsummon'});return true;}
 rename(p,id,name){const d=this.ensure(p),pet=d.pets[id];name=String(name||'').trim().slice(0,18);if(!pet||name.length<2)return false;pet.nickname=name;p.dirty=true;this.sync(p,{event:'rename'});return true;}
 gainExp(p,amount){const d=this.ensure(p),pet=d.petActive&&d.pets[d.petActive];if(!pet)return;pet.exp+=Math.max(0,Math.floor(amount||0));while(pet.level<30&&pet.exp>=pet.level*25){pet.exp-=pet.level*25;pet.level++;}pet.tier=pet.level>=25?3:pet.level>=10?2:1;p.dirty=true;this.sync(p,{event:'progress'});}
 activeBonus(p){const d=this.ensure(p),pet=d.petActive&&d.pets[d.petActive],cfg=pet&&PETS[pet.id];if(!cfg)return {};return cfg.tiers.find(x=>x.tier===pet.tier)?.bonus||{};}
 pickup(p,drop){const d=this.ensure(p),pet=d.petActive&&d.pets[d.petActive],cfg=pet&&PETS[pet.id];if(!cfg||!drop)return {ok:false,reason:'Pet coletor não está ativo.'};const dx=Number(drop.x)-p.x,dz=Number(drop.z)-p.z;if(!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)>cfg.pickupRadius)return {ok:false,reason:'Drop fora do alcance do pet.'};return {ok:true};}
 handle(p,m){if(m.action==='summon')return this.summon(p,m.id);if(m.action==='unsummon')return this.unsummon(p);if(m.action==='rename')return this.rename(p,m.id,m.name);if(m.action==='sync'){this.sync(p);return true;}return false;}
}
module.exports=PetManager;