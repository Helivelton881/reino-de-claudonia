'use strict';

const STORY = Object.freeze({
  jornada_01_apresentacao:{
    id:'jornada_01_apresentacao',title:'Primeiros Passos',npcId:'ferreiro',category:'story',abandonable:true,
    description:'Brunna quer que você conheça quem cuida das rotas de Claudonia.',
    requirements:{level:1,cls:'aprendiz'},
    objectives:[{type:'talk',npcId:'voo',count:1,label:'Fale com o Piloto Tito',hint:'Piloto Tito fica na Vila do Vale.'}],
    reward:{exp:50,gold:20}
  },
  jornada_02_bolotas:{
    id:'jornada_02_bolotas',title:'Bolotas no Caminho',npcId:'ferreiro',category:'story',abandonable:true,
    description:'A trilha precisa ficar segura para os novos aventureiros.',
    requirements:{level:1,cls:'aprendiz',completedQuest:'jornada_01_apresentacao'},
    objectives:[{type:'kill',monsterKey:'bolota',count:5,label:'Derrote Bolotas',hint:'As Bolotas vivem a sudeste da vila.'}],
    reward:{exp:100,gold:30}
  },
  jornada_03_gosma:{
    id:'jornada_03_gosma',title:'Material para a Forja',npcId:'ferreiro',category:'story',abandonable:true,
    description:'Brunna precisa de gosma de Bolota para preparar um composto de manutenção.',
    requirements:{level:2,cls:'aprendiz',completedQuest:'jornada_02_bolotas'},
    objectives:[{type:'delivery',itemId:'gosma',count:4,label:'Entregue Gosmas de Bolota',hint:'Bolotas podem deixar Gosma de Bolota.'}],
    reward:{exp:150,gold:40}
  },
  jornada_04_rota_coelhorn:{
    id:'jornada_04_rota_coelhorn',title:'Rota dos Coelhorns',npcId:'voo',category:'story',abandonable:true,
    description:'Tito quer confirmar se a rota a sudoeste continua acessível.',
    requirements:{level:4,cls:'aprendiz',completedQuest:'jornada_03_gosma'},
    objectives:[{type:'explore',areaId:'coelhorn',count:1,label:'Explore a região dos Coelhorns',hint:'Siga para sudoeste até entrar na área dos Coelhorns.'}],
    reward:{exp:220,gold:55}
  },
  jornada_05_coelhorns:{
    id:'jornada_05_coelhorns',title:'Patrulha da Trilha',npcId:'arqueiro',category:'story',abandonable:true,
    description:'Nyra precisa reduzir a pressão dos Coelhorns sobre a trilha.',
    requirements:{level:4,cls:'aprendiz',completedQuest:'jornada_04_rota_coelhorn'},
    objectives:[{type:'kill',monsterKey:'coelhorn',count:6,label:'Derrote Coelhorns',hint:'Os Coelhorns ficam a sudoeste da vila.'}],
    reward:{exp:300,gold:70}
  },
  jornada_06_pelos:{
    id:'jornada_06_pelos',title:'Pelos para Flechas',npcId:'arqueiro',category:'story',abandonable:true,
    description:'Nyra usa fibras de Coelhorn para estabilizar a produção de flechas.',
    requirements:{level:6,cls:'aprendiz',completedQuest:'jornada_05_coelhorns'},
    objectives:[{type:'delivery',itemId:'pelo',count:5,label:'Entregue Pelos de Coelhorn',hint:'Continue caçando Coelhorns até conseguir os materiais.'}],
    reward:{exp:450,gold:90}
  },
  jornada_07_bosque:{
    id:'jornada_07_bosque',title:'O Bosque dos Cogumelos',npcId:'druida',category:'story',abandonable:true,
    description:'Aurélia quer que você reconheça o bosque antes de enfrentar suas criaturas.',
    requirements:{level:8,cls:'aprendiz',completedQuest:'jornada_06_pelos'},
    objectives:[{type:'explore',areaId:'cogumelo',count:1,label:'Explore o Bosque dos Cogumelos',hint:'O bosque fica a noroeste da vila.'}],
    reward:{exp:600,gold:110}
  },
  jornada_08_cogumelos:{
    id:'jornada_08_cogumelos',title:'Cogumelos Furiosos',npcId:'mago',category:'story',abandonable:true,
    description:'Eldran observou uma concentração perigosa de Cogumelos Bravos.',
    requirements:{level:8,cls:'aprendiz',completedQuest:'jornada_07_bosque'},
    objectives:[{type:'kill',monsterKey:'cogumelo',count:6,label:'Derrote Cogumelos Bravos',hint:'Eles são agressivos; aproxime-se preparado.'}],
    reward:{exp:800,gold:140}
  },
  jornada_09_chapeus:{
    id:'jornada_09_chapeus',title:'Amostras do Bosque',npcId:'druida',category:'story',abandonable:true,
    description:'Aurélia precisa de amostras para estudar o comportamento do bosque.',
    requirements:{level:10,cls:'aprendiz',completedQuest:'jornada_08_cogumelos'},
    objectives:[{type:'delivery',itemId:'chapeu',count:5,label:'Entregue Chapéus de Cogumelo',hint:'Cogumelos Bravos podem deixar Chapéus de Cogumelo.'}],
    reward:{exp:1000,gold:170}
  },
  jornada_10_morro:{
    id:'jornada_10_morro',title:'O Morro dos Javalis',npcId:'voo',category:'story',abandonable:true,
    description:'Tito precisa de um reconhecimento da rota até o território dos Javalis de Pedra.',
    requirements:{level:12,cls:'aprendiz',completedQuest:'jornada_09_chapeus'},
    objectives:[{type:'explore',areaId:'javali',count:1,label:'Explore o território dos Javalis',hint:'Siga para nordeste até o morro dos Javalis de Pedra.'}],
    reward:{exp:1200,gold:210}
  },
  jornada_11_javalis:{
    id:'jornada_11_javalis',title:'Última Patrulha',npcId:'guerreiro',category:'story',abandonable:true,
    description:'Borin quer ver como você se comporta diante de inimigos mais fortes.',
    requirements:{level:12,cls:'aprendiz',completedQuest:'jornada_10_morro'},
    objectives:[{type:'kill',monsterKey:'javali',count:6,label:'Derrote Javalis de Pedra',hint:'Os Javalis atacam com força; observe sua vida.'}],
    reward:{exp:1500,gold:260}
  },
  jornada_12_presas:{
    id:'jornada_12_presas',title:'Pronto para Escolher',npcId:'guerreiro',category:'story',abandonable:true,
    description:'Borin pede uma última entrega antes de liberar sua escolha de caminho.',
    requirements:{level:14,cls:'aprendiz',completedQuest:'jornada_11_javalis'},
    objectives:[{type:'delivery',itemId:'presa',count:4,label:'Entregue Presas de Javali',hint:'Javalis de Pedra podem deixar Presas de Javali.'}],
    reward:{exp:1800,gold:320}
  }
});

