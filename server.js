// Reino De Claudonia - servidor (Fases 3 a 5)
// Serve os arquivos do jogo, confere o login no Supabase e mantém os jogadores
// conectados por WebSocket: posições, chat, salvamento, grupo, troca, loja pessoal e guilda.
// As regras de grupo, loja e guilda seguem as do Flyff; nomes e textos são nossos.

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { ZONES, MONSTER_TYPES } = require('./server/data/monsters');
const BESTIARY = require('./server/data/bestiary');
const SpawnManager = require('./server/world/spawn-manager');
const MonsterManager = require('./server/world/monster-manager');
const { WorldNavigation } = require('./server/world/navigation-world');
const { validateMovement, sanitizeSavedPosition } = require('./server/world/player-movement');
const CombatManager = require('./server/combat/combat-manager');
const LootManager = require('./server/loot/loot-manager');
const EconomyManager = require('./server/economy/economy-manager');
const QuestManager = require('./server/quests/quest-manager');
const SkillManager = require('./server/skills/skill-manager');
const {ItemManager} = require('./server/items/item-manager');
const NpcServiceManager = require('./server/npcs/npc-service-manager');
const NPCS = require('./server/data/npcs');
const EQUIPMENT = require('./server/data/equipment');
const {DUNGEONS} = require('./server/data/dungeons');
const DungeonManager = require('./server/dungeons/dungeon-manager');
const PetManager = require('./server/pets/pet-manager');
const SocialManager = require('./server/social/social-manager');
const PvpManager = require('./server/pvp/pvp-manager');
const GatherManager = require('./server/lifestyle/gather-manager');
const CraftManager = require('./server/lifestyle/craft-manager');
const {DUNGEON_MATERIALS}=require('./server/data/lifestyle');
const LiveOpsManager=require('./server/live-ops/live-ops-manager');

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // chave pública (anon/publishable)
const MAX_JOGADORES = 100;
const MUNDO = 420; // metade do tamanho do mundo (para conferir posições)
const COMBATE_AUTORITATIVO = process.env.COMBATE_AUTORITATIVO !== '0';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Configure as variáveis SUPABASE_URL e SUPABASE_ANON_KEY.');
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(SUPABASE_URL, SUPABASE_KEY, opts);
// Cliente com o token do próprio jogador: o banco só deixa mexer no que é dele (RLS).
const dbDoJogador = token => createClient(SUPABASE_URL, SUPABASE_KEY, {
  ...opts, global: { headers: { Authorization: `Bearer ${token}` } }
});

/* ---------- HTTP ---------- */
const app = express();
const players = new Map();

app.get('/config.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store')
    .send(`window.IV_CONFIG=${JSON.stringify({ url: SUPABASE_URL, key: SUPABASE_KEY })};`);
});
app.get('/saude', (req, res) => res.json({ ok: true, online: players.size }));
app.get('/api/live-ops/calendar',(req,res)=>res.json({ok:true,...liveOpsManager.catalog()}));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.set('Cache-Control', 'no-cache'); }
}));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

/* ---------- Utilidades ---------- */
let nextId = 1;
const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
function broadcast(msg, except) {
  const s = JSON.stringify(msg);
  for (const p of players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s);
}
const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v)) ? Math.min(max, Math.max(min, v)) : null;
const inteiro = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const ADMIN_CHAR_IDS=new Set(['d1d8d695-c26f-4dbb-a3d7-5e79323b385d']);
const ADMIN_USER_IDS=new Set(['68fbb675-f504-41af-adb1-e2161bca4930']);
const isAdmin=p=>!!p&&ADMIN_CHAR_IDS.has(p.charId)&&ADMIN_USER_IDS.has(p.userId);
const perto = (a, b, d) => Math.hypot(a.x - b.x, a.z - b.z) < d;
const resumo = p => ({ id:p.id,name:p.name,L:p.L,x:p.x,y:p.y,z:p.z,f:p.f,cls:p.dados?.cls||'aprendiz',gender:p.dados?.gender==='female'?'female':'male',gear:{...(p.dados?.eq||{})},
  g:p.guild?p.guild.nome:null,s:p.shop?p.shop.title:null });
const aviso = (p, msg) => send(p.ws, { t: 'aviso', msg });
const erro = (p, msg) => send(p.ws, { t: 'erro', msg });

const spawnManager = new SpawnManager(ZONES);
const worldNavigation = new WorldNavigation();
const questManager = new QuestManager({send});
const skillManager = new SkillManager({send});
const itemManager = new ItemManager({send});
const dungeonManager = new DungeonManager({catalog:DUNGEONS,players,send});
const emitirPerto = (point, msg) => { for (const p of players.values()) if (perto(point, p, 110)) send(p.ws, msg); };
let lootManager;
const combatManager = new CombatManager({
  players, send,
  awardExperience: (killer, monster) => premiarMonstro(killer, monster),
  onMonsterDeath: (monster, killer) => {
    const allowedIds = monster.worldBoss ? (()=>{const rows=[...(monster.contributions||new Map()).entries()],total=rows.reduce((s,x)=>s+x[1],0)||1,min=monster.bossConfig?.rewards?.minContribution||.03;return rows.filter(x=>x[1]/total>=min).map(x=>x[0]);})() : (killer.party ? [...killer.party.members] : [killer.id]);
    const luck = killer.party && killer.party.skills.sorte > Date.now() ? 2 : 1;
    const copies = killer.party && killer.party.skills.presente > Date.now() ? 2 : 1;
    if(monster.worldBoss){for(const id of allowedIds){const q=players.get(id);if(q)lootManager.spawn(monster,q,{allowedIds:[id],luck:1,copies:1});}}
    else lootManager.spawn(monster, killer, { allowedIds, luck, copies });
    const recipients = allowedIds.map(id=>players.get(id)).filter(q=>q&&Math.hypot(q.x-monster.x,q.z-monster.z)<=40);
    recipients.forEach(q=>{
      questManager.recordEvent(q,'kill',{monsterKey:monster.key,giant:monster.giant,count:1});
      liveOpsManager.record(q,'kill',{count:1});
      if(monster.giant){questManager.recordEvent(q,'boss',{monsterKey:monster.key,giant:true,count:1});liveOpsManager.record(q,'giant',{count:1,target:monster.key});itemManager.addItem(q,{id:'fragmento_gigante',n:monster.worldBoss?2:1});q.dirty=true;itemManager.sync(q,{event:'giant-material'});}
    });
  }
});
const monsterManager = new MonsterManager({ types:MONSTER_TYPES, zones:ZONES, spawnManager, players, send, navigation:worldNavigation });
lootManager = new LootManager({ players, send, emitNearby:emitirPerto, itemManager });
const economyManager = new EconomyManager({send,itemManager});
const gatherManager = new GatherManager({send,itemManager});
const craftManager = new CraftManager({send,itemManager});
const liveOpsManager = new LiveOpsManager({send,itemManager});
const npcServiceManager = new NpcServiceManager({send,combatManager,economyManager});
const petManager = new PetManager({send,itemManager,lootManager});
const socialManager = new SocialManager({players,send,itemManager,save:salvar});
const pvpManager = new PvpManager({players,send,skillManager});
combatManager.setMonsterManager(monsterManager); combatManager.setSkillManager(skillManager); combatManager.setItemManager(itemManager); monsterManager.setCombatManager(combatManager); monsterManager.initialize(); monsterManager.spawnWorldBoss('guardiao_cinzas'); monsterManager.spawnWorldBoss('rei_ossario');

async function salvar(p) {
  if (!p.dirty && !p.posDirty) return;
  p.dirty = false; p.posDirty = false;
  const { error } = await dbDoJogador(p.token).from('iv_personagens')
    .update({ dados: p.dados, pos_x: p.x, pos_z: p.z, atualizado_em: new Date().toISOString() })
    .eq('id', p.charId);
  if (error) { console.error(`Erro ao salvar ${p.name}:`, error.message); p.dirty = true; }
}

