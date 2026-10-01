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

const WEB_FOREST = Object.freeze({
  jornada_26_mata_teias:{
    id:'jornada_26_mata_teias',title:'Rumo à Mata das Teias',npcId:'vigia_lobos',category:'story',abandonable:true,
    description:'Cael recebeu relatos de uma nova ameaça ao sul da rota e pede que você procure a batedora responsável pela mata.',
    requirements:{level:29,clsNot:'aprendiz',completedQuest:'jornada_25_guardiao_trilha'},
    objectives:[{type:'talk',npcId:'batedora_teias',count:1,label:'Fale com a Batedora Maelis',hint:'Siga pela estrada sudoeste até o posto antes da Mata das Teias.'}],reward:{exp:1800,gold:260}
  },
  jornada_27_primeiras_teias:{
    id:'jornada_27_primeiras_teias',title:'Primeiras Teias',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'Maelis precisa abrir espaço na borda da mata antes que as aranhas fechem a passagem.',
    requirements:{level:29,clsNot:'aprendiz',completedQuest:'jornada_26_mata_teias'},
    objectives:[{type:'kill',monsterKey:'aranha',count:7,label:'Derrote Aranhas Sombrias',hint:'As Aranhas Sombrias ocupam a Mata das Teias.'}],reward:{exp:3500,gold:340}
  },
  jornada_28_seda_resistente:{
    id:'jornada_28_seda_resistente',title:'Seda Resistente',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'Maelis usa a seda das criaturas para reforçar cordas, armadilhas e passagens de emergência.',
    requirements:{level:30,clsNot:'aprendiz',completedQuest:'jornada_27_primeiras_teias'},
    objectives:[{type:'delivery',itemId:'seda',count:6,label:'Entregue Sedas de Aranha',hint:'Continue caçando Aranhas Sombrias até obter a seda necessária.'}],reward:{exp:4300,gold:390}
  },
  jornada_29_coracao_mata:{
    id:'jornada_29_coracao_mata',title:'Coração da Mata',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'Antes da patrulha profunda, Maelis quer que você reconheça o núcleo da região infestada.',
    requirements:{level:31,clsNot:'aprendiz',completedQuest:'jornada_28_seda_resistente'},
    objectives:[{type:'explore',areaId:'aranha',count:1,label:'Explore a Mata das Teias',hint:'Avance até o centro do território das Aranhas Sombrias.'}],reward:{exp:3800,gold:350}
  },
  jornada_30_teias_cerradas:{
    id:'jornada_30_teias_cerradas',title:'Teias Cerradas',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'As criaturas voltaram a ocupar as passagens. Maelis ordena uma patrulha mais profunda.',
    requirements:{level:33,clsNot:'aprendiz',completedQuest:'jornada_29_coracao_mata'},
    objectives:[{type:'kill',monsterKey:'aranha',count:9,label:'Derrote Aranhas Sombrias',hint:'Patrulhe a Mata das Teias e reduza a concentração de aranhas.'}],reward:{exp:6200,gold:520}
  },
  jornada_31_estoque_seda:{
    id:'jornada_31_estoque_seda',title:'Estoque de Seda',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'O posto precisa de uma reserva final de seda antes de fechar a patrulha desta região.',
    requirements:{level:35,clsNot:'aprendiz',completedQuest:'jornada_30_teias_cerradas'},
    objectives:[{type:'delivery',itemId:'seda',count:8,label:'Entregue Sedas de Aranha',hint:'Aranhas Sombrias podem deixar Seda de Aranha.'}],reward:{exp:7600,gold:610}
  },
  jornada_32_passagem_segura:{
    id:'jornada_32_passagem_segura',title:'Passagem Segura',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'Uma última ofensiva decidirá se a rota pela mata pode ser liberada para aventureiros experientes.',
    requirements:{level:37,clsNot:'aprendiz',completedQuest:'jornada_31_estoque_seda'},
    objectives:[{type:'kill',monsterKey:'aranha',count:12,label:'Derrote Aranhas Sombrias',hint:'Complete a patrulha final dentro da Mata das Teias.'}],reward:{exp:9200,gold:760}
  }
});

