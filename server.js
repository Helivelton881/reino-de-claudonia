// Reino De Claudonia - servidor (Fases 3 e 4)
// Serve os arquivos do jogo, confere o login no Supabase e mantém os jogadores
// conectados por WebSocket (posições, chat e salvamento do personagem).

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
const resumo = p => ({ id: p.id, name: p.name, L: p.L, x: p.x, y: p.y, z: p.z, f: p.f });

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
          dados: row.dados || {}, dirty: false, posDirty: false, moved: true, lastChat: 0
        };
        players.set(p.id, p);
        clearTimeout(semLogin);
        send(ws, {
          t: 'welcome', id: p.id,
          char: { nome: row.nome, x: row.pos_x, z: row.pos_z },
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
        broadcast({ t: 'chat', id: p.id, name: p.name, text });
        break;
      }
      case 'save': {
        if (!m.dados || typeof m.dados !== 'object' || Array.isArray(m.dados)) return;
        if (JSON.stringify(m.dados).length > 20000) return;
        p.dados = m.dados; p.dirty = true;
        const L = num(m.dados.L, 1, 200);
        if (L && L !== p.L) { p.L = L; broadcast({ t: 'info', id: p.id, L }); }
        break;
      }
      case 'token':
        if (typeof m.token === 'string') p.token = m.token;
        break;
    }
  });

  ws.on('close', async () => {
    clearTimeout(semLogin);
    if (!p) return;
    players.delete(p.id);
    broadcast({ t: 'leave', id: p.id });
    p.posDirty = true;
    await salvar(p);
    console.log(`Saiu: ${p.name} (${players.size} online)`);
  });
  ws.on('error', () => {});
});

/* ---------- Rotinas ---------- */
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
