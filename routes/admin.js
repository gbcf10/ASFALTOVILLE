const express = require('express');
const router = express.Router();
const { sql, hashPassword, ensureInit, getDashboardStats, getMonthlyStats, currentMonth, formatMonth } = require('../lib/db');
const { authMiddleware, adminOnly } = require('../lib/auth');

// Dashboard data
router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const [stats, pending, recent] = await Promise.all([
      getDashboardStats(),
      sql`SELECT d.*, l.display_id, l.owner_name FROM donations d JOIN lots l ON l.id = d.lot_id WHERE d.status = 'pendente' ORDER BY d.created_at DESC`,
      sql`SELECT d.*, l.display_id, l.owner_name FROM donations d JOIN lots l ON l.id = d.lot_id ORDER BY d.created_at DESC LIMIT 20`,
    ]);
    res.json({
      stats,
      pendingDonations: pending.map(d => ({ ...d, amount: Number(d.amount) })),
      recentDonations: recent.map(d => ({ ...d, amount: Number(d.amount) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Relatorio data
router.get('/relatorio', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const [stats, monthly] = await Promise.all([getDashboardStats(), getMonthlyStats()]);

    const now = new Date();
    const cur = currentMonth();
    const isOverdue = now.getDate() > 10;

    const [activeLots, lotMonthlyRows, expenses] = await Promise.all([
      sql`SELECT id, display_id, owner_name FROM lots WHERE is_empty=0 ORDER BY id`,
      sql`SELECT lot_id, reference_month,
        SUM(CASE WHEN status='pago' THEN amount ELSE 0 END) as paid,
        SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END) as pending
        FROM donations WHERE reference_month IS NOT NULL
        GROUP BY lot_id, reference_month`,
      sql`SELECT * FROM expenses ORDER BY expense_date DESC`,
    ]);

    const lotMonthMap = new Map();
    for (const row of lotMonthlyRows) {
      if (!lotMonthMap.has(row.lot_id)) lotMonthMap.set(row.lot_id, new Map());
      lotMonthMap.get(row.lot_id).set(row.reference_month, { paid: Number(row.paid), pending: Number(row.pending) });
    }

    const allMonths = Array.from(new Set([cur, ...monthly.map(m => m.reference_month)]))
      .sort((a, b) => b.localeCompare(a)).slice(0, 6);

    const lotReport = activeLots.map(l => {
      const monthMap = lotMonthMap.get(l.id) || new Map();
      const overdueMonths = allMonths.filter(m => {
        const isPast = m < cur || (m === cur && isOverdue);
        if (!isPast) return false;
        const s = monthMap.get(m);
        return !s || s.paid < 20;
      });
      const curStatus = monthMap.get(cur);
      return {
        ...l,
        monthData: allMonths.map(m => {
          const s = monthMap.get(m);
          return { month: m, paid: s?.paid ?? 0, pending: s?.pending ?? 0, isOk: (s?.paid ?? 0) >= 20 };
        }),
        totalPaid: Array.from(monthMap.values()).reduce((s, v) => s + v.paid, 0),
        overdueCount: overdueMonths.length,
        currentMonthPaid: (curStatus?.paid ?? 0) >= 20,
      };
    });

    res.json({
      stats,
      monthly,
      allMonths,
      lotReport,
      expenses: expenses.map(e => ({ ...e, amount: Number(e.amount) })),
      currentMonth: cur,
      isOverdue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update admin account (name or password)
router.patch('/conta', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    const { name, currentPassword, newPassword } = req.body;
    const rows = await sql`SELECT * FROM admins WHERE id = ${req.session.id}`;
    const admin = rows[0];
    if (!admin) return res.status(404).json({ error: 'Conta não encontrada' });

    if (currentPassword) {
      if (hashPassword(currentPassword) !== admin.password_hash) return res.status(400).json({ error: 'Senha atual incorreta' });
      if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
      await sql`UPDATE admins SET password_hash=${hashPassword(newPassword)} WHERE id=${admin.id}`;
    }

    if (name?.trim()) {
      await sql`UPDATE admins SET name=${name.trim()} WHERE id=${admin.id}`;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