/* ---------- Itens na mochila (usado por troca, loja e doação) ---------- */
// Linha de item: {id, n} (empilha) ou equipamento {id, n:1, up} (up = aprimoramento).
function lerItens(lista,max,player=null){
  if(!Array.isArray(lista)||lista.length>max)return null;
  const items=[],inv=player&&Array.isArray(player.dados?.inv)?player.dados.inv:[];
  for(const it of lista){
    if(!it||typeof it.id!=='string'||!/^[a-z0-9_]{1,64}$/.test(it.id)||!inteiro(it.n,1,9999))return null;
    const def=EQUIPMENT[it.id];
    let x;
    if(def){
      let row=null;
      if(typeof it.uid==='string')row=inv.find(s=>s&&s.uid===it.uid&&s.id===it.id);
      if(!row)row=inv.find(s=>s&&s.id===it.id&&(s.up||0)===(it.up||0)&&!s.locked);
      if(!row||row.locked)return null;
      x={...row,n:1};
    }else x={id:it.id,n:it.n};
    if(it.price!==undefined){if(!inteiro(it.price,1,1e9))return null;x.price=it.price;}
    items.push(x);
  }
  return items;
}
// Tira itens e ouro de uma cópia da mochila. Equipamentos são identificados por uid.
function tirarItens(dados,items,gold){
  if((dados.gold||0)<gold)return null;
  const inv=(Array.isArray(dados.inv)?dados.inv:[]).filter(Boolean).map(s=>({...s,affixes:Array.isArray(s.affixes)?s.affixes.map(a=>({...a})):s.affixes,socketed:Array.isArray(s.socketed)?[...s.socketed]:s.socketed}));
  for(const it of items){
    if(EQUIPMENT[it.id]){
      const i=inv.findIndex(s=>s.id===it.id&&(it.uid?s.uid===it.uid:(s.up||0)===(it.up||0))&&!s.locked);
      if(i<0)return null;
      inv.splice(i,1);
    }else{
      let falta=it.n;
      for(const s of inv)if(!EQUIPMENT[s.id]&&s.id===it.id&&falta>0){const k=Math.min(falta,s.n);s.n-=k;falta-=k;}
      if(falta>0)return null;
    }
  }
  return inv.filter(s=>s.n>0);
}
function porItens(inv,items){
  for(const it of items){
    if(EQUIPMENT[it.id]){
      const {price,...copy}=it;inv.push({...copy,n:1});
    }else{
      const s=inv.find(s=>!EQUIPMENT[s.id]&&s.id===it.id);if(s)s.n+=it.n;else inv.push({id:it.id,n:it.n});
    }
  }
  return inv;
}
const semPreco=items=>items.map(({price,...x})=>x);