const CLASS_TRIALS = Object.freeze({
  prova_guerreiro:{
    id:'prova_guerreiro',title:'Prova do Guerreiro',npcId:'guerreiro',category:'class-trial',exclusiveGroup:'class-trial',abandonable:true,
    requirements:{level:15,cls:'aprendiz',completedQuest:'jornada_12_presas'},
    objectives:[{type:'collect',itemId:'presa',count:6,label:'Presas de Javali',hint:'Os Javalis de Pedra vivem no morro a nordeste.'}],
    reward:{classId:'guerreiro',weapon:'espada_soldado'}
  },
  prova_druida:{
    id:'prova_druida',title:'Prova do Druida',npcId:'druida',category:'class-trial',exclusiveGroup:'class-trial',abandonable:true,
    requirements:{level:15,cls:'aprendiz',completedQuest:'jornada_12_presas'},
    objectives:[{type:'collect',itemId:'chapeu',count:8,label:'Chapéus de Cogumelo',hint:'Os Cogumelos Bravos ficam a noroeste da vila.'}],
    reward:{classId:'druida',weapon:'cajado_carvalho'}
  },
  prova_mago:{
    id:'prova_mago',title:'Prova do Mago',npcId:'mago',category:'class-trial',exclusiveGroup:'class-trial',abandonable:true,
    requirements:{level:15,cls:'aprendiz',completedQuest:'jornada_12_presas'},
    objectives:[{type:'collect',itemId:'gosma',count:12,label:'Gosmas de Bolota',hint:'As Bolotas pulam a sudeste da vila.'}],
    reward:{classId:'mago',weapon:'varinha_arcana'}
  },
  prova_arqueiro:{
    id:'prova_arqueiro',title:'Prova do Arqueiro',npcId:'arqueiro',category:'class-trial',exclusiveGroup:'class-trial',abandonable:true,
    requirements:{level:15,cls:'aprendiz',completedQuest:'jornada_12_presas'},
    objectives:[{type:'collect',itemId:'pelo',count:10,label:'Pelos de Coelhorn',hint:'Os Coelhorns ficam a sudoeste da vila.'}],
    reward:{classId:'arqueiro',weapon:'arco_curto'}
  }
});

module.exports=Object.freeze({...STORY,...CLASS_TRIALS});
