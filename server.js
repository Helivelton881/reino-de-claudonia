// Reino De Claudonia - servidor (Fases 3 a 5)
// Serve os arquivos do jogo, confere o login no Supabase e mantém os jogadores
// conectados por WebSocket (posições, chat, salvamento, grupo, troca e guilda).

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // chave pública (anon/publishable)
const MAX_JOGADORES = 100;

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
const resumo = p => ({ id: p.id, name: p.name, L: p.L, x: p.x, y: p.y, z: p.z, f: p.f, g: p.guild ? p.guild.nome : null });
const inteiro = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

async function salvar(p) {
  if (!p.dirty && !p.posDirty) return;
  p.dirty = false; p.posDirty = false;
  const { error } = await dbDoJogador(p.token).from('iv_personagens')
    .update({ dados: p.dados, pos_x: p.x, pos_z: p.z, atualizado_em: new Date().toISOString() })
    .eq('id', p.charId);
  if (error) { console.error(`Erro ao salvar ${p.name}:`, error.message); p.dirty = true; }
}

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
        p = {
          id: nextId++, ws, userId: data.user.id, charId: row.id, name: row.nome, token: m.token,
          L: (row.dados && row.dados.L) || 1, x: row.pos_x, y: 0, z: row.pos_z, f: 0, a: 0,
          dados: row.dados || {}, dirty: false, posDirty: false, moved: true, lastChat: 0,
          hp: 0, maxHp: 1, party: null, trade: null, guild: null, invites: new Map(), lastInv: 0, expBucket: 20
        };
        await carregarGuilda(p);
        if (ws.readyState !== 1) return;
        players.set(p.id, p);
        clearTimeout(semLogin);
        send(ws, {
          t: 'welcome', id: p.id,
          char: { nome: row.nome, x: row.pos_x, z: row.pos_z }, guild: p.guild,
          others: [...players.values()].filter(o => o !== p).map(resumo)
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
        const x = num(m.x, -200, 200), y = num(m.y, -80, 120), z = num(m.z, -200, 200), f = num(m.f, -1000, 1000);
        if (x === null || y === null || z === null || f === null) return;
        p.x = x; p.y = y; p.z = z; p.f = f;
        p.a = [0, 1, 2, 3, 4, 5].includes(m.a) ? m.a : 0; // 4 = prancha, 5 = vassoura
        p.moved = true; p.posDirty = true;
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
          if (!p.party) return send(ws, { t: 'erro', msg: 'Você não está em um grupo.' });
          msg.ch = 'g'; for (const id of p.party.members){ const o = players.get(id); if (o) send(o.ws, msg); }
        } else if (m.ch === 'gu'){
          if (!p.guild) return send(ws, { t: 'erro', msg: 'Você não está em uma guilda.' });
          msg.ch = 'gu'; for (const o of players.values()) if (o.guild && o.guild.id === p.guild.id) send(o.ws, msg);
        } else broadcast(msg);
        break;
      }
      case 'save': {
        if (!m.dados || typeof m.dados !== 'object' || Array.isArray(m.dados)) return;
        if (JSON.stringify(m.dados).length > 20000) return;
        p.dados = m.dados; p.dirty = true;
        const L = num(m.dados.L, 1, 200);
        if (L && L !== p.L) { p.L = L; broadcast({ t: 'info', id: p.id, L }); if (p.party) enviarGrupo(p.party); }
        break;
      }
      case 'hp': {
        const max = num(m.max, 1, 100000), hp = num(m.hp, 0, 100000);
        if (max === null || hp === null) return;
        p.hp = Math.round(Math.min(hp, max)); p.maxHp = Math.round(max);
        if (p.party) for (const id of p.party.members){ const o = players.get(id); if (o && o !== p) send(o.ws, { t: 'php', id: p.id, hp: p.hp, max: p.maxHp }); }
        break;
      }
      case 'pexp': {
        // Experiência dividida: quem está no grupo e perto ganha 30% do monstro que o outro derrotou.
        if (!p.party || !inteiro(m.lvl, 1, 60) || !inteiro(m.exp, 1, 400) || p.expBucket < 1) return;
        p.expBucket--;
        const exp = Math.max(1, Math.round(m.exp * 0.3));
        for (const id of p.party.members){
          const o = players.get(id);
          if (o && o !== p && Math.hypot(o.x - p.x, o.z - p.z) < 40) send(o.ws, { t: 'pexp', lvl: m.lvl, exp, from: p.name });
        }
        break;
      }
      case 'inv': convidar(p, m); break;
      case 'resp': responder(p, m); break;
      case 'pleave': sairDoGrupo(p); break;
      case 'pkick': {
        const alvo = players.get(m.id);
        if (p.party && p.party.leader === p.id && alvo && alvo !== p && alvo.party === p.party){
          send(alvo.ws, { t: 'erro', msg: 'Você foi retirado do grupo.' });
          sairDoGrupo(alvo);
        }
        break;
      }
      case 'toffer': ofertaTroca(p, m); break;
      case 'tlock': travarTroca(p); break;
      case 'tok': confirmarTroca(p); break;
      case 'tcancel': if (p.trade) fimTroca(p.trade, `${p.name} cancelou a troca.`); break;
      case 'gcreate': criarGuilda(p, m); break;
      case 'gleave': sairDaGuilda(p); break;
      case 'gkick': expulsarDaGuilda(p, m); break;
      case 'glist': listarGuilda(p); break;
      case 'token':
        if (typeof m.token === 'string') p.token = m.token;
        break;
    }
  });

  ws.on('close', async () => {
    clearTimeout(semLogin);
    if (!p) return;
    players.delete(p.id);
    if (p.trade) fimTroca(p.trade, `${p.name} saiu do jogo. Troca cancelada.`);
    sairDoGrupo(p, true);
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
const perto = (a, b, d) => Math.hypot(a.x - b.x, a.z - b.z) < d;

function podeConvidar(p, alvo, kind){
  if (kind === 'grupo'){
    if (alvo.party) return `${alvo.name} já está em um grupo.`;
    if (p.party && p.party.leader !== p.id) return 'Só o líder do grupo pode convidar.';
    if (p.party && p.party.members.size >= MAX_GRUPO) return 'O grupo já tem 8 pessoas.';
  } else if (kind === 'troca'){
    if (p.trade) return 'Você já está em uma troca.';
    if (alvo.trade) return `${alvo.name} já está trocando com alguém.`;
    if (!perto(p, alvo, 12)) return 'Chegue mais perto para trocar.';
  } else if (kind === 'guilda'){
    if (!p.guild || p.guild.cargo !== 'lider') return 'Só o líder da guilda pode convidar.';
    if (alvo.guild) return `${alvo.name} já está em uma guilda.`;
  }
  return null;
}
function convidar(p, m){
  const alvo = players.get(m.to), agora = Date.now();
  if (!TIPOS[m.kind] || !alvo || alvo === p || agora - p.lastInv < 1000) return;
  p.lastInv = agora;
  const erro = podeConvidar(p, alvo, m.kind);
  if (erro) return send(p.ws, { t: 'erro', msg: erro });
  alvo.invites.set(`${m.kind}:${p.id}`, agora + 30000);
  send(alvo.ws, { t: 'invite', kind: m.kind, from: p.id, name: p.name, gname: m.kind === 'guilda' ? p.guild.nome : undefined });
  send(p.ws, { t: 'aviso', msg: `Convite enviado a ${alvo.name}.` });
}
async function responder(p, m){
  const chave = `${m.kind}:${m.from}`, validade = p.invites.get(chave);
  if (!validade) return;
  p.invites.delete(chave);
  const de = players.get(m.from);
  if (!de) return send(p.ws, { t: 'erro', msg: 'Quem convidou saiu do jogo.' });
  if (validade < Date.now()) return send(p.ws, { t: 'erro', msg: 'O convite expirou.' });
  if (!m.ok) return send(de.ws, { t: 'aviso', msg: `${p.name} recusou o convite.` });
  const erro = podeConvidar(de, p, m.kind);
  if (erro) return send(p.ws, { t: 'erro', msg: erro });
  if (m.kind === 'grupo') entrarNoGrupo(de, p);
  else if (m.kind === 'troca') iniciarTroca(de, p);
  else if (m.kind === 'guilda') await entrarNaGuilda(de, p);
}

/* ---------- Grupo (até 8) ---------- */
function enviarGrupo(party){
  const members = [...party.members].map(id => players.get(id)).filter(Boolean)
    .map(o => ({ id: o.id, name: o.name, L: o.L, hp: o.hp, max: o.maxHp }));
  for (const id of party.members){ const o = players.get(id); if (o) send(o.ws, { t: 'party', leader: party.leader, members }); }
}
function entrarNoGrupo(lider, p){
  if (!lider.party) lider.party = { leader: lider.id, members: new Set([lider.id]) };
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
      o.party = null; send(o.ws, { t: 'party', leader: null, members: [] }); send(o.ws, { t: 'aviso', msg: 'O grupo foi desfeito.' });
    }
    party.members.clear();
    return;
  }
  if (party.leader === p.id) party.leader = party.members.values().next().value;
  enviarGrupo(party);
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
  const tr = p.trade; if (!tr || !Array.isArray(m.items) || m.items.length > 8 || !inteiro(m.gold, 0, 1e9)) return;
  const items = [];
  for (const it of m.items){
    if (!it || typeof it.id !== 'string' || !/^[a-z_]{1,40}$/.test(it.id) || !inteiro(it.n, 1, 9999)) return;
    if (it.up !== undefined && !inteiro(it.up, 0, 10)) return;
    items.push(it.up !== undefined ? { id: it.id, n: 1, up: it.up } : { id: it.id, n: it.n });
  }
  tr.o.set(p.id, { items, gold: m.gold, lock: false, ok: false });
  for (const o of tr.o.values()){ o.lock = false; o.ok = false; }
  estadoTroca(tr);
}
// Tira a oferta de uma cópia da mochila. Devolve a mochila sem os itens, ou null se faltar algo.
// Equipamentos vêm com "up" (nível de aprimoramento); os outros itens se empilham.
function tirarOferta(dados, oferta){
  if ((dados.gold || 0) < oferta.gold) return null;
  const inv = (Array.isArray(dados.inv) ? dados.inv : []).filter(Boolean).map(s => ({ ...s }));
  for (const it of oferta.items){
    if (it.up !== undefined){
      const i = inv.findIndex(s => s.id === it.id && (s.up || 0) === it.up && s.n === 1);
      if (i < 0) return null;
      inv.splice(i, 1);
    } else {
      let falta = it.n;
      for (const s of inv) if (s.id === it.id && s.up === undefined && falta > 0){ const k = Math.min(falta, s.n); s.n -= k; falta -= k; }
      if (falta > 0) return null;
    }
  }
  return inv.filter(s => s.n > 0);
}
function porOferta(inv, oferta){
  for (const it of oferta.items){
    if (it.up !== undefined) inv.push(it.up ? { id: it.id, n: 1, up: it.up } : { id: it.id, n: 1 });
    else { const s = inv.find(s => s.id === it.id && s.up === undefined); if (s) s.n += it.n; else inv.push({ id: it.id, n: it.n }); }
  }
  return inv;
}
function travarTroca(p){
  const tr = p.trade; if (!tr) return;
  const minha = tr.o.get(p.id);
  if (!tirarOferta(p.dados, minha)) return send(p.ws, { t: 'erro', msg: 'Os itens oferecidos não estão mais na sua mochila.' });
  minha.lock = true; estadoTroca(tr);
}
function confirmarTroca(p){
  const tr = p.trade; if (!tr) return;
  const oa = tr.o.get(tr.a.id), ob = tr.o.get(tr.b.id);
  if (!oa.lock || !ob.lock) return;
  tr.o.get(p.id).ok = true;
  if (!oa.ok || !ob.ok) return estadoTroca(tr);
  if (!perto(tr.a, tr.b, 20)) return fimTroca(tr, 'Vocês se afastaram. Troca cancelada.');
  const invA = tirarOferta(tr.a.dados, oa), invB = tirarOferta(tr.b.dados, ob);
  if (!invA || !invB) return fimTroca(tr, 'Os itens mudaram na mochila. Troca cancelada.');
  porOferta(invA, ob); porOferta(invB, oa);
  if (invA.length > 24) return fimTroca(tr, `A mochila de ${tr.a.name} ficaria cheia. Troca cancelada.`);
  if (invB.length > 24) return fimTroca(tr, `A mochila de ${tr.b.name} ficaria cheia. Troca cancelada.`);
  tr.a.dados = { ...tr.a.dados, inv: invA, gold: (tr.a.dados.gold || 0) - oa.gold + ob.gold };
  tr.b.dados = { ...tr.b.dados, inv: invB, gold: (tr.b.dados.gold || 0) - ob.gold + oa.gold };
  send(tr.a.ws, { t: 'tdone', give: oa, get: ob });
  send(tr.b.ws, { t: 'tdone', give: ob, get: oa });
  tr.a.dirty = tr.b.dirty = true;
  salvar(tr.a); salvar(tr.b);
  fimTroca(tr, 'Troca concluída!');
  console.log(`Troca: ${tr.a.name} <-> ${tr.b.name}`);
}

