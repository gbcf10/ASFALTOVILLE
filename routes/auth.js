const express = require('express');
const router = express.Router();
const { sql, hashPassword, ensureInit } = require('../lib/db');
const { signToken, authMiddleware } = require('../lib/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

router.post('/check-lot', async (req, res) => {
  try {
    await ensureInit();
    const { displayId } = req.body;
    if (!displayId) return res.status(400).json({ error: 'Dados incompletos' });
    const rows = await sql`SELECT id, display_id, password_hash, is_empty FROM lots WHERE display_id = ${String(displayId).padStart(3, '0')}`;
    const lot = rows[0];
    if (!lot) return res.status(404).json({ error: 'Lote não encontrado' });
    if (lot.is_empty) return res.status(403).json({ error: 'Este lote está marcado como vazio' });
    res.json({ lotId: lot.id, displayId: lot.display_id, firstAccess: !lot.password_hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno', detail: String(err) });
  }
});

router.post('/set-password', async (req, res) => {
  try {
    await ensureInit();
    const { lotId, password, ownerName } = req.body;
    if (!lotId || !password || !ownerName) return res.status(400).json({ error: 'Dados incompletos' });
    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });

    const rows = await sql`SELECT id, display_id, password_hash, is_empty FROM lots WHERE id = ${lotId}`;
    const lot = rows[0];
    if (!lot) return res.status(404).json({ error: 'Lote não encontrado' });
    if (lot.is_empty) return res.status(403).json({ error: 'Lote vazio' });
    if (lot.password_hash) return res.status(409).json({ error: 'Este lote já possui senha. Use o login normal.' });

    const hash = hashPassword(password);
    await sql`UPDATE lots SET password_hash = ${hash}, owner_name = ${ownerName.trim()} WHERE id = ${lot.id}`;

    const token = signToken({ type: 'lot', id: lot.id, displayId: lot.display_id, name: ownerName.trim(), role: 'lot' });
    res.cookie('session', token, { ...COOKIE_OPTS, secure: process.env.NODE_ENV === 'production' });
    res.json({ ok: true, lotId: lot.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/login', async (req, res) => {
  try {
    await ensureInit();
    const { type } = req.body;

    if (type === 'lot') {
      const { lotId, password } = req.body;
      if (!lotId || !password) return res.status(400).json({ error: 'Dados incompletos' });
      const rows = await sql`SELECT * FROM lots WHERE id = ${lotId}`;
      const lot = rows[0];
      if (!lot) return res.status(404).json({ error: 'Lote não encontrado' });
      if (lot.is_empty) return res.status(403).json({ error: 'Lote vazio' });
      if (!lot.password_hash) return res.status(401).json({ error: 'Senha ainda não cadastrada. Use o primeiro acesso.' });
      if (hashPassword(password) !== lot.password_hash) return res.status(401).json({ error: 'Senha incorreta' });

      const token = signToken({ type: 'lot', id: lot.id, displayId: lot.display_id, name: lot.owner_name || lot.display_id, role: 'lot' });
      res.cookie('session', token, { ...COOKIE_OPTS, secure: process.env.NODE_ENV === 'production' });
      return res.json({ lotId: lot.id });
    }

    if (type === 'admin') {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Dados incompletos' });
      const rows = await sql`SELECT * FROM admins WHERE username = ${username}`;
      const admin = rows[0];
      if (!admin || hashPassword(password) !== admin.password_hash) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

      const token = signToken({ type: 'admin', id: admin.id, username: admin.username, name: admin.name, role: admin.role });
      res.cookie('session', token, { ...COOKIE_OPTS, secure: process.env.NODE_ENV === 'production' });
      return res.json({ ok: true, role: admin.role });
    }

    res.status(400).json({ error: 'Tipo inválido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
});

router.get('/session', authMiddleware, (req, res) => {
  res.json(req.session);
});

module.exports = router;
