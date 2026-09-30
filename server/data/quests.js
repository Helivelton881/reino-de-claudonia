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

const POST_CLASS = Object.freeze({
  jornada_13_novo_caminho:{
    id:'jornada_13_novo_caminho',title:'Um Novo Caminho',npcId:'ferreiro',category:'story',abandonable:true,
    description:'Brunna quer garantir que sua nova classe esteja pronta para enfrentar o Planalto do Musgo.',
    requirements:{level:15,clsNot:'aprendiz',completedAny:['prova_guerreiro','prova_druida','prova_mago','prova_arqueiro']},
    objectives:[{type:'talk',npcId:'voo',count:1,label:'Fale com o Piloto Tito',hint:'Tito conhece as rotas para o Planalto do Musgo.'}],
    reward:{exp:800,gold:150}
  },
  jornada_14_planalto:{
    id:'jornada_14_planalto',title:'Rumo ao Planalto',npcId:'voo',category:'story',abandonable:true,
    description:'Tito quer que você reconheça o terreno antes de enfrentar os Golems Rúnicos.',
    requirements:{level:15,clsNot:'aprendiz',completedQuest:'jornada_13_novo_caminho'},
    objectives:[{type:'explore',areaId:'golem',count:1,label:'Explore o Planalto do Musgo',hint:'Siga para o sul até o território dos Golems Rúnicos.'}],
    reward:{exp:1200,gold:150}
  },
  jornada_15_golems:{
    id:'jornada_15_golems',title:'Pedra que Anda',npcId:'guerreiro',category:'story',abandonable:true,
    description:'Borin quer medir sua força contra os guardiões do Planalto.',
    requirements:{level:16,clsNot:'aprendiz',completedQuest:'jornada_14_planalto'},
    objectives:[{type:'kill',monsterKey:'golem',count:5,label:'Derrote Golems Rúnicos',hint:'Os Golems Rúnicos ocupam o Planalto do Musgo.'}],
    reward:{exp:2200,gold:200}
  },
  jornada_16_musgo:{
    id:'jornada_16_musgo',title:'Musgo Rúnico',npcId:'ferreiro',category:'story',abandonable:true,
    description:'Brunna precisa de musgo impregnado de energia rúnica para reforçar equipamentos.',
    requirements:{level:17,clsNot:'aprendiz',completedQuest:'jornada_15_golems'},
    objectives:[{type:'delivery',itemId:'musgo',count:4,label:'Entregue Musgos Rúnicos',hint:'Golems Rúnicos podem deixar Musgo Rúnico.'}],
    reward:{exp:2500,gold:250}
  },
  jornada_17_guardioes:{
    id:'jornada_17_guardioes',title:'Guardiões do Planalto',npcId:'mago',category:'story',abandonable:true,
    description:'Eldran detectou uma concentração de energia nos Golems e quer que você reduza sua atividade.',
    requirements:{level:18,clsNot:'aprendiz',completedQuest:'jornada_16_musgo'},
    objectives:[{type:'kill',monsterKey:'golem',count:7,label:'Derrote Golems Rúnicos',hint:'Continue no Planalto do Musgo e enfrente os guardiões.'}],
    reward:{exp:3000,gold:300}
  },
  jornada_18_licenca_voo:{
    id:'jornada_18_licenca_voo',title:'Primeiro Voo',npcId:'voo',category:'story',abandonable:true,
    description:'Tito considera você pronto para voar, mas quer que Brunna confira seu equipamento antes da primeira decolagem.',
    requirements:{level:19,clsNot:'aprendiz',completedQuest:'jornada_17_guardioes'},
    objectives:[{type:'talk',npcId:'ferreiro',count:1,label:'Peça a Brunna uma inspeção de voo',hint:'Fale com Ferreira Brunna e depois volte ao Piloto Tito.'}],
    reward:{exp:2500,gold:500}
  }
});

