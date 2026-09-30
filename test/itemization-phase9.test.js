'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const EQUIPMENT=require('../server/data/equipment');
const SETS=require('../server/data/items/sets');
const {RARITIES,SOURCE_RARITY}=require('../server/data/items/rarities');
const {rollAffixes}=require('../server/data/items/affixes');
const {ItemManager,SLOTS,INVENTORY_LIMIT,STORAGE_LIMIT}=require('../server/items/item-manager');
const EconomyManager=require('../server/economy/economy-manager');
const {derivePlayer}=require('../server/combat/damage-calculator');

function makePlayer(extra={}){
  return {
    id:77,ws:{},L:60,x:-13,z:12,dirty:false,
    dados:{
      L:60,cls:'guerreiro',str:40,sta:40,dex:20,int:15,gold:100000,
      inv:[],storage:[],itemSeq:0,
      eq:Object.fromEntries(SLOTS.map(s=>[s,null])),
      equp:Object.fromEntries(SLOTS.map(s=>[s,0])),
      eqMeta:Object.fromEntries(SLOTS.map(s=>[s,null])),
      ...extra
    }
  };
}

test('fase 9 expande catalogo para faixa alvo e cobre raridades fontes e novos slots',()=>{
  const values=Object.values(EQUIPMENT);
  assert.ok(values.length>=120&&values.length<=180,'catalogo deve ficar entre 120 e 180 equipamentos');
  assert.deepEqual(Object.keys(RARITIES),['comum','incomum','raro','epico','lendario']);
  assert.equal(Object.keys(SETS).length,12);
  for(const source of ['npc','common','giant','dungeon','boss']) assert.ok(values.some(x=>x.source===source),'fonte ausente: '+source);
  for(const slot of ['arma','offhand','capacete','peitoral','luvas','botas','capa','acessorio1','acessorio2','voo']) assert.ok(values.some(x=>x.slot===slot),'slot ausente: '+slot);
  assert.equal(SOURCE_RARITY.boss,'lendario');
});

test('affixes sao server-side unicos e respeitam quantidade da raridade',()=>{
  const epic=EQUIPMENT.guerreiro_astral_peitoral;
  const legendary=EQUIPMENT.guerreiro_soberano_peitoral;
  const e=rollAffixes(epic,()=>0);
  const l=rollAffixes(legendary,()=>0);
  assert.equal(e.length,RARITIES.epico.affixes);
  assert.equal(l.length,RARITIES.lendario.affixes);
  assert.equal(new Set(e.map(x=>x.stat)).size,e.length);
  assert.equal(new Set(l.map(x=>x.stat)).size,l.length);
  assert.ok(l.every(x=>Number.isFinite(x.value)&&x.value>0));
});

test('item manager preserva metadados lock favorito equip e banco com limite',()=>{
  const sent=[],mgr=new ItemManager({send:(ws,m)=>sent.push(m)}),p=makePlayer();
  assert.equal(INVENTORY_LIMIT,32);assert.equal(STORAGE_LIMIT,60);
  assert.equal(mgr.addItem(p,{id:'guerreiro_vigilia_capacete',up:2,affixes:[{stat:'sta',value:3,name:'Vigor'}],socketed:[]}),true);
  mgr.ensurePlayer(p);
  const uid=p.dados.inv[0].uid;
  assert.ok(uid);
  assert.equal(mgr.flag(p,0,'favorite',true),true);
  assert.equal(mgr.flag(p,0,'locked',true),true);
  assert.equal(mgr.discard(p,0),false);
  assert.equal(mgr.flag(p,0,'locked',false),true);
  assert.equal(mgr.equip(p,0),true);
  assert.equal(p.dados.eq.capacete,'guerreiro_vigilia_capacete');
  assert.equal(p.dados.eqMeta.capacete.uid,uid);
  assert.equal(mgr.unequip(p,'capacete'),true);
  assert.equal(p.dados.inv[0].uid,uid);
  assert.equal(mgr.storagePut(p,0),true);
  assert.equal(p.dados.storage.length,1);
  assert.equal(mgr.storageTake(p,0),true);
  assert.equal(p.dados.inv.length,1);
  p.x=50;p.z=50;
  assert.equal(mgr.storagePut(p,0),false);
  assert.ok(sent.some(m=>m.t==='itemState'));
});

test('sockets consomem carta e entram no equipamento',()=>{
  const mgr=new ItemManager({send:()=>{}}),p=makePlayer();
  mgr.addItem(p,{id:'guerreiro_vigilia_capacete'});
  mgr.addItem(p,{id:'card_vigor',n:1});
  mgr.ensurePlayer(p);
  assert.equal(mgr.socket(p,'inventory',0,'card_vigor'),true);
  assert.deepEqual(p.dados.inv.find(x=>x.id==='guerreiro_vigilia_capacete').socketed,['card_vigor']);
  assert.equal(p.dados.inv.some(x=>x.id==='card_vigor'),false);
});

