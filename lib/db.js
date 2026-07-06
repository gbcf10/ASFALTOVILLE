const postgres = require('postgres');
const { createHash } = require('crypto');

let _pg = null;

function getPg() {
if (!_pg) {
const url = process.env.SUPABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('SUPABASE_URL não configurada.');
_pg = postgres(url, { prepare: false, ssl: { rejectUnauthorized: false }, connect_timeout: 10, idle_timeout: 20 });
}
return _pg;
}

// Se a conexão travar em vez de dar erro (comum quando o pooler do Supabase
// fica instável), descarta o cliente preso e força uma conexão nova na
// próxima consulta — sem isso, uma única query travada deixa o app inteiro
// fora do ar até o próximo deploy.
function resetPg() {
const old = _pg;
_pg = null;
if (old) old.end({ timeout: 1 }).catch(() => {});
}

const QUERY_TIMEOUT_MS = 15000;

function withTimeout(promise) {
let timer;
const timeout = new Promise((_resolve, reject) => {
timer = setTimeout(() => { resetPg(); reject(new Error('Consulta ao banco expirou (timeout)')); }, QUERY_TIMEOUT_MS);
});
return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sql = new Proxy((() => {}), {
apply(_t, _ctx, args) { return withTimeout(getPg().apply(_ctx, args)); },
get(_t, prop) { return getPg()[prop]; },
});

function hashPassword(plain) {
return createHash('sha256').update('AsfaltoVille2024_Salt_' + plain).digest('hex');
}

let _initPromise = null;

async function ensureInit() {
if (_initPromise) return _initPromise;
_initPromise = (async () => {
try {
await _runInit();
} catch (err) {
_initPromise = null;
throw err;
}
})();
return _initPromise;
}

async function _runInit() {
const h1 = hashPassword('Sindico@2024');
const h2 = hashPassword('Admin@2024');

await sql`CREATE TABLE IF NOT EXISTS lots (
id SERIAL PRIMARY KEY,
display_id TEXT NOT NULL UNIQUE,
owner_name TEXT,
password_hash TEXT,
is_empty INTEGER DEFAULT 0,
created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
)`;
await sql`CREATE TABLE IF NOT EXISTS donations (
id SERIAL PRIMARY KEY,
lot_id INTEGER NOT NULL REFERENCES lots(id),
donor_name TEXT NOT NULL,
amount REAL NOT NULL,
payment_method TEXT NOT NULL,
status TEXT DEFAULT 'pendente',
reference_month TEXT,
notes TEXT,
created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
confirmed_at TEXT,
confirmed_by TEXT,
reject_reason TEXT,
rejected_at TEXT
)`;
await sql`ALTER TABLE donations ADD COLUMN IF NOT EXISTS reject_reason TEXT`;
await sql`ALTER TABLE donations ADD COLUMN IF NOT EXISTS rejected_at TEXT`;
await sql`CREATE TABLE IF NOT EXISTS expenses (
id SERIAL PRIMARY KEY,
description TEXT NOT NULL,
amount REAL NOT NULL,
category TEXT DEFAULT 'geral',
expense_date TEXT NOT NULL,
reference_month TEXT,
notes TEXT,
created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
)`;
await sql`CREATE TABLE IF NOT EXISTS admins (
id SERIAL PRIMARY KEY,
username TEXT NOT NULL UNIQUE,
name TEXT NOT NULL,
password_hash TEXT NOT NULL,
role TEXT DEFAULT 'admin',
created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
)`;
await sql`INSERT INTO lots (display_id)
SELECT to_char(n, 'FM000') FROM generate_series(1, 256) AS n
ON CONFLICT (display_id) DO NOTHING`;
await sql`INSERT INTO admins (username, name, password_hash, role)
VALUES ('sindico', 'Elton de Jesus Rodrigues', ${h1}, 'admin')
ON CONFLICT (username) DO NOTHING`;
await sql`INSERT INTO admins (username, name, password_hash, role)
VALUES ('admin', 'Gabriel', ${h2}, 'superadmin')
ON CONFLICT (username) DO NOTHING`;
}

function currentMonth() {
const now = new Date();
return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(yyyyMm) {
const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const [year, month] = yyyyMm.split('-');
return `${months[parseInt(month) - 1]}/${year}`;
}

async function getDashboardStats() {
const [r1, r2, r3, r4, r5] = await Promise.all([
sql`SELECT COALESCE(SUM(amount),0) as t FROM donations WHERE status='pago'`,
sql`SELECT COALESCE(SUM(amount),0) as t FROM donations WHERE status='pendente'`,
sql`SELECT COUNT(DISTINCT lot_id) as c FROM donations WHERE status='pago'`,
sql`SELECT COUNT(*) as c FROM lots WHERE is_empty=0`,
sql`SELECT COALESCE(SUM(amount),0) as t FROM expenses`,
]);
const totalPaid = Number(r1[0].t);
const totalPending = Number(r2[0].t);
const contributingLots = Number(r3[0].c);
const totalActiveLots = Number(r4[0].c);
const totalExpenses = Number(r5[0].t);
return { totalPaid, totalPending, contributingLots, totalActiveLots, totalExpenses, balance: totalPaid - totalExpenses };
}

async function getMonthlyStats() {
const [income, expenses] = await Promise.all([
sql`SELECT reference_month,
COUNT(DISTINCT CASE WHEN status='pago' THEN lot_id END) as contributing_lots,
COALESCE(SUM(CASE WHEN status='pago' THEN amount ELSE 0 END), 0) as total_paid,
COALESCE(SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END), 0) as total_pending
FROM donations WHERE reference_month IS NOT NULL
GROUP BY reference_month ORDER BY reference_month DESC`,
sql`SELECT reference_month, COALESCE(SUM(amount), 0) as total_expenses
FROM expenses WHERE reference_month IS NOT NULL GROUP BY reference_month`,
]);
const expMap = new Map(expenses.map(e => [e.reference_month, Number(e.total_expenses)]));
const allMonths = new Set([...income.map(i => i.reference_month), ...expenses.map(e => e.reference_month)]);
const incMap = new Map(income.map(i => [i.reference_month, i]));
return Array.from(allMonths).sort((a, b) => b.localeCompare(a)).map(m => ({
reference_month: m,
contributing_lots: Number(incMap.get(m)?.contributing_lots ?? 0),
total_paid: Number(incMap.get(m)?.total_paid ?? 0),
total_pending: Number(incMap.get(m)?.total_pending ?? 0),
total_expenses: expMap.get(m) ?? 0,
}));
}

module.exports = { sql, hashPassword, ensureInit, currentMonth, formatMonth, getDashboardStats, getMonthlyStats };