/* ---------- WebSocket ---------- */
wss.on('connection', ws => {
  let p = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  const semLogin = setTimeout(() => { if (!p) ws.close(4001, 'sem login'); }, 10000);

  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    if (!p) {
      if (m.t !== 'auth' || typeof m.token !== 'string' || typeof m.charId !== 'string' || ws.entrando) return;
      ws.entrando = true;
      try {
        if (players.size >= MAX_JOGADORES) { send(ws, { t: 'erro', msg: 'Servidor cheio. Tente daqui a pouco.' }); return ws.close(4006); }
        const { data, error } = await anon.auth.getUser(m.token);
        if (error || !data.user) { send(ws, { t: 'erro', msg: 'Sessão expirada. Entre de novo.' }); return ws.close(4003); }
        const { data: row, error: e2 } = await dbDoJogador(m.token).from('iv_personagens')
          .select('id,nome,dados,pos_x,pos_z').eq('id', m.charId).single();
        if (e2 || !row) { send(ws, { t: 'erro', msg: 'Personagem não encontrado.' }); return ws.close(4004); }

        for (const o of players.values()) {
          if (o.charId === row.id) { send(o.ws, { t: 'erro', msg: 'Este personagem entrou em outro aparelho.' }); o.ws.close(4005); }
        }
        const savedPos = sanitizeSavedPosition(worldNavigation,
          Number.isFinite(row.pos_x) ? row.pos_x : 0,
          Number.isFinite(row.pos_z) ? row.pos_z : 5);
        const startSurface = worldNavigation.groundSurfaceAt(savedPos.x, savedPos.z);
        const novo = {
          id: nextId++, ws, userId: data.user.id, charId: row.id, name: row.nome, token: m.token,
          L: (row.dados && row.dados.L) || 1, x: savedPos.x, y: startSurface ? startSurface.h : 0, z: savedPos.z, f: 0, a: 0,
          dados: row.dados || {}, dirty: false, posDirty: savedPos.corrected, moved: true, lastChat: 0,
          hp: 0, maxHp: 1, party: null, trade: null, shop: null, guild: null, invites: new Map(), lastInv: 0, expBucket: 20,
          lastPosAt: Date.now(), fallingFromFlight: false, invisible:false
        };
        novo.admin=isAdmin(novo);
        itemManager.ensurePlayer(novo);
        if (COMBATE_AUTORITATIVO) combatManager.initializePlayer(novo);
        questManager.initializePlayer(novo);
        skillManager.initializePlayer(novo);
        liveOpsManager.ensure(novo);
        if (COMBATE_AUTORITATIVO) combatManager.refresh(novo);
        await carregarGuilda(novo);
        if (ws.readyState !== 1) return;
        p = novo;
        players.set(p.id, p);
        dungeonManager.reconnect(p);
        restaurarGrupo(p);
        socialManager.onLogin(p);
    pvpManager.onLogin(p);
        if(!Object.keys(p.dados.pets||{}).length)petManager.grant(p,'lumim');
        else petManager.sync(p,{event:'login'});
        clearTimeout(semLogin);
        send(ws, {
          t: 'welcome', id: p.id,
          char: { nome: row.nome, x: p.x, z: p.z }, guild: p.guild,
          others: [...players.values()].filter(o => o !== p && !o.invisible).map(resumo),
          authoritativeCombat: COMBATE_AUTORITATIVO,
          monsters: COMBATE_AUTORITATIVO ? monsterManager.snapshotFor(p) : [],
          loot: COMBATE_AUTORITATIVO ? lootManager.snapshotFor(p) : [],
          combat: COMBATE_AUTORITATIVO ? { hp:p.hp,maxHp:p.stats.maxHp,mp:p.mp,maxMp:p.stats.maxMp,fp:p.fp,maxFp:p.stats.maxFp } : null,
          questCatalog: questManager.publicCatalog(),
          questState: questManager.snapshot(p),
          questLegacy: p.dados.quest || null,
          skillCatalog: skillManager.publicCatalog(),
          skillState: skillManager.snapshot(p),
          classCatalog: skillManager.classCatalog(),
          itemCatalog: itemManager.catalog(),
          itemState: itemManager.snapshot(p),
          lifestyleCatalog: {...gatherManager.catalog(),...craftManager.catalog()},
          lifestyleState: gatherManager.ensure(p),
          lifestyleNodes: gatherManager.snapshot(),
          liveOpsCatalog: liveOpsManager.catalog(),
          liveOpsState: liveOpsManager.snapshot(p),
          npcCatalog: NPCS,
          bestiary: BESTIARY,
          admin: p.admin===true
        });
        broadcast({ t: 'join', ...resumo(p) }, p);
        console.log(`Entrou: ${p.name} (${players.size} online)`);
      } catch (err) {
        console.error(err);
        send(ws, { t: 'erro', msg: 'Erro no servidor.' });
        ws.close(1011);
      } finally { ws.entrando = false; }
      return;
    }

    switch (m.t) {
      case 'pos': {
        const x = num(m.x, -MUNDO, MUNDO), y = num(m.y, -80, 160), z = num(m.z, -MUNDO, MUNDO), f = num(m.f, -1000, 1000);
        if (x === null || y === null || z === null || f === null) return;
        const agora=Date.now(), elapsed=Math.max(0.05,(agora-p.lastPosAt)/1000), distance=Math.hypot(x-p.x,z-p.z);
        p.lastPosAt=agora;
        const move=validateMovement({navigation:worldNavigation,player:p,to:{x,y,z},requestedAction:m.a,elapsed,now:agora});
        if (!move.ok) return send(p.ws,{t:'positionReject',x:p.x,y:p.y,z:p.z,reason:move.reason});
        if (p.shop && distance > 0.5) fecharLoja(p);
        p.x = x; p.y = y; p.z = z; p.f = f;
        p.a = move.action===6&&!p.shop ? 0 : move.action;
        p.fallingFromFlight = !!move.fallingFromFlight;
        p.moved = true; p.posDirty = true;
        questManager.recordPosition(p,p.x,p.z);
        for(const [zoneId,zone] of Object.entries(ZONES))if(Math.hypot(p.x-zone.x,p.z-zone.z)<=zone.radius+6){liveOpsManager.explore(p,zoneId);break;}
        break;
      }
      case 'chat': {
        if (typeof m.text !== 'string') return;
        const text = m.text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
        const agora = Date.now();
        if (!text || agora - p.lastChat < 800) return;
        p.lastChat = agora;
        const msg = { t: 'chat', id: p.id, name: p.name, text };
        if (m.ch === 'g'){
          if (!p.party) return erro(p, 'Você não está em um grupo.');
          msg.ch = 'g'; paraGrupo(p.party, msg);
        } else if (m.ch === 'gu'){
          if (!p.guild) return erro(p, 'Você não está em uma guilda.');
          msg.ch = 'gu'; for (const o of players.values()) if (o.guild && o.guild.id === p.guild.id) send(o.ws, msg);
        } else broadcast(msg);
        break;
      }
      case 'save': {
        if (!m.dados || typeof m.dados !== 'object' || Array.isArray(m.dados)) return;
        if (JSON.stringify(m.dados).length > 20000) return;
        if (COMBATE_AUTORITATIVO) {
          const protectedKeys=new Set(['L','exp','gold','inv','storage','itemSeq','hp','mp','fp','eq','equp','eqMeta','str','sta','dex','int','pts','cls','upPity','quest','quests','skillTree','pets','petActive','social','mail','pvp','lifestyle']);
          protectedKeys.add('liveOps');
          for(const [key,value] of Object.entries(m.dados)) if(!protectedKeys.has(key)) p.dados[key]=value;
          Object.assign(p.dados,{L:p.L,hp:p.hp,mp:p.mp,fp:p.fp});
        } else {
          const quest=p.dados.quest, quests=p.dados.quests;
          p.dados=m.dados; p.dados.quest=quest; p.dados.quests=quests;
        }
        p.dirty = true;
        if (!COMBATE_AUTORITATIVO) {
          const L = num(m.dados.L, 1, 200);
          if (L && L !== p.L) { p.L = L; broadcast({ t: 'info', id: p.id, L }); if (p.party) enviarGrupo(p.party); }
        }
        break;
      }
      case 'hp': {
        if (COMBATE_AUTORITATIVO) break;
        const max = num(m.max, 1, 100000), hp = num(m.hp, 0, 100000);
        if (max === null || hp === null) return;
        p.hp = Math.round(Math.min(hp, max)); p.maxHp = Math.round(max);
        if (p.party) for (const id of p.party.members){ const o = players.get(id); if (o && o !== p) send(o.ws, { t: 'php', id: p.id, hp: p.hp, max: p.maxHp }); }
        break;
      }
      case 'pkill': if (!COMBATE_AUTORITATIVO) monstroDoGrupo(p, m); break;
      case 'attack': if (COMBATE_AUTORITATIVO) combatManager.attack(p,m); break;
      case 'skill': if (COMBATE_AUTORITATIVO) combatManager.skill(p,m); break;
      case 'pickup': if (COMBATE_AUTORITATIVO && lootManager.pickup(p,m.id)){questManager.sync(p,{event:'inventory'});liveOpsManager.record(p,'collect',{count:1});} break;
      case 'petPickup': { if(!COMBATE_AUTORITATIVO)break;const drop=lootManager.get(m.id),check=petManager.pickup(p,drop);if(!check.ok)return erro(p,check.reason);const active=p.dados.petActive,cfg=active&&require('./server/data/pets').PETS[active];if(cfg&&lootManager.pickup(p,m.id,{radius:cfg.pickupRadius})){petManager.gainExp(p,1);questManager.sync(p,{event:'inventory'});}break; }
      case 'itemUse': if (COMBATE_AUTORITATIVO && combatManager.useItem(p,m)) questManager.recordEvent(p,'use-item',{itemId:m.itemId,count:1}); break;
      case 'equipment': if (COMBATE_AUTORITATIVO && combatManager.equipment(p,m)) broadcast({t:'gear',id:p.id,cls:p.dados.cls||'aprendiz',gear:{...(p.dados.eq||{})}},p); break;
      case 'item': if (COMBATE_AUTORITATIVO) { if(m.action==='flag') itemManager.flag(p,m.index,m.key,m.value); else if(m.action==='discard') itemManager.discard(p,m.index); else if(m.action==='storagePut') itemManager.storagePut(p,m.index); else if(m.action==='storageTake') itemManager.storageTake(p,m.index); else if(m.action==='socket') itemManager.socket(p,m.where,m.ref,m.cardId); else itemManager.fail(p,'Ação de item inválida.'); } break;
      case 'attribute': if (COMBATE_AUTORITATIVO) combatManager.addAttribute(p,m); break;
      case 'npcTalk': questManager.talk(p,m.npcId); break;
      case 'npcService': if (COMBATE_AUTORITATIVO) npcServiceManager.act(p,m); break;
      case 'dungeon': {
        if(m.action==='enter'){const npc=NPCS.find(n=>n.id==='guardiao_cripta');if(!npc||!perto(p,npc,5))return erro(p,'Aproxime-se do Guardião Vaelor.');const out=dungeonManager.create(p,m.dungeonId||'cripta_ecos',m.difficulty||'normal');if(!out.ok)erro(p,out.reason);}
        else if(m.action==='attack') dungeonManager.attack(p,m.targetId);
        else if(m.action==='interact') dungeonManager.progress(p,'interact',m.target,1);
        else if(m.action==='chest'){const out=dungeonManager.claimChest(p);if(!out.ok)erro(p,'Baú indisponível ou já coletado.');else{liveOpsManager.record(p,'dungeon',{count:1});const pool=Object.values(EQUIPMENT).filter(x=>x.source==='dungeon'&&Number(x.req||x.level||1)<=p.L&&(!x.cls||x.cls===p.dados.cls));const granted=[];const matN=DUNGEON_MATERIALS.cripta_ecos?.[dungeonManager.getForPlayer(p.id)?.difficulty||'normal']||2;itemManager.addItem(p,{id:'cristal_eco',n:matN});for(let n=0;n<out.loot.rolls&&pool.length;n++){const it=pool[Math.floor(Math.random()*pool.length)];if(itemManager.addItem(p,{id:it.id,n:1}))granted.push(it.id);}p.dirty=true;itemManager.sync(p,{event:'dungeon-chest'});send(p.ws,{t:'dungeonLoot',loot:out.loot,items:granted});}}
        break;
      }
      case 'skillTree': {
        let changed=false;
        if(m.action==='learn') changed=skillManager.learn(p,m.skillId);
        else if(m.action==='learnMax') changed=skillManager.learnMax(p,m.skillId);
        else if(m.action==='respec') changed=skillManager.respec(p,m.npcId);
        else if(m.action==='specialize') changed=skillManager.chooseSpecialization(p,m.specialization,m.npcId);
        else skillManager.fail(p,'Ação de árvore inválida.');
        if(changed&&COMBATE_AUTORITATIVO){const st=combatManager.refresh(p);p.hp=Math.min(p.hp,st.maxHp);p.mp=Math.min(p.mp,st.maxMp);p.fp=Math.min(p.fp,st.maxFp);Object.assign(p.dados,{hp:p.hp,mp:p.mp,fp:p.fp});combatManager.sync(p,{skillTreeChanged:true});if(p.party)enviarGrupo(p.party);}
        break;
      }
      case 'quest': questManager.handle(p,m,{changeClass:(player,cls)=>{const ok=combatManager.changeClassFromQuest(player,cls);if(ok){skillManager.onClassChange(player);broadcast({t:'gear',id:player.id,cls:player.dados.cls||'aprendiz',gear:{...(player.dados.eq||{})}},player);}return ok;},grantReward:(player,reward)=>premiarQuest(player,reward)}); break;
      case 'resetCharacter': if (COMBATE_AUTORITATIVO && combatManager.resetPlayer(p)) broadcast({t:'gear',id:p.id,cls:p.dados.cls||'aprendiz',gear:{...(p.dados.eq||{})}},p); break;
      case 'economy': if (COMBATE_AUTORITATIVO && economyManager.act(p,m)) broadcast({t:'gear',id:p.id,cls:p.dados.cls||'aprendiz',gear:{...(p.dados.eq||{})}},p); break;
      case 'combatRespawn': if (COMBATE_AUTORITATIVO && combatManager.respawn(p,0,5)){const surf=worldNavigation.playerSurfaceAt(0,5);p.y=surf?surf.h:0;p.a=0;p.fallingFromFlight=false;p.moved=true;p.posDirty=true;send(p.ws,{t:'respawnPosition',x:p.x,y:p.y,z:p.z});} break;
      case 'adminCommand': {
        if(!isAdmin(p))return erro(p,'Comando administrativo não autorizado.');
        if(m.action==='teleport'){
          const x=num(Number(m.x),-MUNDO,MUNDO),z=num(Number(m.z),-MUNDO,MUNDO);if(x===null||z===null)return erro(p,'Destino inválido.');
          const surf=worldNavigation.groundSurfaceAt(x,z);if(!surf)return erro(p,'Destino fora do mundo.');
          p.x=x;p.z=z;p.y=surf.h;p.a=0;p.fallingFromFlight=false;p.moved=true;p.posDirty=true;send(p.ws,{t:'adminTeleport',x:p.x,y:p.y,z:p.z});
        }else if(m.action==='addItem'){
          const id=String(m.id||'').trim().slice(0,80),n=Math.max(1,Math.min(9999,Math.floor(Number(m.n)||1)));
          if(!id||!itemManager.addItem(p,{id,n}))return erro(p,'Item inválido ou mochila cheia.');
          p.dirty=true;itemManager.sync(p,{event:'admin-grant'});aviso(p,`ADM: adicionado ${id} x${n}.`);
        }else if(m.action==='invisible'){
          p.invisible=!!m.value;
          if(p.invisible)broadcast({t:'leave',id:p.id},p);else broadcast({t:'join',...resumo(p)},p);
          send(p.ws,{t:'adminState',invisible:p.invisible});
        }else return erro(p,'Comando ADM inválido.');
        break;
      }
      case 'worldSnapshot': if (COMBATE_AUTORITATIVO) send(p.ws,{t:'worldSnapshot',monsters:monsterManager.snapshotFor(p),loot:lootManager.snapshotFor(p)}); break;
      case 'inv': convidar(p, m); break;
      case 'resp': responder(p, m); break;
      case 'pleave': sairDoGrupo(p); break;
      case 'pkick': {
        const alvo = players.get(m.id);
        if (p.party && p.party.leader === p.id && alvo && alvo !== p && alvo.party === p.party){
          erro(alvo, 'Você foi retirado do grupo.');
          sairDoGrupo(alvo);
        }
        break;
      }
      case 'pmode': if (p.party && p.party.leader === p.id && ['nivel', 'contrib'].includes(m.mode)){ p.party.mode = m.mode; enviarGrupo(p.party); } break;
      case 'padv': grupoAvancado(p); break;
      case 'pskill': habilidadeDoGrupo(p, m); break;
      case 'toffer': ofertaTroca(p, m); break;
      case 'tlock': travarTroca(p); break;
      case 'tok': confirmarTroca(p); break;
      case 'tcancel': if (p.trade) fimTroca(p.trade, `${p.name} cancelou a troca.`); break;
      case 'shopopen': abrirLoja(p, m); break;
      case 'shopclose': fecharLoja(p); break;
      case 'shopview': verLoja(p, m); break;
      case 'shopbuy': comprarNaLoja(p, m); break;
      case 'gcreate': criarGuilda(p, m); break;
      case 'gleave': sairDaGuilda(p); break;
      case 'gkick': expulsarDaGuilda(p, m); break;
      case 'glist': listarGuilda(p); break;
      case 'gdonate': doarParaGuilda(p, m); break;
      case 'grank': mudarCargo(p, m); break;
      case 'pet': if(!petManager.handle(p,m)) erro(p,'Ação de pet inválida.'); break;
      case 'social': { const out=socialManager.handle(p,m); if(out&&out.ok===false)erro(p,out.reason||'Ação social inválida.'); else if(out===false)erro(p,'Ação social inválida.'); break; }
      case 'pvp': pvpManager.handle(p,m); break;
      case 'lifestyle': {
        if(!COMBATE_AUTORITATIVO)break;
        if(m.action==='gather'){if(gatherManager.gather(p,m.nodeId))liveOpsManager.record(p,'gather',{count:1});}
        else if(m.action==='craft'){if(craftManager.craft(p,m.recipeId))liveOpsManager.record(p,'craft',{count:1});}
        else if(m.action==='repair')craftManager.repair(p,m.slot);
        else if(m.action==='sync')gatherManager.sync(p,{catalog:{...gatherManager.catalog(),...craftManager.catalog()}});
        else erro(p,'Ação Lifestyle inválida.');
        break;
      }
      case 'liveOps': { if(m.action==='sync')liveOpsManager.sync(p); else if(m.action==='claim')liveOpsManager.claim(p,String(m.kind||''),String(m.id||'')); else if(m.action==='telemetry'&&isAdmin(p))send(p.ws,{t:'liveOpsTelemetry',telemetry:liveOpsManager.telemetrySnapshot()}); else erro(p,'Ação Live Ops inválida.'); break; }
      case 'inviteByName': { const alvo=[...players.values()].find(o=>o.name.toLowerCase()===String(m.name||'').trim().toLowerCase()); if(!alvo)return erro(p,'Jogador não encontrado ou offline.'); convidar(p,{kind:m.kind,to:alvo.id}); break; }
      case 'token':
        if (typeof m.token === 'string') p.token = m.token;
        break;
    }
  });

  ws.on('close', async () => {
    clearTimeout(semLogin);
    if (!p) return;
    dungeonManager.disconnect(p);
    socialManager.onDisconnect(p);
    pvpManager.onDisconnect(p);
    preservarGrupo(p);
    players.delete(p.id);
    if (p.trade) fimTroca(p.trade, `${p.name} saiu do jogo. Troca cancelada.`);
    if (p.shop) fecharLoja(p);
    broadcast({ t: 'leave', id: p.id });
    p.posDirty = true;
    await salvar(p);
    console.log(`Saiu: ${p.name} (${players.size} online)`);
  });
  ws.on('error', () => {});
});

