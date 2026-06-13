import { getDb } from '@/lib/db';
import { formatCurrency } from '@/lib/auth';
import DespesasClient from './DespesasClient';

export const dynamic = 'force-dynamic';

export default function DespesasPage() {
  const db = getDb();
  const expenses = db.prepare(`SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC`).all() as Array<{
    id: number; description: string; amount: number; category: string;
    expense_date: string; notes: string | null; created_at: string;
  }>;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return <DespesasClient expenses={expenses} total={total} />;
}