test('bonus 2 3 4 pecas de set altera atributos derivados de forma cumulativa',()=>{
  const base=makePlayer(),withSet=makePlayer();
  const pieces={capacete:'guerreiro_vigilia_capacete',peitoral:'guerreiro_vigilia_peitoral',luvas:'guerreiro_vigilia_luvas',botas:'guerreiro_vigilia_botas'};
  for(const [slot,id] of Object.entries(pieces)){withSet.dados.eq[slot]=id;withSet.dados.eqMeta[slot]={affixes:[],socketed:[]};}
  const a=derivePlayer(base.dados),b=derivePlayer(withSet.dados);
  assert.ok(b.defense>a.defense);
  assert.ok(b.maxHp>a.maxHp);
  assert.ok(b.atkMax>a.atkMax);
  assert.ok(b.sta>a.sta);
});

test('upgrade lendario +7 usa custo de raridade pity e pode quebrar sem protecao',()=>{
  const sent=[],mgr=new ItemManager({send:(ws,m)=>sent.push(m)}),p=makePlayer({
    inv:[{id:'pedra_aprimorar',n:20},{id:'runa_maior',n:4},{id:'guerreiro_soberano_capacete',n:1,up:6}]
  });
  mgr.ensurePlayer(p);
  const seq=[.99,.1];let i=0;
  const eco=new EconomyManager({send:(ws,m)=>sent.push(m),rng:()=>seq[Math.min(i++,seq.length-1)],itemManager:mgr});
  assert.equal(eco.act(p,{action:'enhance',kind:'inventory',ref:2}),true);
  const result=sent.filter(m=>m.t==='economyState').at(-1);
  assert.equal(result.result,'broken');
  assert.equal(result.cost.stones,5);
  assert.ok(result.cost.gold>2000);
  assert.equal(p.dados.inv.some(x=>x.id==='guerreiro_soberano_capacete'),false);
  assert.equal(p.dados.upPity,1);
});

test('20 familias visuais Blender da fase 9 existem em GLB e cabem no budget',()=>{
  const dir=path.join(__dirname,'..','public','assets','equipment','phase9');
  const files=[
    'weapon_solaris_blade.glb','weapon_aurora_staff.glb','weapon_eclipse_scepter.glb','weapon_horizon_bow.glb',
    'offhand_bastion_shield.glb','offhand_verdant_totem.glb','offhand_arcane_grimoire.glb','offhand_horizon_quiver.glb',
    'helmet_bastion.glb','helmet_aurora.glb','helmet_eclipse.glb','helmet_horizon.glb',
    'armor_bastion.glb','armor_aurora.glb','armor_eclipse.glb','armor_horizon.glb',
    'cape_bastion.glb','cape_aurora.glb','cape_eclipse.glb','cape_horizon.glb'
  ];
  assert.equal(files.length,20);
  for(const file of files){
    const full=path.join(dir,file);
    assert.ok(fs.existsSync(full),file+' ausente');
    const size=fs.statSync(full).size;
    assert.ok(size>1024&&size<256*1024,file+' fora do budget');
  }
});

test('cliente fase 9 consome catalogo exibe filtros banco tooltip e modelos equipados',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
  for(const marker of ['applyItemCatalog','itemCatalog','data-ifilter="favorite"','data-ifilter="rare"','renderBank','data-bank="1"','syncHeroEquipment',"m.t==='gear'",'Sockets','Comparação']) assert.ok(html.includes(marker),'marker ausente: '+marker);
  const cfg=fs.readFileSync(path.join(__dirname,'..','public','js','claudonia-character-config.js'),'utf8');
  assert.ok(cfg.includes('chestRigid'));assert.ok(cfg.includes('cape'));assert.ok(cfg.includes('offhand'));
});

test('requisitos de nivel classe e mochila cheia continuam autoritativos',()=>{
  const mgr=new ItemManager({send:()=>{}}),p=makePlayer({L:10,cls:'guerreiro'});
  p.L=10;
  mgr.addItem(p,{id:'mago_arma_60'});
  mgr.ensurePlayer(p);
  assert.equal(mgr.equip(p,0),false,'classe e nivel invalidos devem falhar');
  p.dados.inv=Array.from({length:32},(_,i)=>({id:'pocao_vida',n:i+1}));
  mgr.ensurePlayer(p);
  assert.equal(mgr.addItem(p,{id:'guerreiro_arma_8'}),false,'mochila cheia nao pode aceitar equipamento novo');
});

