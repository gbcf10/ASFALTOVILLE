const express = require('express');
const router = express.Router();
const { sql, ensureInit, currentMonth, formatMonth } = require('../lib/db');
const { authMiddleware, adminOnly } = require('../lib/auth');

// List all lots (admin)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const { month } = req.query;

    const lots = await sql`
      SELECT l.*,
        COALESCE(SUM(CASE WHEN d.status='pago' THEN d.amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN d.status='pendente' THEN d.amount ELSE 0 END), 0) as total_pending,
        COUNT(d.id) as donation_count,
        COALESCE(SUM(CASE WHEN d.status='pago' AND d.reference_month=${month || ''} THEN d.amount ELSE 0 END), 0) as month_paid,
        COALESCE(SUM(CASE WHEN d.status='pendente' AND d.reference_month=${month || ''} THEN d.amount ELSE 0 END), 0) as month_pending
      FROM lots l
      LEFT JOIN donations d ON d.lot_id = l.id
      GROUP BY l.id ORDER BY l.id
    `;
    res.json(lots.map(l => ({
      ...l,
      total_paid: Number(l.total_paid),
      total_pending: Number(l.total_pending),
      donation_count: Number(l.donation_count),
      month_paid: Number(l.month_paid),
      month_pending: Number(l.month_pending),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Get lot dashboard data
router.get('/:id/dashboard', authMiddleware, async (req, res) => {
  try {
    await ensureInit();
    const lotId = parseInt(req.params.id, 10);

    if (req.session.type === 'lot' && req.session.id !== lotId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const [lotRows, donations] = await Promise.all([
      sql`SELECT * FROM lots WHERE id = ${lotId}`,
      sql`SELECT * FROM donations WHERE lot_id = ${lotId} ORDER BY created_at DESC`,
    ]);

    const lot = lotRows[0];
    if (!lot) return res.status(404).json({ error: 'Lote não encontrado' });

    const monthlyRows = await sql`
      SELECT reference_month,
        COALESCE(SUM(CASE WHEN status='pago' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END), 0) as total_pending
      FROM donations
      WHERE lot_id = ${lotId} AND reference_month IS NOT NULL
      GROUP BY reference_month ORDER BY reference_month DESC
    `;

    const curMonth = currentMonth();
    const now = new Date();
    const dayOfMonth = now.getDate();
    const isOverdue = dayOfMonth > 10;

    const monthlyStatus = monthlyRows.map(r => ({
      reference_month: r.reference_month,
      total_paid: Number(r.total_paid),
      total_pending: Number(r.total_pending),
      is_paid: Number(r.total_paid) >= 20,
    }));

    const curStatus = monthlyStatus.find(m => m.reference_month === curMonth);
    const paidThisMonth = (curStatus?.total_paid ?? 0) >= 20;
    const totalPaid = monthlyStatus.reduce((s, m) => s + m.total_paid, 0);

    res.json({
      lot,
      donations: donations.map(d => ({ ...d, amount: Number(d.amount) })),
      monthlyStatus,
      totalPaid,
      currentMonth: curMonth,
      dayOfMonth,
      isOverdue,
      paidThisMonth,
      isAdmin: req.session.type === 'admin',
      pixKey: process.env.PIX_KEY || '',
      pixName: process.env.PIX_BENEFICIARY || 'Condominio Ville',
      pixCity: process.env.PIX_CITY || 'Brasil',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update lot (admin)
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const lotId = parseInt(req.params.id, 10);
    const { ownerName, isEmpty, resetPassword } = req.body;

    if (resetPassword) {
      await sql`UPDATE lots SET owner_name = ${ownerName?.trim() || null}, is_empty = ${isEmpty ? 1 : 0}, password_hash = NULL WHERE id = ${lotId}`;
    } else {
      await sql`UPDATE lots SET owner_name = ${ownerName?.trim() || null}, is_empty = ${isEmpty ? 1 : 0} WHERE id = ${lotId}`;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
