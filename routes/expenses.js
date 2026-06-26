const express = require('express');
const router = express.Router();
const { sql, ensureInit } = require('../lib/db');
const { authMiddleware, adminOnly } = require('../lib/auth');

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const expenses = await sql`SELECT * FROM expenses ORDER BY expense_date DESC`;
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    res.json({ expenses: expenses.map(e => ({ ...e, amount: Number(e.amount) })), total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const { description, amount, category, expense_date, notes } = req.body;
    if (!description || !amount || !expense_date) return res.status(400).json({ error: 'Dados incompletos' });
    const refMonth = expense_date.substring(0, 7);
    const result = await sql`
      INSERT INTO expenses (description, amount, category, expense_date, reference_month, notes)
      VALUES (${description.trim()}, ${amount}, ${category || 'geral'}, ${expense_date}, ${refMonth}, ${notes?.trim() || null})
      RETURNING id
    `;
    res.status(201).json({ id: result[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { description, amount, category, expense_date, notes } = req.body;
    if (!description || !amount || !expense_date) return res.status(400).json({ error: 'Dados incompletos' });
    const refMonth = expense_date.substring(0, 7);
    await sql`
      UPDATE expenses SET description=${description.trim()}, amount=${amount}, category=${category || 'geral'},
      expense_date=${expense_date}, reference_month=${refMonth}, notes=${notes?.trim() || null}
      WHERE id=${id}
    `;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    await sql`DELETE FROM expenses WHERE id = ${id}`;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