/* ---------- Guilda (salva no banco) ---------- */
const CUSTO_GUILDA = 1000, NIVEL_GUILDA = 15;
async function carregarGuilda(p){
  try {
    const { data, error } = await dbDoJogador(p.token).from('iv_guilda_membros')
      .select('cargo,guilda_id,iv_guildas(nome)').eq('personagem_id', p.charId).maybeSingle();
    if (error) throw error;
    p.guild = data && data.iv_guildas ? { id: data.guilda_id, nome: data.iv_guildas.nome, cargo: data.cargo } : null;
  } catch (err) { console.error(`Guilda de ${p.name}:`, err.message); p.guild = null; }
}
function avisarGuilda(p){
  send(p.ws, { t: 'guild', guild: p.guild });
  broadcast({ t: 'ginfo', id: p.id, g: p.guild ? p.guild.nome : null }, p);
}
async function criarGuilda(p, m){
  if (p.guild) return send(p.ws, { t: 'erro', msg: 'Você já está em uma guilda.' });
  const nome = typeof m.nome === 'string' ? m.nome.trim().replace(/\s+/g, ' ') : '';
  if (!/^[A-Za-zÀ-ÿ0-9 ]{3,16}$/.test(nome)) return send(p.ws, { t: 'erro', msg: 'O nome da guilda precisa ter de 3 a 16 letras ou números.' });
  if (p.L < NIVEL_GUILDA) return send(p.ws, { t: 'erro', msg: `Criar guilda libera no nível ${NIVEL_GUILDA}.` });
  if ((p.dados.gold || 0) < CUSTO_GUILDA) return send(p.ws, { t: 'erro', msg: `Criar guilda custa ${CUSTO_GUILDA} de ouro.` });
  if (p.criandoGuilda) return;
  p.criandoGuilda = true;
  try {
    const db = dbDoJogador(p.token);
    const { data: g, error } = await db.from('iv_guildas').insert({ nome, lider: p.charId }).select('id,nome').single();
    if (error){
      if (error.code === '23505') return send(p.ws, { t: 'erro', msg: 'Esse nome de guilda já existe. Escolha outro.' });
      throw error;
    }
    const { error: e2 } = await db.from('iv_guilda_membros').insert({ personagem_id: p.charId, guilda_id: g.id, nome: p.name, cargo: 'lider' });
    if (e2){ await db.from('iv_guildas').delete().eq('id', g.id); throw e2; }
    p.guild = { id: g.id, nome: g.nome, cargo: 'lider' };
    p.dados = { ...p.dados, gold: (p.dados.gold || 0) - CUSTO_GUILDA }; p.dirty = true;
    send(p.ws, { t: 'gcreated', cost: CUSTO_GUILDA });
    avisarGuilda(p);
    console.log(`Guilda criada: ${g.nome} (${p.name})`);
  } catch (err) {
    console.error('Erro ao criar guilda:', err.message);
    send(p.ws, { t: 'erro', msg: 'Não foi possível criar a guilda agora.' });
  } finally { p.criandoGuilda = false; }
}
async function entrarNaGuilda(lider, p){
  const gid = lider.guild.id, gnome = lider.guild.nome;
  try {
    const { error: e1 } = await dbDoJogador(lider.token).from('iv_guilda_convites').insert({ guilda_id: gid, personagem_id: p.charId });
    if (e1 && e1.code !== '23505') throw e1; // 23505: o convite já existia
    const { error: e2 } = await dbDoJogador(p.token).from('iv_guilda_membros').insert({ personagem_id: p.charId, guilda_id: gid, nome: p.name, cargo: 'membro' });
    await dbDoJogador(p.token).from('iv_guilda_convites').delete().eq('guilda_id', gid).eq('personagem_id', p.charId);
    if (e2){
      if (e2.code === 'P0002') return send(p.ws, { t: 'erro', msg: 'A guilda já tem 30 membros.' });
      throw e2;
    }
    p.guild = { id: gid, nome: gnome, cargo: 'membro' };
    avisarGuilda(p);
    for (const o of players.values()) if (o.guild && o.guild.id === gid) send(o.ws, { t: 'aviso', msg: `${p.name} entrou na guilda.` });
  } catch (err) {
    console.error('Erro ao entrar na guilda:', err.message);
    send(p.ws, { t: 'erro', msg: 'Não foi possível entrar na guilda agora.' });
  }
}
async function sairDaGuilda(p){
  const g = p.guild; if (!g) return;
  try {
    const db = dbDoJogador(p.token);
    if (g.cargo === 'lider'){
      const { error } = await db.from('iv_guildas').delete().eq('id', g.id);
      if (error) throw error;
      for (const o of players.values()) if (o.guild && o.guild.id === g.id){
        o.guild = null; avisarGuilda(o);
        if (o !== p) send(o.ws, { t: 'aviso', msg: `A guilda ${g.nome} foi desfeita pelo líder.` });
      }
    } else {
      const { error } = await db.from('iv_guilda_membros').delete().eq('personagem_id', p.charId);
      if (error) throw error;
      p.guild = null; avisarGuilda(p);
    }
  } catch (err) {
    console.error('Erro ao sair da guilda:', err.message);
    send(p.ws, { t: 'erro', msg: 'Não foi possível sair da guilda agora.' });
  }
}
async function expulsarDaGuilda(p, m){
  const g = p.guild;
  if (!g || g.cargo !== 'lider' || typeof m.nome !== 'string' || m.nome === p.name) return;
  try {
    const { error } = await dbDoJogador(p.token).from('iv_guilda_membros').delete()
      .eq('guilda_id', g.id).eq('nome', m.nome).eq('cargo', 'membro');
    if (error) throw error;
    for (const o of players.values()) if (o.name === m.nome && o.guild && o.guild.id === g.id){
      o.guild = null; avisarGuilda(o); send(o.ws, { t: 'aviso', msg: `Você foi retirado da guilda ${g.nome}.` });
    }
    listarGuilda(p);
  } catch (err) {
    console.error('Erro ao retirar da guilda:', err.message);
    send(p.ws, { t: 'erro', msg: 'Não foi possível retirar o membro agora.' });
  }
}
async function listarGuilda(p){
  const g = p.guild; if (!g) return;
  const { data, error } = await dbDoJogador(p.token).from('iv_guilda_membros')
    .select('nome,cargo').eq('guilda_id', g.id).order('entrou_em');
  if (error) return console.error('Erro ao listar guilda:', error.message);
  const on = new Set([...players.values()].filter(o => o.guild && o.guild.id === g.id).map(o => o.name));
  send(p.ws, { t: 'gmembers', list: data.map(r => ({ nome: r.nome, cargo: r.cargo, online: on.has(r.nome) })) });
}

/* ---------- Rotinas ---------- */
// Recarrega o limite da experiência dividida (evita abuso).
setInterval(() => { for (const p of players.values()) p.expBucket = Math.min(20, p.expBucket + 4); }, 1000);

// Posições: 10 vezes por segundo, só de quem se mexeu.
setInterval(() => {
  if (players.size < 2) return;
  const lista = [];
  for (const p of players.values()) {
    if (!p.moved) continue;
    p.moved = false;
    lista.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.f.toFixed(2), p.a]);
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