/* ---------- Convites (grupo, troca e guilda) ---------- */
const TIPOS = { grupo: 1, troca: 1, guilda: 1 };
const MAX_GRUPO = 8;
const podeConvidarGuilda = g => g && (g.cargo === 'lider' || g.cargo === 'conselheiro');

function podeConvidar(p, alvo, kind){
  if (kind === 'grupo'){
    if (alvo.party) return `${alvo.name} já está em um grupo.`;
    if (p.party && p.party.leader !== p.id) return 'Só o líder do grupo pode convidar.';
    if (p.party && p.party.members.size >= MAX_GRUPO) return 'O grupo já tem 8 pessoas.';
  } else if (kind === 'troca'){
    if (p.trade) return 'Você já está em uma troca.';
    if (alvo.trade) return `${alvo.name} já está trocando com alguém.`;
    if (p.shop || alvo.shop) return 'Não dá para trocar com a loja pessoal aberta.';
    if (!perto(p, alvo, 12)) return 'Chegue mais perto para trocar.';
  } else if (kind === 'guilda'){
    if (!podeConvidarGuilda(p.guild)) return 'Só o líder ou um conselheiro pode convidar para a guilda.';
    if (alvo.guild) return `${alvo.name} já está em uma guilda.`;
  }
  return null;
}
function convidar(p, m){
  const alvo = players.get(m.to), agora = Date.now();
  if (!TIPOS[m.kind] || !alvo || alvo === p || agora - p.lastInv < 1000) return;
  p.lastInv = agora;
  const e = podeConvidar(p, alvo, m.kind);
  if (e) return erro(p, e);
  alvo.invites.set(`${m.kind}:${p.id}`, agora + 30000);
  send(alvo.ws, { t: 'invite', kind: m.kind, from: p.id, name: p.name, gname: m.kind === 'guilda' ? p.guild.nome : undefined });
  aviso(p, `Convite enviado a ${alvo.name}.`);
}
async function responder(p, m){
  const chave = `${m.kind}:${m.from}`, validade = p.invites.get(chave);
  if (!validade) return;
  p.invites.delete(chave);
  const de = players.get(m.from);
  if (!de) return erro(p, 'Quem convidou saiu do jogo.');
  if (validade < Date.now()) return erro(p, 'O convite expirou.');
  if (!m.ok) return aviso(de, `${p.name} recusou o convite.`);
  const e = podeConvidar(de, p, m.kind);
  if (e) return erro(p, e);
  if (m.kind === 'grupo') entrarNoGrupo(de, p);
  else if (m.kind === 'troca') iniciarTroca(de, p);
  else if (m.kind === 'guilda') await entrarNaGuilda(de, p);
}

