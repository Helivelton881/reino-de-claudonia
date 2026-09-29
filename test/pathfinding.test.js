'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GridPathfinder } = require('../public/js/pathfinding.js');

function makeLineClear(isWalkable){
  return (ax,az,bx,bz)=>{
    const d = Math.hypot(bx-ax,bz-az), n = Math.max(1, Math.ceil(d/0.25));
    for(let i=0;i<=n;i++){
      const k=i/n, x=ax+(bx-ax)*k, z=az+(bz-az)*k;
      if(!isWalkable(x,z)) return false;
    }
    return true;
  };
}

test('rota direta permanece direta quando não há obstáculo', ()=>{
  const walk = ()=>true;
  const pf = new GridPathfinder({step:1,isWalkable:walk,lineClear:makeLineClear(walk)});
  const path = pf.findPath({x:-5,z:0},{x:5,z:0});
  assert.deepEqual(path,[{x:5,z:0}]);
});

test('A* contorna uma parede sem atravessar cantos', ()=>{
  const walk = (x,z)=> !(x>=-1.1 && x<=1.1 && z>=-3.1 && z<=3.1);
  const lineClear = makeLineClear(walk);
  const pf = new GridPathfinder({step:1,isWalkable:walk,lineClear,maxNodes:5000});
  const path = pf.findPath({x:-6,z:0},{x:6,z:0});
  assert.ok(path.length >= 2, 'deve criar waypoints para desviar');
  let prev={x:-6,z:0};
  let maxAbsZ=0;
  for(const p of path){
    assert.equal(lineClear(prev.x,prev.z,p.x,p.z),true,'segmento suavizado deve ser navegável');
    maxAbsZ=Math.max(maxAbsZ,Math.abs(p.z));
    prev=p;
  }
  assert.ok(maxAbsZ>3.1,'a rota deve passar por fora da parede');
  assert.ok(Math.hypot(prev.x-6,prev.z) < 0.01,'deve chegar ao destino');
});
