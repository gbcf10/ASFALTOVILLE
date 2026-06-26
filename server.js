const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const QRCode = require('qrcode');
const { generatePixPayload } = require('./lib/pix');
const { ensureInit, getDashboardStats, getMonthlyStats, sql } = require('./lib/db');
const { verifyToken } = require('./lib/auth');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/lots', require('./routes/lots'));
app.use('/api/admin', require('./routes/admin'));

// PIX payload endpoint
app.post('/api/pix/payload', (req, res) => {
  try {
    const { key, name, city, amount } = req.body;
    if (!key) return res.json({ payload: '' });
    const payload = generatePixPayload(key, name || 'Condominio Ville', city || 'Brasil', Number(amount));
    res.json({ payload });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar payload' });
  }
});

// PIX QR Code endpoint
app.get('/api/pix/qrcode', async (req, res) => {
  try {
    const { payload } = req.query;
    if (!payload) return res.status(400).json({ error: 'payload obrigatório' });
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 220,
      margin: 2,
      color: { dark: '#166534', light: '#ffffff' },
    });
    res.json({ dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar QR code' });
  }
});

// Public prestacao data
app.get('/api/public/prestacao', async (req, res) => {
  try {
    await ensureInit();
    const [stats, monthly, expenses] = await Promise.all([
      getDashboardStats(),
      getMonthlyStats(),
      sql`SELECT * FROM expenses ORDER BY expense_date DESC`,
    ]);
    let runningBalance = 0;
    const monthlyWithBalance = [...monthly].reverse().map(m => {
      runningBalance += m.total_paid - m.total_expenses;
      return { ...m, running_balance: runningBalance };
    }).reverse();
    res.json({
      stats,
      monthly: monthlyWithBalance,
      expenses: expenses.map(e => ({ ...e, amount: Number(e.amount) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Page routes — serve HTML files, let client-side JS handle auth redirects
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/lote/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lote.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin/:section', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/prestacao', (req, res) => res.sendFile(path.join(__dirname, 'public', 'prestacao.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Asfaltoville rodando na porta ${PORT}`);
  ensureInit().catch(console.error);
});
