'use strict';const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'public','index.html'),'utf8'),wa=fs.readFileSync(path.join(root,'public','js','world-asset-manager.js'),'utf8'),server=fs.readFileSync(path.join(root,'server.js'),'utf8');
test('cliente possui bestiario e eventos de world boss',()=>{for(const s of ['bBestiary','winBestiary','worldBossSpawn','worldBossPhase','bossTelegraph','renderBestiary'])assert.match(html,new RegExp(s));});
test('cliente mapeia visuais phase10',()=>{for(const s of ['monster_rare.glb','monster_elite.glb','monster_giant.glb','worldboss_guardiao_cinzas.glb'])assert.ok(wa.includes(s),s);});
test('servidor entrega bestiario e instancia world boss',()=>{assert.ok(server.includes('bestiary: BESTIARY'));assert.ok(server.includes("spawnWorldBoss('guardiao_cinzas')"));});
