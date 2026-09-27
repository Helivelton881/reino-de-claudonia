'use strict';

const EQUIPMENT = {
  espada_treino:{ slot:'arma', req:1, atk:[4,7] }, espada_ferro:{ slot:'arma', req:5, atk:[8,12] }, machado_rustico:{ slot:'arma', req:10, atk:[12,18] },
  espada_soldado:{ slot:'arma', req:15, atk:[16,22], cls:'guerreiro' }, machado_guerra:{ slot:'arma', req:18, atk:[22,30], cls:'guerreiro' }, cajado_carvalho:{ slot:'arma', req:15, atk:[13,18], cls:'druida' },
  cajado_runico:{ slot:'arma', req:18, atk:[18,25], cls:'druida' }, varinha_arcana:{ slot:'arma', req:15, atk:[15,21], cls:'mago' }, cetro_cristal:{ slot:'arma', req:18, atk:[21,29], cls:'mago' },
  arco_curto:{ slot:'arma', req:15, atk:[14,20], cls:'arqueiro' }, arco_longo:{ slot:'arma', req:18, atk:[20,28], cls:'arqueiro' }, gorro_couro:{ slot:'capacete', req:3, def:2 },
  botas_viajante:{ slot:'botas', req:4, def:2 }, tunica_reforcada:{ slot:'peitoral', req:6, def:4 }, botas_ferro:{ slot:'botas', req:10, def:4 },
  capacete_ferro:{ slot:'capacete', req:12, def:5 }, peitoral_ferro:{ slot:'peitoral', req:12, def:8 }, capacete_aco:{ slot:'capacete', req:18, def:8 },
  peitoral_aco:{ slot:'peitoral', req:18, def:12 }, botas_aco:{ slot:'botas', req:18, def:6 },
  prancha_madeira:{slot:'voo',req:20},vassoura_simples:{slot:'voo',req:20},prancha_veloz:{slot:'voo',req:20},vassoura_veloz:{slot:'voo',req:20},prancha_celeste:{slot:'voo',req:20},vassoura_celeste:{slot:'voo',req:20}
};

for (const [req, key] of [[25,'prata'],[35,'runico'],[45,'celeste'],[55,'dragao']]) {
  EQUIPMENT[`capacete_${key}`] = { slot:'capacete', req, def:Math.round(req*0.45) };
  EQUIPMENT[`peitoral_${key}`] = { slot:'peitoral', req, def:Math.round(req*0.7) };
  EQUIPMENT[`botas_${key}`] = { slot:'botas', req, def:Math.round(req*0.35) };
  const atk = [Math.round(req*1.15), Math.round(req*1.55)];
  EQUIPMENT[`espada_${key}`] = { slot:'arma', req, atk, cls:'guerreiro' };
  EQUIPMENT[`cajado_${key}`] = { slot:'arma', req, atk:[atk[0]-2,atk[1]-3], cls:'druida' };
  EQUIPMENT[`cetro_${key}`] = { slot:'arma', req, atk:[atk[0]+1,atk[1]+2], cls:'mago' };
  EQUIPMENT[`arco_${key}`] = { slot:'arma', req, atk:[...atk], cls:'arqueiro' };
}

module.exports = Object.freeze(EQUIPMENT);
