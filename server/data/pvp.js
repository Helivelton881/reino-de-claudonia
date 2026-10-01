'use strict';
const ARENAS=Object.freeze({
  campo_honra:Object.freeze({id:'campo_honra',name:'Campo da Honra',minLevel:20,center:{x:0,z:-145},radius:28,mode:'1v1'}),
  bastiao_claudonia:Object.freeze({id:'bastiao_claudonia',name:'Bastião de Claudonia',minLevel:40,center:{x:145,z:5},radius:36,mode:'guild'})
});
const TERRITORIES=Object.freeze({
  fortaleza_norte:Object.freeze({id:'fortaleza_norte',name:'Fortaleza do Norte',x:110,z:128,radius:12,minGuildLevel:5}),
  bastiao_leste:Object.freeze({id:'bastiao_leste',name:'Bastião do Leste',x:185,z:120,radius:12,minGuildLevel:8}),
  coroa_sul:Object.freeze({id:'coroa_sul',name:'Coroa do Sul',x:195,z:-135,radius:12,minGuildLevel:10})
});
const HONOR=Object.freeze({duelWin:10,arenaWin:25,guildKill:18,territoryCapture:120,deathLoss:3,rewardPairCooldownMs:600000});
const SEASON=Object.freeze({id:'2026-S4',name:'Temporada da Coroa',startsAt:'2026-10-01T00:00:00Z',endsAt:'2026-12-31T23:59:59Z'});
const TITLES=Object.freeze([{honor:100,id:'combatente',name:'Combatente de Claudonia'},{honor:500,id:'veterano',name:'Veterano da Arena'},{honor:1500,id:'campeao',name:'Campeão da Coroa'}]);
module.exports={ARENAS,TERRITORIES,HONOR,SEASON,TITLES};