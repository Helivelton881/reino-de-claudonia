'use strict';
const {MONSTER_TYPES}=require('./monsters');
const {FAMILY_SKILLS,WORLD_BOSSES}=require('./monster-ecosystem');
const entries=Object.entries(MONSTER_TYPES).map(([key,m])=>({key,name:m.name,levels:m.levels,aggressive:m.aggressive,material:m.material,variants:['normal','rare','elite','giant'],skills:(FAMILY_SKILLS[key]||[]).map(s=>s.id)}));
const bosses=Object.values(WORLD_BOSSES).map(b=>({key:b.key,name:b.name,level:b.level,worldBoss:true,phases:b.phases.length}));
module.exports=Object.freeze({entries,bosses});
