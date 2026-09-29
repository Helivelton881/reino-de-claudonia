'use strict';

const QUESTS = Object.freeze({
  prova_guerreiro: {
    id:'prova_guerreiro', title:'Prova do Guerreiro', npcId:'guerreiro',
    category:'class-trial', exclusiveGroup:'class-trial', abandonable:true,
    requirements:{ level:15, cls:'aprendiz' },
    objectives:[{ type:'collect', itemId:'presa', count:6, label:'Presas de Javali', hint:'Os Javalis de Pedra vivem no morro a nordeste.' }],
    reward:{ classId:'guerreiro', weapon:'espada_soldado' }
  },
  prova_druida: {
    id:'prova_druida', title:'Prova do Druida', npcId:'druida',
    category:'class-trial', exclusiveGroup:'class-trial', abandonable:true,
    requirements:{ level:15, cls:'aprendiz' },
    objectives:[{ type:'collect', itemId:'chapeu', count:8, label:'Chapéus de Cogumelo', hint:'Os Cogumelos Bravos ficam a noroeste da vila.' }],
    reward:{ classId:'druida', weapon:'cajado_carvalho' }
  },
  prova_mago: {
    id:'prova_mago', title:'Prova do Mago', npcId:'mago',
    category:'class-trial', exclusiveGroup:'class-trial', abandonable:true,
    requirements:{ level:15, cls:'aprendiz' },
    objectives:[{ type:'collect', itemId:'gosma', count:12, label:'Gosmas de Bolota', hint:'As Bolotas pulam a sudeste da vila.' }],
    reward:{ classId:'mago', weapon:'varinha_arcana' }
  },
  prova_arqueiro: {
    id:'prova_arqueiro', title:'Prova do Arqueiro', npcId:'arqueiro',
    category:'class-trial', exclusiveGroup:'class-trial', abandonable:true,
    requirements:{ level:15, cls:'aprendiz' },
    objectives:[{ type:'collect', itemId:'pelo', count:10, label:'Pelos de Coelhorn', hint:'Os Coelhorns ficam a sudoeste da vila.' }],
    reward:{ classId:'arqueiro', weapon:'arco_curto' }
  }
});

module.exports = QUESTS;
