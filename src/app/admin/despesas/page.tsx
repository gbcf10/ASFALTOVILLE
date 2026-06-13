import { sql, ensureInit } from '@/lib/db';
import DespesasClient from './DespesasClient';

export const dynamic = 'force-dynamic';

export default async function DespesasPage() {
  await ensureInit();

  const expenses = await sql`SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC` as Array<{
    id: number; description: string; amount: number; category: string;
    expense_date: string; notes: string | null; created_at: string;
  }>;

  const normalized = expenses.map(e => ({ ...e, amount: Number(e.amount) }));
  const total = normalized.reduce((s, e) => s + e.amount, 0);

  return <DespesasClient expenses={normalized} total={total} />;
}
