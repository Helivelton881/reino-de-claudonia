'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {derivePlayer,playerDamage}=require('../server/combat/damage-calculator');

test('deriva atributos usando apenas dados e equipamentos conhecidos pelo servidor',()=>{
  const s=derivePlayer({L:15,cls:'guerreiro',str:30,sta:20,dex:15,int:15,eq:{arma:'espada_soldado',peitoral:'peitoral_ferro'},equp:{arma:2}});
  assert.equal(s.level,15);assert.deepEqual(s.weapon,[17,23]);assert.equal(s.maxHp,384);assert.equal(s.defense,13);assert.equal(s.ranged,false);
});

test('dano é determinístico com RNG injetado',()=>{
  const s=derivePlayer({L:10,cls:'aprendiz',str:20,sta:15,dex:15,int:15,eq:{arma:'espada_ferro'}});
  const r=playerDamage(s,{level:10,defense:7},{multiplier:1},()=>0);
  assert.deepEqual(r,{damage:34,miss:false,critical:true});
});