const MIRROR_LAKE = Object.freeze({
  jornada_33_lago_espelhado:{
    id:'jornada_33_lago_espelhado',title:'Chamado do Lago',npcId:'batedora_teias',category:'story',abandonable:true,
    description:'Maelis recebeu relatos de distúrbios ao norte e pede que você procure a guardiã responsável pelas margens do Lago Espelhado.',
    requirements:{level:38,clsNot:'aprendiz',completedQuest:'jornada_32_passagem_segura'},
    objectives:[{type:'talk',npcId:'guardia_lago',count:1,label:'Fale com a Guardiã Neris',hint:'Siga pela estrada ao norte até a margem segura do Lago Espelhado.'}],reward:{exp:2200,gold:300}
  },
  jornada_34_vozes_superficie:{
    id:'jornada_34_vozes_superficie',title:'Vozes na Superfície',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'Neris percebe que os espíritos estão se aproximando demais da margem e precisa reduzir a pressão sobre o posto.',
    requirements:{level:38,clsNot:'aprendiz',completedQuest:'jornada_33_lago_espelhado'},
    objectives:[{type:'kill',monsterKey:'espirito',count:7,label:'Derrote Espíritos do Lago',hint:'Os Espíritos do Lago rondam as margens e águas rasas do Lago Espelhado.'}],reward:{exp:4200,gold:380}
  },
  jornada_35_essencia_reflexo:{
    id:'jornada_35_essencia_reflexo',title:'Essência do Reflexo',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'A guardiã precisa de essências para estabilizar os marcos que protegem a rota ao redor do lago.',
    requirements:{level:40,clsNot:'aprendiz',completedQuest:'jornada_34_vozes_superficie'},
    objectives:[{type:'delivery',itemId:'essencia',count:6,label:'Entregue Essências do Lago',hint:'Continue enfrentando Espíritos do Lago até obter as essências necessárias.'}],reward:{exp:5200,gold:450}
  },
  jornada_36_margens_espelhadas:{
    id:'jornada_36_margens_espelhadas',title:'Margens Espelhadas',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'Neris quer que você reconheça o centro da região antes de prosseguir com a contenção espiritual.',
    requirements:{level:41,clsNot:'aprendiz',completedQuest:'jornada_35_essencia_reflexo'},
    objectives:[{type:'explore',areaId:'espirito',count:1,label:'Explore o Lago Espelhado',hint:'Avance até o centro da região dos Espíritos do Lago.'}],reward:{exp:4600,gold:420}
  },
  jornada_37_lago_inquieto:{
    id:'jornada_37_lago_inquieto',title:'Lago Inquieto',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'A presença espiritual voltou a crescer. Neris pede uma patrulha mais profunda antes que as margens sejam tomadas.',
    requirements:{level:43,clsNot:'aprendiz',completedQuest:'jornada_36_margens_espelhadas'},
    objectives:[{type:'kill',monsterKey:'espirito',count:9,label:'Derrote Espíritos do Lago',hint:'Patrulhe o Lago Espelhado e disperse os espíritos mais agressivos.'}],reward:{exp:7600,gold:620}
  },
  jornada_38_reserva_essencias:{
    id:'jornada_38_reserva_essencias',title:'Reserva de Essências',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'O posto precisa de uma reserva de essências para manter os marcos protetores ativos durante a noite.',
    requirements:{level:45,clsNot:'aprendiz',completedQuest:'jornada_37_lago_inquieto'},
    objectives:[{type:'delivery',itemId:'essencia',count:8,label:'Entregue Essências do Lago',hint:'Espíritos do Lago podem deixar Essência do Lago.'}],reward:{exp:9200,gold:740}
  },
  jornada_39_silencio_profundo:{
    id:'jornada_39_silencio_profundo',title:'Silêncio Profundo',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'Uma última patrulha decidirá se as margens podem voltar a ser consideradas seguras para os viajantes.',
    requirements:{level:47,clsNot:'aprendiz',completedQuest:'jornada_38_reserva_essencias'},
    objectives:[{type:'kill',monsterKey:'espirito',count:12,label:'Derrote Espíritos do Lago',hint:'Complete a patrulha final no Lago Espelhado.'}],reward:{exp:12000,gold:900}
  }
});