/* ---------- Grupo (até 8, com nível, pontos e habilidades como no Flyff) ---------- */
// Nível do grupo: sobe com monstros derrotados por quem está junto. No nível 10 o líder
// pode tornar o grupo avançado; só grupo avançado passa do 10 e usa habilidades.
const GRUPO_MAX_NIVEL = 10, GRUPO_MAX_AVANCADO = 40;
const partyReconnect=new Map();
function preservarGrupo(p){const party=p.party;if(!party)return;partyReconnect.set(p.charId,{party,oldId:p.id,expires:Date.now()+120000});party.members.delete(p.id);if(party.leader===p.id)party.leader=party.members.values().next().value||p.id;p.party=null;if(party.members.size)enviarGrupo(party);}
function restaurarGrupo(p){const rec=partyReconnect.get(p.charId);if(!rec||rec.expires<Date.now()){partyReconnect.delete(p.charId);return false;}const party=rec.party;party.members.delete(rec.oldId);party.members.add(p.id);if(!players.has(party.leader))party.leader=p.id;p.party=party;partyReconnect.delete(p.charId);enviarGrupo(party);return true;}

const grupoExpNeed = L => Math.round(60 * Math.pow(L, 1.4));
const HAB_GRUPO = {
  cadeia:   { name: 'Ataque em Cadeia', custo: 3, nivel: 12 },
  estudo:   { name: 'Foco nos Estudos', custo: 4, nivel: 15 },
  sorte:    { name: 'Sorte Grande', custo: 5, nivel: 18 },
  presente: { name: 'Caixa de Presente', custo: 8, nivel: 25 },
};
const paraGrupo = (party, msg) => { for (const id of party.members){ const o = players.get(id); if (o) send(o.ws, msg); } };
function enviarGrupo(party){
  const agora = Date.now();
  for (const k of Object.keys(party.skills)) if (party.skills[k] <= agora) delete party.skills[k];
  const members = [...party.members].map(id => players.get(id)).filter(Boolean)
    .map(o => { const ss=skillManager.snapshot(o); return { id:o.id, name:o.name, L:o.L, hp:o.hp, max:o.maxHp, specialization:ss.specializationName, role:ss.role }; });
  const skills = {}; for (const [k, t] of Object.entries(party.skills)) skills[k] = Math.ceil((t - agora) / 1000);
  paraGrupo(party, { t: 'party', leader: party.leader, members, level: party.level, exp: party.exp, need: grupoExpNeed(party.level),
    points: party.points, advanced: party.advanced, mode: party.mode, skills });
}
function entrarNoGrupo(lider, p){
  if (!lider.party) lider.party = { leader: lider.id, members: new Set([lider.id]), level: 1, exp: 0, points: 0, advanced: false, mode: 'nivel', skills: {} };
  lider.party.members.add(p.id); p.party = lider.party;
  enviarGrupo(lider.party);
}
function sairDoGrupo(p, desconectou){
  const party = p.party; if (!party) return;
  party.members.delete(p.id); p.party = null;
  if (!desconectou) send(p.ws, { t: 'party', leader: null, members: [] });
  if (party.members.size <= 1){
    for (const id of party.members){
      const o = players.get(id); if (!o) continue;
      o.party = null; send(o.ws, { t: 'party', leader: null, members: [] }); aviso(o, 'O grupo foi desfeito.');
    }
    party.members.clear();
    return;
  }
  if (party.leader === p.id) party.leader = party.members.values().next().value;
  enviarGrupo(party);
}
// Membros ativos: perto (40 m) e até 19 níveis abaixo do mais alto do grupo.
function ativos(party, centro){
  const perto40 = [...party.members].map(id => players.get(id)).filter(o => o && perto(o, centro, 40));
  const topo = Math.max(...perto40.map(o => o.L));
  return perto40.filter(o => topo - o.L <= 19);
}
function monstroDoGrupo(p, m){
  if (!inteiro(m.lvl, 1, 80) || !inteiro(m.exp, 1, 5000) || p.expBucket < 1) return;
  p.expBucket--;
  const party = p.party;
  if (!party){ send(p.ws, { t: 'pexp', lvl: m.lvl, exp: m.exp }); return; }
  const lista = ativos(party, p);
  if (!lista.includes(p)) lista.push(p);
  let total = m.exp;
  if (lista.length >= 2){
    const porMembro = party.advanced ? 0.07 : 0.04, porAtivo = party.advanced ? 0.25 : 0.135;
    total *= 1 + porMembro * party.members.size + porAtivo * lista.length;
    if (party.skills.estudo > Date.now()) total *= 1.15;
    // o grupo também ganha experiência própria
    const cap = party.advanced ? GRUPO_MAX_AVANCADO : GRUPO_MAX_NIVEL;
    if (party.level < cap){
      party.exp += m.lvl;
      let subiu = false;
      while (party.level < cap && party.exp >= grupoExpNeed(party.level)){
        party.exp -= grupoExpNeed(party.level); party.level++; party.points += party.advanced ? 6 : 2; subiu = true;
      }
      if (party.level >= cap) party.exp = 0;
      if (subiu) paraGrupo(party, { t: 'aviso', msg: `O grupo subiu para o nível ${party.level}!` });
    }
    enviarGrupo(party);
  }
  const somaNiveis = lista.reduce((a, o) => a + o.L, 0);
  for (const o of lista){
    const parte = party.mode === 'contrib' || lista.length < 2 ? total / lista.length : total * o.L / somaNiveis;
    send(o.ws, { t: 'pexp', lvl: m.lvl, exp: Math.max(1, Math.round(parte)), from: o === p ? undefined : p.name });
  }
}

