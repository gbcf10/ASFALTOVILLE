import postgres from 'postgres';
import { createHash } from 'crypto';

let _pg: ReturnType<typeof postgres> | null = null;

function getPg() {
  if (!_pg) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada no Vercel.');
    // prepare:false obrigatório com o pooler do Supabase
    _pg = postgres(url, { prepare: false, ssl: 'require', password: process.env.DB_PASSWORD || undefined });
  }
  return _pg;
}

// Lazy proxy — postgres só é instanciado na primeira query, não no build
export const sql: ReturnType<typeof postgres> = new Proxy(
  (() => {}) as unknown as ReturnType<typeof postgres>,
  {
    apply(_t, _ctx, args) { return (getPg() as unknown as Function).apply(_ctx, args); },
    get(_t, prop) { return (getPg() as unknown as Record<string | symbol, unknown>)[prop]; },
  }
);

export function hashPassword(plain: string): string {
  return createHash('sha256').update('AsfaltoVille2024_Salt_' + plain).digest('hex');
}

export interface Lot {
  id: number;
  display_id: string;
  owner_name: string | null;
  password_hash: string | null;
  is_empty: number;
  created_at: string;
}

export interface Donation {
  id: number;
  lot_id: number;
  donor_name: string;
  amount: number;
  payment_method: string;
  status: string;
  reference_month: string | null;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  display_id?: string;
  owner_name?: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  reference_month: string | null;
  notes: string | null;
  created_at: string;
}

export interface MonthlyLotStatus {
  reference_month: string;
  total_paid: number;
  total_pending: number;
  is_paid: boolean;
}

export interface MonthlyStats {
  reference_month: string;
  contributing_lots: number;
  total_paid: number;
  total_pending: number;
  total_expenses: number;
}

let _initialized = false;

export async function ensureInit() {
  if (_initialized) return;
  _initialized = true;

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
    confirmed_by TEXT
  )`;
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

export async function getLotById(id: number): Promise<Lot | null> {
  await ensureInit();
  const rows = await sql`SELECT * FROM lots WHERE id = ${id}`;
  return (rows[0] as unknown as Lot) ?? null;
}

export async function getDonationsByLotId(lotId: number): Promise<Donation[]> {
  await ensureInit();
  const rows = await sql`SELECT * FROM donations WHERE lot_id = ${lotId} ORDER BY created_at DESC`;
  return rows as unknown as Donation[];
}

export async function getLotMonthlyStatus(lotId: number): Promise<MonthlyLotStatus[]> {
  await ensureInit();
  const rows = await sql`
    SELECT reference_month,
      COALESCE(SUM(CASE WHEN status='pago' THEN amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END), 0) as total_pending
    FROM donations
    WHERE lot_id = ${lotId} AND reference_month IS NOT NULL
    GROUP BY reference_month ORDER BY reference_month DESC
  `;
  return (rows as unknown as Array<{ reference_month: string; total_paid: number; total_pending: number }>)
    .map(r => ({ ...r, total_paid: Number(r.total_paid), total_pending: Number(r.total_pending), is_paid: Number(r.total_paid) >= 20 }));
}

export async function getMonthlyStats(): Promise<MonthlyStats[]> {
  await ensureInit();
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
  const expMap = new Map(expenses.map(e => [e.reference_month as string, Number(e.total_expenses)]));
  const allMonths = new Set([...income.map(i => i.reference_month as string), ...expenses.map(e => e.reference_month as string)]);
  const incMap = new Map(income.map(i => [i.reference_month as string, i]));
  return Array.from(allMonths).sort((a, b) => b.localeCompare(a)).map(m => ({
    reference_month: m,
    contributing_lots: Number(incMap.get(m)?.contributing_lots ?? 0),
    total_paid: Number(incMap.get(m)?.total_paid ?? 0),
    total_pending: Number(incMap.get(m)?.total_pending ?? 0),
    total_expenses: expMap.get(m) ?? 0,
  }));
}

export async function getDashboardStats() {
  await ensureInit();
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
