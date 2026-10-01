'use strict';

const { STATIC_NPCS } = require('../../public/js/world-collision-map');

const META = Object.freeze({
  guerreiro:{name:'Capitão Borin',tag:'[Mestre Guerreiro] Borin',role:'Instrutor de Guerreiro',service:'class-trial',classId:'guerreiro'},
  druida:{name:'Irmã Aurélia',tag:'[Mestra Druida] Aurélia',role:'Instrutora de Druida',service:'class-trial',classId:'druida'},
  mago:{name:'Mestre Eldran',tag:'[Mestre Mago] Eldran',role:'Instrutor de Mago',service:'class-trial',classId:'mago'},
  arqueiro:{name:'Caçadora Nyra',tag:'[Mestra Arqueira] Nyra',role:'Instrutora de Arqueiro',service:'class-trial',classId:'arqueiro'},
  voo:{name:'Piloto Tito',tag:'[Mestre de Voo] Tito',role:'Mestre de Voo e mercador',service:'flight-shop'},
  ferreiro:{name:'Ferreira Brunna',tag:'[Ferreira] Brunna',role:'Ferreira: aprimora, compra e vende equipamentos',service:'forge'},
  vigia_lobos:{name:'Vigia Cael',tag:'[Vigia da Trilha] Cael',role:'Vigia da Trilha dos Lobos',service:'quest-giver'},
  batedora_teias:{name:'Batedora Maelis',tag:'[Batedora da Mata] Maelis',role:'Batedora da Mata das Teias',service:'quest-giver'},
  guardia_lago:{name:'Guardiã Neris',tag:'[Guardiã do Lago] Neris',role:'Guardiã do Lago Espelhado',service:'quest-giver'},
  sentinela_ruinas:{name:'Sentinela Oren',tag:'[Sentinela das Ruínas] Oren',role:'Sentinela das Ruínas do Ciclope',service:'quest-giver'},
  curandeira_lysa:{name:'Curandeira Lysa',tag:'[Curandeira] Lysa',role:'Curandeira da vila',service:'healer',dialogue:'Posso restaurar sua Vida, Mana e Energia antes da próxima jornada.'},
  mercador_nilo:{name:'Mercador Nilo',tag:'[Mercador] Nilo',role:'Mercador de suprimentos',service:'supply-shop',shopItems:['pocao_vida','pocao_mana','pocao_energia'],dialogue:'Poções básicas para quem vai sair da vila.'},
  escriva_mira:{name:'Escrivã Mira',tag:'[Registro de Guildas] Mira',role:'Escrivã de guildas e grupos',service:'guild-registrar',dialogue:'Aqui você encontra o acesso aos registros sociais de aventureiros e guildas.'},
  guia_toren:{name:'Guia Toren',tag:'[Guia] Toren',role:'Guia da Campina das Bolotas',service:'guide',guideZone:'bolota',dialogue:'Se está começando, a Campina das Bolotas é a primeira rota segura para treinar.'},
  alquimista_sera:{name:'Alquimista Sera',tag:'[Alquimista] Sera',role:'Alquimista da vila',service:'supply-shop',shopItems:['pocao_vida','pocao_mana','pocao_energia'],dialogue:'Mantenha algumas poções na mochila antes de enfrentar regiões agressivas.'},
  equipador_joren:{name:'Equipador Joren',tag:'[Equipador] Joren',role:'Fornecedor de viagem',service:'supply-shop',shopItems:['combustivel','pocao_vida','pocao_mana','pocao_energia'],dialogue:'Tenho suprimentos para viagem terrestre e combustível para voo.'},
  batedor_bran:{name:'Batedor Bran',tag:'[Batedor] Bran',role:'Batedor da rota leste',service:'guide',guideZone:'bolota',dialogue:'A rota leste leva à Campina das Bolotas. Fique atento às criaturas próximas da estrada.'},
  botanica_ilyra:{name:'Botânica Ilyra',tag:'[Botânica] Ilyra',role:'Botânica do Morro dos Javalis',service:'guide',guideZone:'javali',dialogue:'O morro é rico em materiais, mas os javalis atacam quem se aproxima demais.'},
  guardiao_rian:{name:'Guardião Rian',tag:'[Guardião] Rian',role:'Guardião da rota oeste',service:'guide',guideZone:'coelhorn',dialogue:'A rota oeste conduz ao Prado dos Coelhorns e depois a regiões mais perigosas.'},
  cacador_varo:{name:'Caçador Varo',tag:'[Caçador] Varo',role:'Caçador do Bosque',service:'guide',guideZone:'cogumelo',dialogue:'O Bosque dos Cogumelos parece calmo, mas as criaturas defendem o território.'},
  caravaneiro_rul:{name:'Caravaneiro Rul',tag:'[Caravaneiro] Rul',role:'Caravaneiro do Planalto',service:'guide',guideZone:'golem',dialogue:'A estrada ao sul chega ao Planalto do Musgo. Viaje preparado para combate pesado.'},
  vigia_tessa:{name:'Vigia Tessa',tag:'[Vigia] Tessa',role:'Vigia auxiliar da Trilha dos Lobos',service:'guide',guideZone:'lobo',dialogue:'A alcateia muda de posição, mas a trilha principal continua sendo a rota mais segura.'},
  tecela_sia:{name:'Tecelã Sia',tag:'[Tecelã] Sia',role:'Tecelã da Mata das Teias',service:'guide',guideZone:'aranha',dialogue:'A seda das aranhas é valiosa, porém a mata fecha caminhos rapidamente.'},
  pesquisador_iven:{name:'Pesquisador Iven',tag:'[Pesquisador] Iven',role:'Pesquisador do Lago Espelhado',service:'guide',guideZone:'espirito',dialogue:'Os espíritos reagem à presença de aventureiros nas margens. Não entre sem preparo.'},
  arqueologa_dena:{name:'Arqueóloga Dena',tag:'[Arqueóloga] Dena',role:'Arqueóloga das Ruínas do Ciclope',service:'guide',guideZone:'ciclope',dialogue:'As ruínas guardam sinais antigos e ciclopes agressivos. Posso marcar a rota até a entrada.'},
  guardiao_cripta:{name:'Guardião Vaelor',tag:'[Dungeon] Vaelor',role:'Guardião da Cripta dos Ecos',service:'dungeon',dungeonId:'cripta_ecos',dialogue:'A Cripta dos Ecos aceita grupos de nível 20 a 30. O líder escolhe a dificuldade.'}
});

const NPCS = Object.freeze(STATIC_NPCS.map(p=>Object.freeze({
  id:p.id, x:p.x, z:p.z, r:p.r, ...(META[p.id]||{})
})));

module.exports = NPCS;