const WOLF_TRAIL = Object.freeze({
  jornada_19_posto_lobos:{
    id:'jornada_19_posto_lobos',title:'Posto da Trilha',npcId:'voo',category:'story',abandonable:true,
    description:'Tito quer abrir uma rota segura até o posto avançado que vigia a Trilha dos Lobos.',
    requirements:{level:20,clsNot:'aprendiz',completedQuest:'jornada_18_licenca_voo'},
    objectives:[{type:'talk',npcId:'vigia_lobos',count:1,label:'Fale com o Vigia Cael',hint:'Siga para leste até o posto antes da Trilha dos Lobos.'}],reward:{exp:1200,gold:200}
  },
  jornada_20_primeiro_uivo:{
    id:'jornada_20_primeiro_uivo',title:'Primeiro Uivo',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'Cael precisa reduzir a pressão da alcateia sobre o caminho de viajantes.',
    requirements:{level:21,clsNot:'aprendiz',completedQuest:'jornada_19_posto_lobos'},
    objectives:[{type:'kill',monsterKey:'lobo',count:6,label:'Derrote Lobos Cinzentos',hint:'Os Lobos Cinzentos ocupam a trilha a leste do posto.'}],reward:{exp:2600,gold:280}
  },
  jornada_21_peles_trilha:{
    id:'jornada_21_peles_trilha',title:'Peles da Trilha',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'O posto precisa de peles resistentes para reforçar mantas e proteções contra o frio da mata.',
    requirements:{level:22,clsNot:'aprendiz',completedQuest:'jornada_20_primeiro_uivo'},
    objectives:[{type:'delivery',itemId:'pele_lobo',count:5,label:'Entregue Peles de Lobo',hint:'Continue caçando Lobos Cinzentos até obter as peles.'}],reward:{exp:3200,gold:320}
  },
  jornada_22_centro_alcateia:{
    id:'jornada_22_centro_alcateia',title:'Centro da Alcateia',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'Cael quer que você reconheça o coração do território antes da próxima patrulha.',
    requirements:{level:23,clsNot:'aprendiz',completedQuest:'jornada_21_peles_trilha'},
    objectives:[{type:'explore',areaId:'lobo',count:1,label:'Explore a Trilha dos Lobos',hint:'Avance até o centro do território dos Lobos Cinzentos.'}],reward:{exp:2400,gold:250}
  },
  jornada_23_alcateia_cinzenta:{
    id:'jornada_23_alcateia_cinzenta',title:'Alcateia Cinzenta',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'A movimentação aumentou e o posto precisa de uma patrulha mais profunda.',
    requirements:{level:24,clsNot:'aprendiz',completedQuest:'jornada_22_centro_alcateia'},
    objectives:[{type:'kill',monsterKey:'lobo',count:8,label:'Derrote Lobos Cinzentos',hint:'Patrulhe a Trilha dos Lobos e enfrente a alcateia.'}],reward:{exp:4200,gold:400}
  },
  jornada_24_reserva_peles:{
    id:'jornada_24_reserva_peles',title:'Reserva do Posto',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'Cael quer deixar o posto abastecido antes de enviar o relatório para a vila.',
    requirements:{level:26,clsNot:'aprendiz',completedQuest:'jornada_23_alcateia_cinzenta'},
    objectives:[{type:'delivery',itemId:'pele_lobo',count:7,label:'Entregue Peles de Lobo',hint:'Lobos Cinzentos podem deixar Pele de Lobo.'}],reward:{exp:5200,gold:450}
  },
  jornada_25_guardiao_trilha:{
    id:'jornada_25_guardiao_trilha',title:'Guardião da Trilha',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'A última patrulha decidirá se a rota pode ser considerada segura para aventureiros experientes.',
    requirements:{level:28,clsNot:'aprendiz',completedQuest:'jornada_24_reserva_peles'},
    objectives:[{type:'kill',monsterKey:'lobo',count:10,label:'Derrote Lobos Cinzentos',hint:'Complete a patrulha final na Trilha dos Lobos.'}],reward:{exp:7000,gold:600}
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

module.exports=Object.freeze({...STORY,...POST_CLASS,...WOLF_TRAIL,...CLASS_TRIALS});