function expNeed(level){ return Math.round(28*Math.pow(level,1.65)+22); }
function grantPlayerExp(p,amount,meta={}){
  amount=Math.max(0,Math.round(Number(amount)||0));
  const cls=p.dados.cls||'aprendiz',cap=cls==='aprendiz'?15:100;
  let leveled=false;p.dados.exp=Math.max(0,Math.floor(p.dados.exp||0))+amount;
  while(p.L<cap&&p.dados.exp>=expNeed(p.L)){p.dados.exp-=expNeed(p.L);p.L++;p.dados.L=p.L;p.dados.pts=Math.max(0,Math.floor(p.dados.pts||0))+2;leveled=true;}
  if(p.L>=cap)p.dados.exp=0;
  if(leveled){combatManager.refresh(p);p.hp=p.stats.maxHp;p.mp=p.stats.maxMp;p.fp=p.stats.maxFp;Object.assign(p.dados,{hp:p.hp,mp:p.mp,fp:p.fp});skillManager.sync(p,{event:'level-up'});broadcast({t:'info',id:p.id,L:p.L});if(p.party)enviarGrupo(p.party);}
  p.dirty=true;send(p.ws,{t:'expGain',amount,source:meta.source||'unknown',monsterLevel:meta.monsterLevel||null,L:p.L,exp:p.dados.exp,pts:p.dados.pts,leveled,combat:{hp:p.hp,maxHp:p.stats.maxHp,mp:p.mp,maxMp:p.stats.maxMp,fp:p.fp,maxFp:p.stats.maxFp}});
  return amount;
}
function premiarQuest(p,reward={}){
  if(Array.isArray(reward.items)&&reward.items.length) return false;
  const exp=Math.max(0,Math.min(100000,Math.floor(Number(reward.exp)||0)));
  const gold=Math.max(0,Math.min(1000000,Math.floor(Number(reward.gold)||0)));
  if(gold)p.dados.gold=Math.max(0,Math.floor(p.dados.gold||0))+gold;
  if(exp)grantPlayerExp(p,exp,{source:'quest'});
  p.dirty=true;send(p.ws,{t:'questReward',exp,gold,totalGold:p.dados.gold||0});
  return true;
}

// Versão autoritativa: nível e experiência vêm do monstro do servidor e o resultado
// é aplicado ao personagem antes de ser enviado ao cliente.
function premiarMonstro(killer, monster){
  let lista=[killer], total=monster.exp;
  const party=killer.party;
  if(party){
    lista=ativos(party,killer); if(!lista.includes(killer))lista.push(killer);
    if(lista.length>=2){
      const porMembro=party.advanced?0.07:0.04,porAtivo=party.advanced?0.25:0.135;
      total*=1+porMembro*party.members.size+porAtivo*lista.length;
      if(party.skills.estudo>Date.now())total*=1.15;
      const cap=party.advanced?GRUPO_MAX_AVANCADO:GRUPO_MAX_NIVEL;
      if(party.level<cap){party.exp+=monster.level;while(party.level<cap&&party.exp>=grupoExpNeed(party.level)){party.exp-=grupoExpNeed(party.level);party.level++;party.points+=party.advanced?6:2;}if(party.level>=cap)party.exp=0;}
      enviarGrupo(party);
    }
  }
  const somaNiveis=lista.reduce((sum,p)=>sum+p.L,0);
  for(const p of lista){
    let amount=party&&(party.mode!=='contrib'&&lista.length>=2)?total*p.L/somaNiveis:total/lista.length;
    const diff=p.L-monster.level;
    if(monster.level-p.L>=16)amount=0;else if(diff>=10)amount*=.1;else if(diff>=5)amount*=.4;
    if(p.guild)amount*=1+Math.min(10,p.guild.nivel||1)/100;
    amount=Math.max(0,Math.round(amount));
    grantPlayerExp(p,amount,{source:'monster',monsterLevel:monster.level});
  }
}
function grupoAvancado(p){
  const party = p.party;
  if (!party || party.leader !== p.id || party.advanced) return;
  if (party.level < GRUPO_MAX_NIVEL) return erro(p, `O grupo precisa chegar ao nível ${GRUPO_MAX_NIVEL} para virar avançado.`);
  party.advanced = true; enviarGrupo(party);
  paraGrupo(party, { t: 'aviso', msg: 'O grupo agora é avançado: habilidades de grupo liberadas!' });
}
function habilidadeDoGrupo(p, m){
  const party = p.party, h = HAB_GRUPO[m.id];
  if (!party || !h || party.leader !== p.id) return;
  if (!party.advanced) return erro(p, 'Habilidades de grupo só no grupo avançado.');
  if (party.level < h.nivel) return erro(p, `${h.name} libera no nível ${h.nivel} do grupo.`);
  if (party.points < h.custo) return erro(p, `${h.name} custa ${h.custo} pontos de grupo.`);
  party.points -= h.custo;
  party.skills[m.id] = Math.max(Date.now(), party.skills[m.id] || 0) + 60000;
  enviarGrupo(party);
  paraGrupo(party, { t: 'aviso', msg: `${p.name} ativou ${h.name} por 1 minuto.` });
}

/* ---------- Troca entre jogadores ---------- */
const ofertaVazia = () => ({ items: [], gold: 0, lock: false, ok: false });
function iniciarTroca(a, b){
  const tr = { a, b, o: new Map([[a.id, ofertaVazia()], [b.id, ofertaVazia()]]) };
  a.trade = b.trade = tr;
  send(a.ws, { t: 'trade', with: b.id, name: b.name });
  send(b.ws, { t: 'trade', with: a.id, name: a.name });
  estadoTroca(tr);
}
function estadoTroca(tr){
  for (const [x, y] of [[tr.a, tr.b], [tr.b, tr.a]]) send(x.ws, { t: 'tstate', mine: tr.o.get(x.id), theirs: tr.o.get(y.id) });
}
function fimTroca(tr, msg){
  tr.a.trade = tr.b.trade = null;
  for (const x of [tr.a, tr.b]) send(x.ws, { t: 'tend', msg });
}
function ofertaTroca(p, m){
  const tr = p.trade; if (!tr || !inteiro(m.gold, 0, 1e9)) return;
  const items = lerItens(m.items, 8, p); if (!items) return;
  tr.o.set(p.id, { items: semPreco(items), gold: m.gold, lock: false, ok: false });
  for (const o of tr.o.values()){ o.lock = false; o.ok = false; }
  estadoTroca(tr);
}
function travarTroca(p){
  const tr = p.trade; if (!tr) return;
  const minha = tr.o.get(p.id);
  if (!tirarItens(p.dados, minha.items, minha.gold)) return erro(p, 'Os itens oferecidos não estão mais na sua mochila.');
  minha.lock = true; estadoTroca(tr);
}
function confirmarTroca(p){
  const tr = p.trade; if (!tr) return;
  const oa = tr.o.get(tr.a.id), ob = tr.o.get(tr.b.id);
  if (!oa.lock || !ob.lock) return;
  tr.o.get(p.id).ok = true;
  if (!oa.ok || !ob.ok) return estadoTroca(tr);
  if (!perto(tr.a, tr.b, 20)) return fimTroca(tr, 'Vocês se afastaram. Troca cancelada.');
  const invA = tirarItens(tr.a.dados, oa.items, oa.gold), invB = tirarItens(tr.b.dados, ob.items, ob.gold);
  if (!invA || !invB) return fimTroca(tr, 'Os itens mudaram na mochila. Troca cancelada.');
  porItens(invA, ob.items); porItens(invB, oa.items);
  if (invA.length > 32) return fimTroca(tr, `A mochila de ${tr.a.name} ficaria cheia. Troca cancelada.`);
  if (invB.length > 32) return fimTroca(tr, `A mochila de ${tr.b.name} ficaria cheia. Troca cancelada.`);
  tr.a.dados = { ...tr.a.dados, inv: invA, gold: (tr.a.dados.gold || 0) - oa.gold + ob.gold };
  tr.b.dados = { ...tr.b.dados, inv: invB, gold: (tr.b.dados.gold || 0) - ob.gold + oa.gold };
  send(tr.a.ws, { t: 'tdone', give: oa, get: ob });
  send(tr.b.ws, { t: 'tdone', give: ob, get: oa });
  itemManager.sync(tr.a,{event:'trade'});itemManager.sync(tr.b,{event:'trade'});
  tr.a.dirty = tr.b.dirty = true;
  salvar(tr.a); salvar(tr.b);
  fimTroca(tr, 'Troca concluída!');
  console.log(`Troca: ${tr.a.name} <-> ${tr.b.name}`);
}

