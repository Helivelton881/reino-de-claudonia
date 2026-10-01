'use strict';

const VARIANTS=Object.freeze({
 normal:{id:'normal',name:'',hp:1,attack:1,defense:1,exp:1,scale:1,respawnMs:9000},
 rare:{id:'rare',name:'Raro',hp:2.2,attack:1.3,defense:1.15,exp:2.5,scale:1.15,respawnMs:120000},
 elite:{id:'elite',name:'Elite',hp:3.2,attack:1.45,defense:1.25,exp:3.5,scale:1.25,respawnMs:180000},
 giant:{id:'giant',name:'Gigante',hp:8,attack:1.75,defense:1.45,exp:8,scale:1.65,respawnMs:300000}
});
const FAMILY_SKILLS=Object.freeze({
 bolota:[{id:'salto_pesado',type:'slam',cooldownMs:7000,telegraphMs:900,radius:3}],
 coelhorn:[{id:'investida',type:'charge',cooldownMs:6500,telegraphMs:700,radius:2.2}],
 cogumelo:[{id:'nuvem_esporos',type:'hazard',cooldownMs:8000,telegraphMs:1100,radius:4}],
 javali:[{id:'arremetida',type:'charge',cooldownMs:6500,telegraphMs:700,radius:2.5}],
 golem:[{id:'terremoto_runico',type:'slam',cooldownMs:9000,telegraphMs:1300,radius:5}],
 lobo:[{id:'uivo_cinzento',type:'enrage',cooldownMs:11000,telegraphMs:800,radius:7}],
 aranha:[{id:'teia_sombria',type:'hazard',cooldownMs:8500,telegraphMs:1000,radius:4.5}],
 espirito:[{id:'onda_espiritual',type:'wave',cooldownMs:8000,telegraphMs:1000,radius:5}],
 ciclope:[{id:'impacto_vulcanico',type:'slam',cooldownMs:7500,telegraphMs:1200,radius:5.5}],
 ossario:[{id:'estilhaço_osseo',type:'wave',cooldownMs:7200,telegraphMs:850,radius:4}],
 legionário:[{id:'golpe_runico',type:'slam',cooldownMs:7800,telegraphMs:1000,radius:4.5}],
 espectro:[{id:'passo_sepultado',type:'charge',cooldownMs:6200,telegraphMs:650,radius:3}],
 necromante:[{id:'circulo_necrotico',type:'hazard',cooldownMs:8200,telegraphMs:1200,radius:5.5}]
});
const WORLD_BOSSES=Object.freeze({
 guardiao_cinzas:{
  key:'guardiao_cinzas',name:'Guardião das Cinzas',zone:'ciclope',level:60,radius:2.4,
  hp:42000,attack:185,defense:58,speed:2.5,respawnMs:3600000,announceMs:300000,
  phases:[
   {at:1,skills:['impacto_vulcanico']},
   {at:.7,skills:['impacto_vulcanico','chamas_circulares'],adds:'ciclope'},
   {at:.35,skills:['impacto_vulcanico','chamas_circulares','queda_meteorica'],enrage:1.25}
  ],
  rewards:{minContribution:.03,source:'boss'}
 },
 rei_ossario:{key:'rei_ossario',name:'Rei do Ossário',zone:'necromante',level:100,radius:2.2,hp:115000,attack:330,defense:105,speed:2.7,respawnMs:5400000,announceMs:300000,phases:[{at:1,skills:['circulo_necrotico']},{at:.68,skills:['circulo_necrotico','chuva_ossea'],adds:'espectro'},{at:.32,skills:['circulo_necrotico','chuva_ossea','eclipse_sepultado'],adds:'legionário',enrage:1.3}],rewards:{minContribution:.03,source:'boss'}}
});
function variantForSpawn(rng=Math.random){const n=rng();return n<.012?'elite':n<.04?'rare':'normal';}
module.exports={VARIANTS,FAMILY_SKILLS,WORLD_BOSSES,variantForSpawn};
