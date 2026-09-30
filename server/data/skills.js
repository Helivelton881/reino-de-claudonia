'use strict';

const rank = (multiplier, extra={}) => Object.freeze({multiplier,...extra});
const buffRank = (buff) => Object.freeze({buff:Object.freeze(buff)});
const skill = cfg => Object.freeze({...cfg,ranks:Object.freeze(cfg.ranks.map(Object.freeze))});

module.exports = Object.freeze({
  golpe_forte: skill({
    id:'golpe_forte',cls:'aprendiz',name:'Golpe Forte',icon:'💥',req:1,type:'hit',target:'enemy',fp:6,cooldown:4,maxRank:5,autoRank1:true,
    description:'Golpe físico concentrado. Cada rank aumenta o multiplicador de dano.',
    tree:{row:0,col:0},ranks:[rank(1.8),rank(1.95),rank(2.1),rank(2.25),rank(2.4)]
  }),
  corte_duplo: skill({
    id:'corte_duplo',cls:'aprendiz',name:'Corte Duplo',icon:'⚡',req:8,type:'double',target:'enemy',fp:10,cooldown:7,maxRank:5,
    description:'Executa dois cortes rápidos. Requer domínio de Golpe Forte.',
    requires:[{id:'golpe_forte',rank:2}],tree:{row:1,col:0},ranks:[rank(1.2),rank(1.28),rank(1.36),rank(1.44),rank(1.52)]
  }),

  investida: skill({
    id:'investida',cls:'guerreiro',name:'Investida',icon:'💥',req:15,type:'hit',target:'enemy',fp:8,cooldown:5,maxRank:5,autoRank1:true,
    description:'Golpe pesado de abertura do Guerreiro.',
    tree:{row:0,col:0},ranks:[rank(2.1),rank(2.22),rank(2.34),rank(2.46),rank(2.6)]
  }),
  grito: skill({
    id:'grito',cls:'guerreiro',name:'Grito de Guerra',icon:'📣',req:17,type:'buff',target:'self',mp:10,cooldown:30,maxRank:5,
    description:'Aumenta o ataque temporariamente.',
    requires:[{id:'investida',rank:2}],tree:{row:1,col:0},ranks:[
      buffRank({id:'grito',seconds:30,atk:.20}),buffRank({id:'grito',seconds:32,atk:.23}),buffRank({id:'grito',seconds:34,atk:.26}),buffRank({id:'grito',seconds:36,atk:.29}),buffRank({id:'grito',seconds:40,atk:.32})
    ]
  }),
  redemoinho: skill({
    id:'redemoinho',cls:'guerreiro',name:'Redemoinho',icon:'🌀',req:20,type:'aoe',target:'area-self',around:'self',radius:4,fp:15,cooldown:10,maxRank:5,
    description:'Ataque em área ao redor do Guerreiro.',
    requires:[{id:'grito',rank:2}],tree:{row:2,col:0},ranks:[rank(1.4),rank(1.5,{radius:4.1}),rank(1.6,{radius:4.2}),rank(1.7,{radius:4.3}),rank(1.8,{radius:4.5})]
  }),

  cura: skill({
    id:'cura',cls:'druida',name:'Cura',icon:'💚',req:15,type:'heal',target:'self',mp:12,cooldown:3,maxRank:5,autoRank1:true,
    description:'Restaura vida com base em Inteligência e rank.',
    tree:{row:0,col:0},ranks:[{healPower:1},{healPower:1.15},{healPower:1.3},{healPower:1.45},{healPower:1.65}]
  }),
  bencao: skill({
    id:'bencao',cls:'druida',name:'Bênção',icon:'✨',req:17,type:'buff',target:'self',mp:15,cooldown:45,maxRank:5,
    description:'Aumenta defesa e regeneração.',
    requires:[{id:'cura',rank:2}],tree:{row:1,col:0},ranks:[
      buffRank({id:'bencao',seconds:60,def:.25,regen:1}),buffRank({id:'bencao',seconds:62,def:.28,regen:1}),buffRank({id:'bencao',seconds:64,def:.31,regen:1}),buffRank({id:'bencao',seconds:66,def:.34,regen:1}),buffRank({id:'bencao',seconds:70,def:.38,regen:1})
    ]
  }),
  punho: skill({
    id:'punho',cls:'druida',name:'Punho Sagrado',icon:'👊',req:20,type:'hit',target:'enemy',fp:10,cooldown:6,maxRank:5,stat:'int',
    description:'Ataque corpo a corpo escalado por Inteligência.',
    requires:[{id:'bencao',rank:2}],tree:{row:2,col:0},ranks:[rank(1.9),rank(2.0),rank(2.1),rank(2.2),rank(2.35)]
  }),

  bola_fogo: skill({
    id:'bola_fogo',cls:'mago',name:'Bola de Fogo',icon:'🔥',req:15,type:'bolt',target:'enemy',mp:8,cooldown:2.5,maxRank:5,magic:true,autoRank1:true,
    description:'Projétil mágico de fogo.',
    tree:{row:0,col:0},ranks:[rank(1.9),rank(2.02),rank(2.14),rank(2.26),rank(2.4)]
  }),
  lanca_gelo: skill({
    id:'lanca_gelo',cls:'mago',name:'Lança de Gelo',icon:'❄️',req:17,type:'bolt',target:'enemy',mp:12,cooldown:6,maxRank:5,magic:true,slow:4,
    description:'Dano mágico e redução temporária de velocidade.',
    requires:[{id:'bola_fogo',rank:2}],tree:{row:1,col:0},ranks:[rank(1.5,{slow:4}),rank(1.58,{slow:4.5}),rank(1.66,{slow:5}),rank(1.74,{slow:5.5}),rank(1.85,{slow:6})]
  }),
  tempestade: skill({
    id:'tempestade',cls:'mago',name:'Tempestade',icon:'⛈️',req:20,type:'aoe',target:'area-target',around:'target',radius:4.5,mp:25,cooldown:12,maxRank:5,magic:true,
    description:'Dano em área centrado no alvo.',
    requires:[{id:'lanca_gelo',rank:2}],tree:{row:2,col:0},ranks:[rank(1.5),rank(1.6,{radius:4.6}),rank(1.7,{radius:4.7}),rank(1.8,{radius:4.8}),rank(1.95,{radius:5})]
  }),

  tiro_certeiro: skill({
    id:'tiro_certeiro',cls:'arqueiro',name:'Tiro Certeiro',icon:'🎯',req:15,type:'bolt',target:'enemy',fp:6,cooldown:3,maxRank:5,critAdd:.5,autoRank1:true,
    description:'Disparo preciso com bônus de crítico.',
    tree:{row:0,col:0},ranks:[rank(1.9,{critAdd:.5}),rank(2.0,{critAdd:.52}),rank(2.1,{critAdd:.54}),rank(2.2,{critAdd:.56}),rank(2.35,{critAdd:.60})]
  }),
  olho_aguia: skill({
    id:'olho_aguia',cls:'arqueiro',name:'Olho de Águia',icon:'🦅',req:17,type:'buff',target:'self',mp:10,cooldown:40,maxRank:5,
    description:'Aumenta chance de crítico temporariamente.',
    requires:[{id:'tiro_certeiro',rank:2}],tree:{row:1,col:0},ranks:[
      buffRank({id:'aguia',seconds:30,crit:.25}),buffRank({id:'aguia',seconds:32,crit:.28}),buffRank({id:'aguia',seconds:34,crit:.31}),buffRank({id:'aguia',seconds:36,crit:.34}),buffRank({id:'aguia',seconds:40,crit:.38})
    ]
  }),
  chuva_flechas: skill({
    id:'chuva_flechas',cls:'arqueiro',name:'Chuva de Flechas',icon:'🌧️',req:20,type:'aoe',target:'area-target',around:'target',radius:4.5,fp:15,cooldown:10,maxRank:5,
    description:'Disparos em área ao redor do alvo.',
    requires:[{id:'olho_aguia',rank:2}],tree:{row:2,col:0},ranks:[rank(1.4),rank(1.5,{radius:4.6}),rank(1.6,{radius:4.7}),rank(1.7,{radius:4.8}),rank(1.85,{radius:5})]
  })
});