const CYCLOPS_RUINS = Object.freeze({
  jornada_40_ruinas_ciclope:{
    id:'jornada_40_ruinas_ciclope',title:'Rumo às Ruínas',npcId:'guardia_lago',category:'story',abandonable:true,
    description:'Neris recebeu sinais de atividade crescente nas ruínas do nordeste e pede que você procure o sentinela responsável pelo posto avançado.',
    requirements:{level:48,clsNot:'aprendiz',completedQuest:'jornada_39_silencio_profundo'},
    objectives:[{type:'talk',npcId:'sentinela_ruinas',count:1,label:'Fale com o Sentinela Oren',hint:'Siga pela estrada nordeste até o posto antes das Ruínas do Ciclope.'}],reward:{exp:2600,gold:340}
  },
  jornada_41_guardioes_pedra:{
    id:'jornada_41_guardioes_pedra',title:'Guardiões de Pedra',npcId:'sentinela_ruinas',category:'story',abandonable:true,
    description:'Oren precisa aliviar a pressão dos ciclopes sobre a entrada das ruínas antes que o posto seja cercado.',
    requirements:{level:48,clsNot:'aprendiz',completedQuest:'jornada_40_ruinas_ciclope'},
    objectives:[{type:'kill',monsterKey:'ciclope',count:7,label:'Derrote Ciclopes das Ruínas',hint:'Os ciclopes dominam as Ruínas do Ciclope a nordeste do posto.'}],reward:{exp:5000,gold:440}
  },
  jornada_42_nucleos_lava:{
    id:'jornada_42_nucleos_lava',title:'Núcleos de Lava',npcId:'sentinela_ruinas',category:'story',abandonable:true,
    description:'O sentinela quer estudar a energia que mantém os ciclopes ativos e precisa de núcleos recuperados em combate.',
    requirements:{level:50,clsNot:'aprendiz',completedQuest:'jornada_41_guardioes_pedra'},
    objectives:[{type:'delivery',itemId:'nucleo',count:6,label:'Entregue Núcleos de Lava',hint:'Ciclopes das Ruínas podem deixar Núcleo de Lava.'}],reward:{exp:6500,gold:520}
  },
  jornada_43_coracao_ruinas:{
    id:'jornada_43_coracao_ruinas',title:'Coração das Ruínas',npcId:'sentinela_ruinas',category:'story',abandonable:true,
    description:'Oren precisa que você reconheça o centro das ruínas antes de organizar a próxima ofensiva.',
    requirements:{level:52,clsNot:'aprendiz',completedQuest:'jornada_42_nucleos_lava'},
    objectives:[{type:'explore',areaId:'ciclope',count:1,label:'Explore as Ruínas do Ciclope',hint:'Avance até o centro do território dos ciclopes.'}],reward:{exp:5800,gold:500}
  },
  jornada_44_gigantes_despertos:{
    id:'jornada_44_gigantes_despertos',title:'Gigantes Despertos',npcId:'sentinela_ruinas',category:'story',abandonable:true,
    description:'A atividade nas ruínas aumentou e Oren ordena uma patrulha profunda para impedir que os gigantes avancem.',
    requirements:{level:54,clsNot:'aprendiz',completedQuest:'jornada_43_coracao_ruinas'},
    objectives:[{type:'kill',monsterKey:'ciclope',count:9,label:'Derrote Ciclopes das Ruínas',hint:'Patrulhe as Ruínas do Ciclope e enfrente os gigantes mais agressivos.'}],reward:{exp:9800,gold:760}
  },
  jornada_45_reserva_nucleos:{
    id:'jornada_45_reserva_nucleos',title:'Reserva de Núcleos',npcId:'sentinela_ruinas',category:'story',abandonable:true,
    description:'O posto precisa de uma reserva de núcleos para estudar a energia das ruínas e reforçar suas defesas.',
    requirements:{level:57,clsNot:'aprendiz',completedQuest:'jornada_44_gigantes_despertos'},
    objectives:[{type:'delivery',itemId:'nucleo',count:8,label:'Entregue Núcleos de Lava',hint:'Continue derrotando ciclopes até reunir os núcleos necessários.'}],reward:{exp:12500,gold:920}
  },
  jornada_46_ultimo_guardiao:{
    id:'jornada_46_ultimo_guardiao',title:'Último Guardião',npcId:'sentinela_ruinas',category:'story',abandonable:true,
    description:'A última patrulha decidirá se as Ruínas do Ciclope podem ser consideradas controladas e encerra a jornada até o nível 60.',
    requirements:{level:60,clsNot:'aprendiz',completedQuest:'jornada_45_reserva_nucleos'},
    objectives:[{type:'kill',monsterKey:'ciclope',count:12,label:'Derrote Ciclopes das Ruínas',hint:'Complete a patrulha final nas Ruínas do Ciclope.'}],reward:{exp:17000,gold:1200}
  },
  jornada_47_bosque_velado:{id:'jornada_47_bosque_velado',title:'Além das Ruínas',npcId:'sentinela_ruinas',category:'story',abandonable:true,description:'A estrada continua para terras cobertas por árvores antigas e ossos despertos.',requirements:{level:60,clsNot:'aprendiz',completedQuest:'jornada_46_ultimo_guardiao'},objectives:[{type:'explore',areaId:'ossario',count:1,label:'Alcance o Bosque Velado',hint:'Siga a nova estrada além das Ruínas do Ciclope.'}],reward:{exp:19000,gold:1400}},
  jornada_48_servos_ossario:{id:'jornada_48_servos_ossario',title:'Servos do Ossário',npcId:'sentinela_ruinas',category:'story',abandonable:true,description:'Os primeiros mortos-vivos bloqueiam a expansão da rota.',requirements:{level:61,clsNot:'aprendiz',completedQuest:'jornada_47_bosque_velado'},objectives:[{type:'kill',monsterKey:'ossario',count:12,label:'Derrote Servos do Ossário',hint:'Patrulhe o Bosque Velado.'}],reward:{exp:24000,gold:1800}},
  jornada_49_legiao_runica:{id:'jornada_49_legiao_runica',title:'A Legião Rúnica',npcId:'sentinela_ruinas',category:'story',abandonable:true,description:'Guerreiros esqueléticos protegem os penhascos ao leste.',requirements:{level:70,clsNot:'aprendiz',completedQuest:'jornada_48_servos_ossario'},objectives:[{type:'kill',monsterKey:'legionário',count:14,label:'Derrote Legionários Rúnicos',hint:'Avance até os Penhascos Rúnicos.'}],reward:{exp:36000,gold:2600}},
  jornada_50_laminas_sepultadas:{id:'jornada_50_laminas_sepultadas',title:'Lâminas Sepultadas',npcId:'sentinela_ruinas',category:'story',abandonable:true,description:'Assassinos mortos patrulham a Floresta Pálida.',requirements:{level:80,clsNot:'aprendiz',completedQuest:'jornada_49_legiao_runica'},objectives:[{type:'kill',monsterKey:'espectro',count:16,label:'Derrote Lâminas Sepulcrais',hint:'Entre na Floresta Pálida.'}],reward:{exp:52000,gold:3600}},
  jornada_51_coroa_ossos:{id:'jornada_51_coroa_ossos',title:'Coroa dos Ossos',npcId:'sentinela_ruinas',category:'story',abandonable:true,description:'Necromantes controlam o extremo da nova fronteira.',requirements:{level:90,clsNot:'aprendiz',completedQuest:'jornada_50_laminas_sepultadas'},objectives:[{type:'kill',monsterKey:'necromante',count:18,label:'Derrote Necromantes Pálidos',hint:'Alcance a Coroa dos Ossos.'}],reward:{exp:76000,gold:5000}},
  jornada_52_rei_ossario:{id:'jornada_52_rei_ossario',title:'O Rei do Ossário',npcId:'sentinela_ruinas',category:'story',abandonable:true,description:'A campanha termina diante do soberano que despertou os exércitos de ossos.',requirements:{level:100,clsNot:'aprendiz',completedQuest:'jornada_51_coroa_ossos'},objectives:[{type:'boss',monsterKey:'rei_ossario',count:1,label:'Derrote o Rei do Ossário',hint:'Reúna um grupo para enfrentar o World Boss na Coroa dos Ossos.'}],reward:{exp:100000,gold:8000}}
});