/* ---------- Loja pessoal (o jogador senta e vende para os outros) ---------- */
function abrirLoja(p, m){
  if (p.shop) return;
  if (p.trade) return erro(p, 'Termine a troca antes de abrir a loja.');
  const title = typeof m.title === 'string' ? m.title.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 30) : '';
  const items = lerItens(m.items, 8, p);
  if (!title) return erro(p, 'Dê um nome para a sua loja.');
  if (!items || !items.length || items.some(it => !it.price)) return erro(p, 'Coloque pelo menos um item com preço.');
  if (!tirarItens(p.dados, semPreco(items), 0)) return erro(p, 'Os itens da loja não estão na sua mochila.');
  p.shop = { title, items };
  send(p.ws, { t: 'shopmine', open: true, title, items });
  broadcast({ t: 'shopinfo', id: p.id, title }, p);
}
function fecharLoja(p, msg){
  if (!p.shop) return;
  p.shop = null;
  send(p.ws, { t: 'shopmine', open: false, msg });
  broadcast({ t: 'shopinfo', id: p.id, title: null }, p);
}
function verLoja(p, m){
  const s = players.get(m.id);
  if (!s || !s.shop) return erro(p, 'Essa loja fechou.');
  send(p.ws, { t: 'shop', id: s.id, name: s.name, title: s.shop.title, items: s.shop.items });
}
function comprarNaLoja(p, m){
  const s = players.get(m.id);
  if (!s || !s.shop || s === p) return erro(p, 'Essa loja fechou.');
  if (!perto(p, s, 15)) return erro(p, 'Chegue mais perto da loja.');
  const it = s.shop.items[m.idx];
  if (!it || !inteiro(m.n, 1, it.n) || (it.up !== undefined && m.n !== 1)) return verLoja(p, m);
  const lote = EQUIPMENT[it.id] ? Object.fromEntries(Object.entries(it).filter(([k])=>k!=='price')) : { id:it.id,n:m.n };
  const custo = it.price * m.n;
  if ((p.dados.gold || 0) < custo) return erro(p, 'Ouro insuficiente.');
  const invS = tirarItens(s.dados, [lote], 0);
  if (!invS){ fecharLoja(s, 'Um item da sua loja não estava mais na mochila. A loja fechou.'); return erro(p, 'Essa loja fechou.'); }
  const invP = porItens((p.dados.inv || []).filter(Boolean).map(x => ({ ...x })), [lote]);
  if (invP.length > 32) return erro(p, 'Sua mochila está cheia.');
  s.dados = { ...s.dados, inv: invS, gold: (s.dados.gold || 0) + custo };
  p.dados = { ...p.dados, inv: invP, gold: (p.dados.gold || 0) - custo };
  s.dirty = p.dirty = true; salvar(s); salvar(p);
  it.n -= m.n;
  if (it.n <= 0) s.shop.items.splice(m.idx, 1);
  send(p.ws, { t: 'sbought', item: lote, cost: custo, seller: s.name });
  send(s.ws, { t: 'ssold', item: lote, cost: custo, buyer: p.name });
  itemManager.sync(p,{event:'shop-buy'});itemManager.sync(s,{event:'shop-sell'});
  if (!s.shop.items.length) fecharLoja(s, 'Você vendeu tudo! A loja fechou.');
  else { send(s.ws, { t: 'shopmine', open: true, title: s.shop.title, items: s.shop.items }); verLoja(p, m); }
  console.log(`Loja: ${p.name} comprou de ${s.name} por ${custo}`);
}

/* ---------- Guilda (salva no banco, com nível e cargos como no Flyff) ---------- */
const CUSTO_GUILDA = 10000, NIVEL_GUILDA = 20, FUNDADORES = 2;
// Pontos de guilda por material doado (metade do nível do monstro que o deixa cair).
const PONTOS_MATERIAL = { gosma: 1, pelo: 3, chapeu: 5, presa: 7, musgo: 9, pele_lobo: 12, seda: 16, essencia: 21, nucleo: 27 };
const CARGOS = ['lider', 'conselheiro', 'capitao', 'apoiador', 'novato'];

async function carregarGuilda(p){
  try {
    const { data, error } = await dbDoJogador(p.token).from('iv_guilda_membros')
      .select('cargo,guilda_id,iv_guildas(nome,nivel,exp)').eq('personagem_id', p.charId).maybeSingle();
    if (error) throw error;
    p.guild = data && data.iv_guildas ? { id: data.guilda_id, nome: data.iv_guildas.nome, cargo: data.cargo, nivel: data.iv_guildas.nivel || 1 } : null;
  } catch (err) { console.error(`Guilda de ${p.name}:`, err.message); p.guild = null; }
}
function avisarGuilda(p){
  send(p.ws, { t: 'guild', guild: p.guild });
  broadcast({ t: 'ginfo', id: p.id, g: p.guild ? p.guild.nome : null }, p);
}
const daGuilda = gid => [...players.values()].filter(o => o.guild && o.guild.id === gid);

