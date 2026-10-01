'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),pub=path.join(root,'public');
test('refresh visual 14.5 mantém os nove mobs 1-60 em GLB',()=>{
  for(const id of ['bolota','coelhorn','cogumelo','javali','golem','lobo','aranha','espirito','ciclope']){
    const p=path.join(pub,'assets','world','monsters','refresh14_5',id+'.glb');
    assert.ok(fs.existsSync(p),id+' sem GLB'); assert.ok(fs.statSync(p).size>1000,id+' GLB vazio');
  }
});
test('refresh visual 14.5 possui natureza e drops 3D',()=>{
  const files=['assets/world/nature_refresh14_5.glb','assets/world/drops/refresh14_5/gold.glb','assets/world/drops/refresh14_5/potion_red.glb','assets/world/drops/refresh14_5/potion_green.glb','assets/world/drops/refresh14_5/material.glb','assets/world/drops/refresh14_5/equipment.glb','assets/world/drops/refresh14_5/quest.glb'];
  for(const f of files){const p=path.join(pub,f);assert.ok(fs.existsSync(p),f+' ausente');assert.ok(fs.statSync(p).size>1000,f+' vazio');}
});
test('refresh visual não altera dados autoritativos de monstros',()=>{
  const data=fs.readFileSync(path.join(root,'server','data','monsters.js'),'utf8');
  for(const row of [['bolota','1, 3'],['coelhorn','4, 7'],['cogumelo','8, 11'],['javali','12, 15'],['golem','16, 20'],['lobo','21, 28'],['aranha','29, 37'],['espirito','38, 47'],['ciclope','48, 60']]){assert.match(data,new RegExp(row[0]+'[\\s\\S]{0,180}levels: \\['+row[1]+'\\]'));}
});