const SIDE_AND_DAILY = Object.freeze({
  side_01_treino_guardiao:{
    id:'side_01_treino_guardiao',title:'Treino de Guardião',npcId:'guerreiro',category:'side',abandonable:true,
    description:'Borin quer manter os aventureiros experientes preparados para proteger as rotas entre a vila e o Planalto do Musgo.',
    requirements:{level:16,clsNot:'aprendiz',completedQuest:'jornada_13_novo_caminho'},
    objectives:[{type:'kill',monsterKey:'golem',count:5,label:'Derrote Golens Rúnicos',hint:'Os Golens Rúnicos vivem no Planalto do Musgo.'}],reward:{exp:2200,gold:260}
  },
  side_02_olhos_na_trilha:{
    id:'side_02_olhos_na_trilha',title:'Olhos na Trilha',npcId:'arqueiro',category:'side',abandonable:true,
    description:'Nyra quer mapas recentes das rotas de caça e pede uma patrulha curta na região dos lobos.',
    requirements:{level:22,clsNot:'aprendiz',completedQuest:'jornada_19_posto_lobos'},
    objectives:[{type:'explore',areaId:'lobo',count:1,label:'Reconheça a Trilha dos Lobos',hint:'Entre na região e confirme as condições da rota.'}],reward:{exp:2600,gold:300}
  },
  side_03_fios_de_estudo:{
    id:'side_03_fios_de_estudo',title:'Fios para Estudo',npcId:'druida',category:'side',abandonable:true,
    description:'Aurélia estuda materiais naturais capazes de resistir a magia e precisa de seda da Mata das Teias.',
    requirements:{level:31,clsNot:'aprendiz',completedQuest:'jornada_26_mata_teias'},
    objectives:[{type:'delivery',itemId:'seda',count:4,label:'Entregue Sedas de Aranha',hint:'Aranhas Sombrias podem deixar Seda de Aranha.'}],reward:{exp:3600,gold:360}
  },
  side_04_resonancia_lago:{
    id:'side_04_resonancia_lago',title:'Ressonância do Lago',npcId:'mago',category:'side',abandonable:true,
    description:'Eldran quer comparar a energia dos espíritos com seus estudos arcanos e pede uma amostra do Lago Espelhado.',
    requirements:{level:40,clsNot:'aprendiz',completedQuest:'jornada_33_lago_espelhado'},
    objectives:[{type:'delivery',itemId:'essencia',count:4,label:'Entregue Essências do Lago',hint:'Espíritos do Lago podem deixar Essência do Lago.'}],reward:{exp:4800,gold:460}
  },
  side_05_primeiros_socorros:{
    id:'side_05_primeiros_socorros',title:'Primeiros Socorros',npcId:'curandeira_lysa',category:'side',abandonable:true,
    description:'Lysa quer confirmar que você sabe usar suprimentos no momento certo durante uma expedição.',
    requirements:{level:5},
    objectives:[{type:'use-item',itemId:'pocao_vida',count:1,label:'Use uma Poção de Vida',hint:'Use uma Poção de Vida quando seu HP não estiver cheio.'}],reward:{exp:450,gold:80}
  },
  side_06_gigante_campina:{
    id:'side_06_gigante_campina',title:'O Gigante da Campina',npcId:'batedor_bran',category:'side',abandonable:true,
    description:'Bran avistou uma Bolota Gigante e procura aventureiros capazes de derrubar a criatura sem bloquear a rota leste.',
    requirements:{level:6,completedQuest:'jornada_03_gosma'},
    objectives:[{type:'boss',monsterKey:'bolota',giant:true,count:1,label:'Derrote a Bolota Gigante',hint:'A Bolota Gigante surge na Campina das Bolotas.'}],reward:{exp:900,gold:140}
  },
  daily_01_patrulha_lobos:{
    id:'daily_01_patrulha_lobos',title:'Patrulha Diária: Lobos',npcId:'vigia_lobos',category:'daily',abandonable:true,repeatable:true,cooldownHours:24,
    description:'Cael mantém uma patrulha diária para impedir que a alcateia volte a fechar a estrada.',
    requirements:{level:20,clsNot:'aprendiz',completedQuest:'jornada_19_posto_lobos'},
    objectives:[{type:'kill',monsterKey:'lobo',count:5,label:'Derrote Lobos Cinzentos',hint:'Patrulhe a Trilha dos Lobos.'}],reward:{exp:1800,gold:180}
  },
  daily_02_limpeza_teias:{
    id:'daily_02_limpeza_teias',title:'Patrulha Diária: Teias',npcId:'batedora_teias',category:'daily',abandonable:true,repeatable:true,cooldownHours:24,
    description:'Maelis precisa abrir as passagens da mata todos os dias para manter o posto abastecido.',
    requirements:{level:29,clsNot:'aprendiz',completedQuest:'jornada_26_mata_teias'},
    objectives:[{type:'kill',monsterKey:'aranha',count:6,label:'Derrote Aranhas Sombrias',hint:'Limpe as rotas da Mata das Teias.'}],reward:{exp:2600,gold:240}
  },
  daily_03_vigilia_lago:{
    id:'daily_03_vigilia_lago',title:'Patrulha Diária: Lago',npcId:'guardia_lago',category:'daily',abandonable:true,repeatable:true,cooldownHours:24,
    description:'Neris vigia as margens diariamente e recompensa quem ajuda a conter os espíritos mais agressivos.',
    requirements:{level:38,clsNot:'aprendiz',completedQuest:'jornada_33_lago_espelhado'},
    objectives:[{type:'kill',monsterKey:'espirito',count:6,label:'Derrote Espíritos do Lago',hint:'Patrulhe as margens do Lago Espelhado.'}],reward:{exp:3600,gold:320}
  },
  daily_04_ronda_ruinas:{
    id:'daily_04_ronda_ruinas',title:'Patrulha Diária: Ruínas',npcId:'sentinela_ruinas',category:'daily',abandonable:true,repeatable:true,cooldownHours:24,
    description:'Oren mantém uma ronda diária nas ruínas para impedir que novos ciclopes ocupem as entradas.',
    requirements:{level:48,clsNot:'aprendiz',completedQuest:'jornada_40_ruinas_ciclope'},
    objectives:[{type:'kill',monsterKey:'ciclope',count:6,label:'Derrote Ciclopes das Ruínas',hint:'Patrulhe as Ruínas do Ciclope.'}],reward:{exp:5200,gold:420}
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

module.exports=Object.freeze({...STORY,...POST_CLASS,...WOLF_TRAIL,...WEB_FOREST,...MIRROR_LAKE,...CYCLOPS_RUINS,...SIDE_AND_DAILY,...CLASS_TRIALS});