test('loja NPC vende apenas equipamento marcado como npc e rejeita tiers futuros',()=>{
  const sent=[],mgr=new ItemManager({send:(ws,m)=>sent.push(m)}),p=makePlayer(),eco=new EconomyManager({send:(ws,m)=>sent.push(m),itemManager:mgr});
  const before=p.dados.gold;
  assert.equal(eco.act(p,{action:'buy',itemId:'guerreiro_arma_60'}),false);
  assert.equal(p.dados.gold,before);
  assert.equal(eco.act(p,{action:'buy',itemId:'guerreiro_arma_8'}),true);
  assert.ok(p.dados.inv.some(x=>x.id==='guerreiro_arma_8'));
});


test('equip rejeita classe nivel e unequip respeita mochila cheia',()=>{
  const sent=[],mgr=new ItemManager({send:(ws,m)=>sent.push(m)});
  const low=makePlayer({L:10,cls:'guerreiro'});low.L=10;
  mgr.addItem(low,{id:'guerreiro_arma_60'});
  mgr.ensurePlayer(low);
  assert.equal(mgr.equip(low,0),false,'nivel baixo deve ser rejeitado');
  const wrong=makePlayer({L:60,cls:'mago'});wrong.L=60;
  mgr.addItem(wrong,{id:'guerreiro_arma_60'});
  mgr.ensurePlayer(wrong);
  assert.equal(mgr.equip(wrong,0),false,'classe errada deve ser rejeitada');
  const full=makePlayer();
  full.dados.eq.capacete='guerreiro_vigilia_capacete';
  full.dados.eqMeta.capacete={uid:'eq:helm',affixes:[],socketed:[]};
  full.dados.inv=Array.from({length:INVENTORY_LIMIT},(_,i)=>({id:'pocao_vida',n:i+1}));
  mgr.ensurePlayer(full);
  assert.equal(full.dados.inv.length,INVENTORY_LIMIT);
  assert.equal(mgr.unequip(full,'capacete'),false,'unequip nao pode estourar limite');
  assert.equal(full.dados.eq.capacete,'guerreiro_vigilia_capacete');
});

test('drop server-side gera equipamento com raridade e afixos e preserva uid no pickup',()=>{
  const {rollLoot,equipmentPool}=require('../server/loot/loot-tables');
  const LootManager=require('../server/loot/loot-manager');
  const monster={level:60,giant:true,material:'nucleo',x:0,z:0};
  assert.ok(equipmentPool(monster).length>0);
  const seq=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];let qi=0;
  const rng=()=>seq[qi++%seq.length];
  const rolled=rollLoot(monster,{rng,luck:3});
  const gear=rolled.find(x=>x&&x.id&&EQUIPMENT[x.id]);
  assert.ok(gear,'giant deve poder gerar equipamento');
  assert.equal(gear.rarity,EQUIPMENT[gear.id].rarity);
  assert.equal(gear.affixes.length,RARITIES[gear.rarity].affixes);
  const p=makePlayer({inv:[]});p.x=0;p.z=0;
  const players=new Map([[p.id,p]]),sent=[];
  const mgr=new ItemManager({send:(ws,m)=>sent.push(m)});
  const loot=new LootManager({players,send:(ws,m)=>sent.push(m),emitNearby:()=>{},rng:()=>0,itemManager:mgr});
  const entity={id:999,x:0,z:0,value:gear,allowed:new Set([p.id]),expiresAt:Date.now()+10000};
  loot.loot.set(entity.id,entity);
  assert.equal(loot.pickup(p,999),true);
  const row=p.dados.inv.find(x=>x.id===gear.id);
  assert.ok(row&&row.uid,'pickup de gear precisa criar uid persistente');
  assert.deepEqual(row.affixes,gear.affixes);
});


test('encaixes visuais da fase 9 carregam escala orientacao e offset profissionais',()=>{
  for(const cls of ['guerreiro','druida','mago','arqueiro']){
    const weapon=EQUIPMENT[cls+'_arma_60'];
    assert.ok(weapon.modelScale>0&&weapon.modelScale<=.60);
    assert.equal(weapon.modelQuaternion.length,4);
    const off=EQUIPMENT[cls+'_offhand_60'];
    assert.ok(off.modelScale>0&&off.modelScale<=.75);
    assert.equal(off.modelQuaternion.length,4);
    const helmet=EQUIPMENT[cls+'_soberano_capacete'];
    assert.equal(helmet.modelScale,.90);
    assert.deepEqual(helmet.modelPosition,[0,.18,.10]);
  }
  const catalog=new ItemManager({send:()=>{}}).catalog();
  const sword=catalog.equipment.find(x=>x.id==='guerreiro_arma_60');
  assert.equal(sword.modelScale,.58);
  assert.deepEqual(sword.modelQuaternion,[0,0,-0.70710678,0.70710678]);
  const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
  assert.ok(html.includes('prepareEquipmentModel'));
  assert.ok(html.includes('qaApplyItemCatalog:applyItemCatalog'));
});