// Como no Flyff: o líder precisa de um grupo com mais 2 pessoas por perto, sem guilda.
async function criarGuilda(p, m){
  if (p.guild) return erro(p, 'Você já está em uma guilda.');
  const nome = typeof m.nome === 'string' ? m.nome.trim().replace(/\s+/g, ' ') : '';
  if (!/^[A-Za-zÀ-ÿ0-9 ]{3,16}$/.test(nome)) return erro(p, 'O nome da guilda precisa ter de 3 a 16 letras ou números.');
  if (p.L < NIVEL_GUILDA) return erro(p, `Criar guilda libera no nível ${NIVEL_GUILDA}.`);
  if ((p.dados.gold || 0) < CUSTO_GUILDA) return erro(p, `Criar guilda custa ${CUSTO_GUILDA.toLocaleString('pt-BR')} de ouro.`);
  if (!p.party || p.party.leader !== p.id) return erro(p, 'Para fundar uma guilda, seja o líder de um grupo com mais 2 pessoas.');
  const fundadores = [...p.party.members].map(id => players.get(id)).filter(o => o && o !== p && !o.guild && perto(o, p, 15));
  if (fundadores.length < FUNDADORES) return erro(p, 'Precisa de mais 2 pessoas do grupo, sem guilda, perto de você.');
  if (p.criandoGuilda) return;
  p.criandoGuilda = true;
  try {
    const db = dbDoJogador(p.token);
    const { data: g, error } = await db.from('iv_guildas').insert({ nome, lider: p.charId }).select('id,nome').single();
    if (error){
      if (error.code === '23505') return erro(p, 'Esse nome de guilda já existe. Escolha outro.');
      throw error;
    }
    const { error: e2 } = await db.from('iv_guilda_membros').insert({ personagem_id: p.charId, guilda_id: g.id, nome: p.name, cargo: 'lider' });
    if (e2){ await db.from('iv_guildas').delete().eq('id', g.id); throw e2; }
    p.guild = { id: g.id, nome: g.nome, cargo: 'lider', nivel: 1 };
    p.dados = { ...p.dados, gold: (p.dados.gold || 0) - CUSTO_GUILDA }; p.dirty = true;
    send(p.ws, { t: 'gcreated', cost: CUSTO_GUILDA });
    avisarGuilda(p);
    for (const f of fundadores) await entrarNaGuilda(p, f);
    console.log(`Guilda criada: ${g.nome} (${p.name})`);
  } catch (err) {
    console.error('Erro ao criar guilda:', err.message);
    erro(p, 'Não foi possível criar a guilda agora.');
  } finally { p.criandoGuilda = false; }
}
async function entrarNaGuilda(quemConvida, p){
  const g = quemConvida.guild; if (!g) return;
  try {
    const { error: e1 } = await dbDoJogador(quemConvida.token).from('iv_guilda_convites').insert({ guilda_id: g.id, personagem_id: p.charId });
    if (e1 && e1.code !== '23505') throw e1; // 23505: o convite já existia
    const { error: e2 } = await dbDoJogador(p.token).from('iv_guilda_membros').insert({ personagem_id: p.charId, guilda_id: g.id, nome: p.name, cargo: 'novato' });
    await dbDoJogador(p.token).from('iv_guilda_convites').delete().eq('guilda_id', g.id).eq('personagem_id', p.charId);
    if (e2){
      if (e2.code === 'P0002') return erro(p, 'A guilda está cheia. Ela precisa subir de nível para aceitar mais gente.');
      throw e2;
    }
    p.guild = { id: g.id, nome: g.nome, cargo: 'novato', nivel: g.nivel };
    liveOpsManager.social(p,1);liveOpsManager.guild(p,1);
    avisarGuilda(p);
    for (const o of daGuilda(g.id)) aviso(o, `${p.name} entrou na guilda.`);
  } catch (err) {
    console.error('Erro ao entrar na guilda:', err.message);
    erro(p, 'Não foi possível entrar na guilda agora.');
  }
}
async function sairDaGuilda(p){
  const g = p.guild; if (!g) return;
  try {
    const db = dbDoJogador(p.token);
    if (g.cargo === 'lider'){
      const { error } = await db.from('iv_guildas').delete().eq('id', g.id);
      if (error) throw error;
      for (const o of daGuilda(g.id)){
        o.guild = null; avisarGuilda(o);
        if (o !== p) aviso(o, `A guilda ${g.nome} foi desfeita pelo líder.`);
      }
    } else {
      const { error } = await db.from('iv_guilda_membros').delete().eq('personagem_id', p.charId);
      if (error) throw error;
      p.guild = null; avisarGuilda(p);
    }
  } catch (err) {
    console.error('Erro ao sair da guilda:', err.message);
    erro(p, 'Não foi possível sair da guilda agora.');
  }
}
async function expulsarDaGuilda(p, m){
  const g = p.guild;
  if (!g || g.cargo !== 'lider' || typeof m.nome !== 'string' || m.nome === p.name) return;
  try {
    const { error } = await dbDoJogador(p.token).from('iv_guilda_membros').delete()
      .eq('guilda_id', g.id).eq('nome', m.nome).neq('cargo', 'lider');
    if (error) throw error;
    for (const o of daGuilda(g.id)) if (o.name === m.nome){
      o.guild = null; avisarGuilda(o); aviso(o, `Você foi retirado da guilda ${g.nome}.`);
    }
    listarGuilda(p);
  } catch (err) {
    console.error('Erro ao retirar da guilda:', err.message);
    erro(p, 'Não foi possível retirar o membro agora.');
  }
}
async function listarGuilda(p){
  const g = p.guild; if (!g) return;
  const db = dbDoJogador(p.token);
  const [{ data, error }, { data: info }] = await Promise.all([
    db.from('iv_guilda_membros').select('nome,cargo,contribuicao').eq('guilda_id', g.id).order('entrou_em'),
    db.from('iv_guildas').select('nivel,exp').eq('id', g.id).maybeSingle()
  ]);
  if (error) return console.error('Erro ao listar guilda:', error.message);
  if (info) for (const o of daGuilda(g.id)) o.guild.nivel = info.nivel;
  const on = new Set(daGuilda(g.id).map(o => o.name));
  send(p.ws, { t: 'gmembers', nivel: info ? info.nivel : 1, exp: info ? info.exp : 0,
    list: data.map(r => ({ nome: r.nome, cargo: r.cargo, contrib: r.contribuicao || 0, online: on.has(r.nome) })) });
}
// Doar ouro e materiais sobe o nível da guilda (como no Flyff).
async function doarParaGuilda(p, m){
  const g = p.guild; if (!g || p.doando) return;
  const gold = inteiro(m.gold, 0, 1e9) ? m.gold : -1;
  const items = lerItens(m.items || [], 24, p);
  if (gold < 0 || !items || items.some(it => it.up !== undefined || !PONTOS_MATERIAL[it.id])) return;
  const reserved=questManager.reservedItemIds(p);
  if(items.some(it=>reserved.has(it.id))) return erro(p,'Um desses materiais está reservado por uma missão ativa.');
  const pontos = Math.floor(gold / 10) + items.reduce((a, it) => a + PONTOS_MATERIAL[it.id] * it.n, 0);
  if (pontos < 1) return erro(p, 'Doe pelo menos 10 de ouro ou um material de monstro.');
  const inv = tirarItens(p.dados, items, gold);
  if (!inv) return erro(p, 'Você não tem o que tentou doar.');
  p.doando = true;
  try {
    const { data, error } = await dbDoJogador(p.token).rpc('iv_guilda_doar', { p_personagem: p.charId, p_pontos: pontos });
    if (error) throw error;
    p.dados = { ...p.dados, inv, gold: (p.dados.gold || 0) - gold }; p.dirty = true; salvar(p);
    const r = Array.isArray(data) ? data[0] : data;
    send(p.ws, { t: 'gdonated', gold, items, pontos });
    liveOpsManager.guild(p,1);
    const subiu = r && r.nivel > (g.nivel || 1);
    for (const o of daGuilda(g.id)){
      if (r) o.guild.nivel = r.nivel;
      aviso(o, subiu ? `${p.name} doou e a guilda subiu para o nível ${r.nivel}!` : `${p.name} doou ${pontos} pontos para a guilda.`);
    }
    listarGuilda(p);
  } catch (err) {
    console.error('Erro ao doar para a guilda:', err.message);
    erro(p, 'Não foi possível doar agora.');
  } finally { p.doando = false; }
}
async function mudarCargo(p, m){
  const g = p.guild;
  if (!g || g.cargo !== 'lider' || typeof m.nome !== 'string' || !CARGOS.includes(m.cargo) || m.cargo === 'lider') return;
  try {
    const { error } = await dbDoJogador(p.token).rpc('iv_guilda_cargo', { p_guilda: g.id, p_nome: m.nome, p_cargo: m.cargo });
    if (error){
      if (error.code === 'P0003') return erro(p, error.message);
      throw error;
    }
    for (const o of daGuilda(g.id)) if (o.name === m.nome){ o.guild.cargo = m.cargo; send(o.ws, { t: 'guild', guild: o.guild }); }
    listarGuilda(p);
  } catch (err) {
    console.error('Erro ao mudar cargo:', err.message);
    erro(p, 'Não foi possível mudar o cargo agora.');
  }
}

/* ---------- Rotinas ---------- */
let ultimoTickMonstros=Date.now();
setInterval(()=>{
  if(!COMBATE_AUTORITATIVO)return;
  const now=Date.now(),dt=Math.min(.25,(now-ultimoTickMonstros)/1000);ultimoTickMonstros=now;
  monsterManager.tick(dt);combatManager.tick(dt);lootManager.tick();dungeonManager.tick();pvpManager.tick();
},100);

// Recarrega o limite de experiência de monstros (evita abuso).
setInterval(() => { for (const p of players.values()) p.expBucket = Math.min(30, p.expBucket + 6); }, 1000);

// Posições: 10 vezes por segundo, só de quem se mexeu.
setInterval(() => {
  if (players.size < 2) return;
  const lista = [];
  for (const p of players.values()) {
    if (!p.moved) continue;
    p.moved = false;
    if(!p.invisible)lista.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.f.toFixed(2), p.a]);
  }
  if (lista.length) broadcast({ t: 's', p: lista });
}, 100);

// Salvamento no banco a cada 15 segundos.
setInterval(() => { for (const p of players.values()) salvar(p); }, 15000);

// Derruba conexões mortas.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, 30000);

async function desligar() {
  console.log('Desligando: salvando todos os jogadores...');
  await Promise.all([...players.values()].map(p => { p.posDirty = true; return salvar(p); }));
  process.exit(0);
}
process.on('SIGTERM', desligar);
process.on('SIGINT', desligar);

server.listen(PORT, () => console.log(`Reino De Claudonia rodando na porta ${PORT}`));
