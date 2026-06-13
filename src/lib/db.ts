import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'asfaltoville.db');
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
  }
  return _db;
}

function runMigrations(db: Database.Database) {
  // Add reference_month if missing (for existing databases)
  try { db.exec(`ALTER TABLE donations ADD COLUMN reference_month TEXT`); } catch {}
  try { db.exec(`ALTER TABLE expenses ADD COLUMN reference_month TEXT`); } catch {}
  // Backfill reference_month from created_at
  db.exec(`UPDATE donations SET reference_month = strftime('%Y-%m', created_at) WHERE reference_month IS NULL`);
  db.exec(`UPDATE expenses SET reference_month = strftime('%Y-%m', expense_date) WHERE reference_month IS NULL`);
}

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

export function getLotById(id: number): Lot | null {
  return getDb().prepare('SELECT * FROM lots WHERE id = ?').get(id) as Lot | null;
}

export function getDonationsByLotId(lotId: number): Donation[] {
  return getDb().prepare('SELECT * FROM donations WHERE lot_id = ? ORDER BY created_at DESC').all(lotId) as Donation[];
}

export interface MonthlyLotStatus {
  reference_month: string;
  total_paid: number;
  total_pending: number;
  is_paid: boolean; // >= 20 confirmed
}

export function getLotMonthlyStatus(lotId: number): MonthlyLotStatus[] {
  const rows = getDb().prepare(`
    SELECT
      reference_month,
      COALESCE(SUM(CASE WHEN status='pago' THEN amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END), 0) as total_pending
    FROM donations
    WHERE lot_id = ? AND reference_month IS NOT NULL
    GROUP BY reference_month
    ORDER BY reference_month DESC
  `).all(lotId) as Array<{ reference_month: string; total_paid: number; total_pending: number }>;

  return rows.map(r => ({ ...r, is_paid: r.total_paid >= 20 }));
}

export interface MonthlyStats {
  reference_month: string;
  contributing_lots: number;
  total_paid: number;
  total_pending: number;
  total_expenses: number;
}

export function getMonthlyStats(): MonthlyStats[] {
  const db = getDb();

  const income = db.prepare(`
    SELECT
      reference_month,
      COUNT(DISTINCT CASE WHEN status='pago' THEN lot_id END) as contributing_lots,
      COALESCE(SUM(CASE WHEN status='pago' THEN amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END), 0) as total_pending
    FROM donations
    WHERE reference_month IS NOT NULL
    GROUP BY reference_month
    ORDER BY reference_month DESC
  `).all() as Array<{ reference_month: string; contributing_lots: number; total_paid: number; total_pending: number }>;

  const expenses = db.prepare(`
    SELECT reference_month, COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses WHERE reference_month IS NOT NULL
    GROUP BY reference_month
  `).all() as Array<{ reference_month: string; total_expenses: number }>;

  const expMap = new Map(expenses.map(e => [e.reference_month, e.total_expenses]));

  // Merge all months from income and expenses
  const allMonths = new Set([...income.map(i => i.reference_month), ...expenses.map(e => e.reference_month)]);
  const incMap = new Map(income.map(i => [i.reference_month, i]));

  return Array.from(allMonths)
    .sort((a, b) => b.localeCompare(a))
    .map(m => ({
      reference_month: m,
      contributing_lots: incMap.get(m)?.contributing_lots ?? 0,
      total_paid: incMap.get(m)?.total_paid ?? 0,
      total_pending: incMap.get(m)?.total_pending ?? 0,
      total_expenses: expMap.get(m) ?? 0,
    }));
}

export function getDashboardStats() {
  const db = getDb();
  const totalPaid = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM donations WHERE status='pago'`).get() as { t: number }).t;
  const totalPending = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM donations WHERE status='pendente'`).get() as { t: number }).t;
  const contributingLots = (db.prepare(`SELECT COUNT(DISTINCT lot_id) as c FROM donations WHERE status='pago'`).get() as { c: number }).c;
  const totalActiveLots = (db.prepare(`SELECT COUNT(*) as c FROM lots WHERE is_empty=0`).get() as { c: number }).c;
  const totalExpenses = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses`).get() as { t: number }).t;
  return {
    totalPaid, totalPending, contributingLots, totalActiveLots,
    totalExpenses, balance: totalPaid - totalExpenses,
  };
}

export function formatMonth(yyyyMm: string): string {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [year, month] = yyyyMm.split('-');
  return `${months[parseInt(month) - 1]}/${year}`;
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
