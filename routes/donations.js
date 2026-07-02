const express = require('express');
const router = express.Router();
const { sql, ensureInit, currentMonth } = require('../lib/db');
const { authMiddleware, adminOnly } = require('../lib/auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    await ensureInit();
    const { lotId, donorName, amount, paymentMethod, notes, referenceMonth } = req.body;
    if (!lotId || !donorName || !amount || !paymentMethod) return res.status(400).json({ error: 'Dados incompletos' });
    if (amount < 20) return res.status(400).json({ error: 'Valor mínimo é R$ 20,00' });
    if (req.session.type === 'lot' && req.session.id !== lotId) return res.status(403).json({ error: 'Acesso negado' });

    const lotCheck = await sql`SELECT id FROM lots WHERE id = ${lotId}`;
    if (!lotCheck[0]) return res.status(404).json({ error: 'Lote não encontrado' });

    const refMonth = referenceMonth || currentMonth();
    const isAdmin = req.session.type === 'admin';
    const status = isAdmin ? 'pago' : (paymentMethod === 'pix' ? 'pago' : 'pendente');
    const confirmedAt = status === 'pago' ? new Date().toISOString() : null;
    const confirmedBy = isAdmin ? (req.session.username || 'admin') : (paymentMethod === 'pix' ? 'auto-pix' : null);

    const result = await sql`
      INSERT INTO donations (lot_id, donor_name, amount, payment_method, status, reference_month, notes, confirmed_at, confirmed_by)
      VALUES (${lotId}, ${donorName.trim()}, ${amount}, ${paymentMethod}, ${status}, ${refMonth}, ${notes?.trim() || null}, ${confirmedAt}, ${confirmedBy})
      RETURNING id
    `;
    res.status(201).json({ id: result[0].id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    await ensureInit();
    const donationId = parseInt(req.params.id, 10);

    const rows = await sql`SELECT * FROM donations WHERE id = ${donationId}`;
    const donation = rows[0];
    if (!donation) return res.status(404).json({ error: 'Contribuição não encontrada' });

    if (req.session.type === 'lot') {
      const { status } = req.body;
      if (req.session.id !== donation.lot_id) return res.status(403).json({ error: 'Acesso negado' });
      if (status !== 'pago') return res.status(403).json({ error: 'Acesso negado' });

      const confirmedAt = new Date().toISOString();
      await sql`UPDATE donations SET status = 'pago', confirmed_at = ${confirmedAt}, confirmed_by = 'auto-pix' WHERE id = ${donationId}`;
      return res.json({ ok: true });
    }

    // Admin: edição multi-campo (status, forma de pagamento, lote, mês, valor)
    const { status, paymentMethod, lotId, referenceMonth, amount } = req.body;

    if (status !== undefined && !['pago', 'pendente'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    if (paymentMethod !== undefined && !['pix', 'dinheiro'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Forma de pagamento inválida' });
    }
    if (referenceMonth !== undefined && !/^\d{4}-\d{2}$/.test(referenceMonth)) {
      return res.status(400).json({ error: 'Mês de referência inválido' });
    }
    if (amount !== undefined && !(amount >= 20)) {
      return res.status(400).json({ error: 'Valor mínimo é R$ 20,00' });
    }
    let newLotId = donation.lot_id;
    if (lotId !== undefined) {
      const lotCheck = await sql`SELECT id FROM lots WHERE id = ${lotId}`;
      if (!lotCheck[0]) return res.status(404).json({ error: 'Lote não encontrado' });
      newLotId = lotId;
    }

    const newStatus = status !== undefined ? status : donation.status;
    const statusChanged = status !== undefined && status !== donation.status;
    const confirmedAt = statusChanged ? (newStatus === 'pago' ? new Date().toISOString() : null) : donation.confirmed_at;
    const confirmedBy = statusChanged ? (newStatus === 'pago' ? (req.session.username || 'admin') : null) : donation.confirmed_by;

    await sql`UPDATE donations SET
      status = ${newStatus},
      payment_method = ${paymentMethod !== undefined ? paymentMethod : donation.payment_method},
      lot_id = ${newLotId},
      reference_month = ${referenceMonth !== undefined ? referenceMonth : donation.reference_month},
      amount = ${amount !== undefined ? amount : donation.amount},
      confirmed_at = ${confirmedAt},
      confirmed_by = ${confirmedBy}
      WHERE id = ${donationId}`;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await ensureInit();
    await sql`DELETE FROM donations WHERE id = ${parseInt(req.params.id, 10)}`;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
