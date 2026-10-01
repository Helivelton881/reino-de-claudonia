'use strict';
const ACHIEVEMENTS={
 combate_100:{id:'combate_100',category:'combate',name:'Caçador de Claudonia',event:'kill',goal:100,reward:{title:'Caçador de Claudonia',seasonXp:80}},
 gigante_10:{id:'gigante_10',category:'combate',name:'Quebra-Gigantes',event:'giant',goal:10,reward:{frame:'gigante_bronze',seasonXp:100}},
 explorador_12:{id:'explorador_12',category:'exploracao',name:'Pés na Estrada',event:'explore',goal:12,reward:{title:'Explorador',seasonXp:100}},
 social_20:{id:'social_20',category:'social',name:'Companheiro',event:'social',goal:20,reward:{frame:'companheiro',seasonXp:80}},
 artesao_50:{id:'artesao_50',category:'crafting',name:'Mãos de Mestre',event:'craft',goal:50,reward:{title:'Artesão',seasonXp:100}},
 dungeon_10:{id:'dungeon_10',category:'dungeons',name:'Eco Silenciado',event:'dungeon',goal:10,reward:{skin:'eco_prateado',seasonXp:120}},
 colecao_40:{id:'colecao_40',category:'colecao',name:'Colecionador',event:'collect',goal:40,reward:{frame:'colecionador',seasonXp:80}}
};
const DAILY=[
{id:'d_kill',name:'Patrulha diária',event:'kill',goal:12,reward:{gold:120,seasonXp:20}},
{id:'d_gather',name:'Recursos do reino',event:'gather',goal:8,reward:{gold:90,seasonXp:20}},
{id:'d_craft',name:'Ofício diário',event:'craft',goal:3,reward:{gold:80,seasonXp:20}},
{id:'d_social',name:'Juntos somos fortes',event:'social',goal:1,reward:{gold:50,seasonXp:15}}
];
const WEEKLY=[
{id:'w_kill',name:'Defesa semanal',event:'kill',goal:80,reward:{gold:600,seasonXp:100}},
{id:'w_dungeon',name:'Expedições',event:'dungeon',goal:3,reward:{gold:500,seasonXp:120}},
{id:'w_giant',name:'Caçada aos Gigantes',event:'giant',goal:3,reward:{gold:450,seasonXp:100}},
{id:'w_guild',name:'Honra da Guilda',event:'guild',goal:5,reward:{gold:350,seasonXp:90}}
];
const SEASON={id:'temporada_fundadores',name:'Temporada dos Fundadores',premiumEnabled:false,xpPerLevel:100,maxLevel:10,free:[
{level:1,reward:{gold:100}},{level:2,reward:{title:'Pioneiro'}},{level:3,reward:{gold:200}},{level:4,reward:{frame:'fundador_bronze'}},{level:5,reward:{gold:300}},{level:6,reward:{skin:'capa_fundador'}},{level:7,reward:{gold:400}},{level:8,reward:{title:'Guardião do Reino'}},{level:9,reward:{frame:'fundador_prata'}},{level:10,reward:{skin:'aura_claudonia'}}]};
const WORLD_EVENTS=[
{id:'boss_cinzas',name:'Caçada: Guardião das Cinzas',kind:'boss',event:'giant',target:'guardiao_cinzas',durationMin:45,rewardText:'Recompensas normais do boss + progresso Live Ops'},
{id:'boss_ossario',name:'Caçada: Rei do Ossário',kind:'boss',event:'giant',target:'rei_ossario',durationMin:45,rewardText:'Recompensas normais do boss + progresso Live Ops'},
{id:'coleta_real',name:'Colheita Real',kind:'gather',event:'gather',durationMin:45,rewardText:'Progresso de coleta e temporada'},
{id:'eco_cripta',name:'Ecos da Cripta',kind:'dungeon',event:'dungeon',durationMin:45,rewardText:'Progresso de dungeon e temporada'},
{id:'guilda_unida',name:'Guildas Unidas',kind:'guild',event:'guild',durationMin:45,rewardText:'Objetivo coletivo de guilda'}
];
function dayKey(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
function weekKey(now=Date.now()){const d=new Date(now),x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));return x.getUTCFullYear()+'-W'+String(Math.ceil((((x-y)/86400000)+1)/7)).padStart(2,'0');}
function eventAt(now=Date.now()){const slot=Math.floor(now/(60*60*1000)),def=WORLD_EVENTS[((slot%WORLD_EVENTS.length)+WORLD_EVENTS.length)%WORLD_EVENTS.length],start=slot*3600000;return{...def,start,end:start+def.durationMin*60000};}
function calendar(now=Date.now(),count=12){const out=[];const base=Math.floor(now/3600000)*3600000;for(let i=0;i<count;i++){const at=base+i*3600000,slot=Math.floor(at/3600000),def=WORLD_EVENTS[((slot%WORLD_EVENTS.length)+WORLD_EVENTS.length)%WORLD_EVENTS.length];out.push({...def,start:at,end:at+def.durationMin*60000});}return out;}
module.exports={ACHIEVEMENTS,DAILY,WEEKLY,SEASON,WORLD_EVENTS,dayKey,weekKey,eventAt,calendar};