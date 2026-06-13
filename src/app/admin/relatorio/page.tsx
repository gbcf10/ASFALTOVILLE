import { sql, getMonthlyStats, getDashboardStats, ensureInit } from '@/lib/db';
import { formatMonth } from '@/lib/utils';
import RelatorioClient from './RelatorioClient';

export const dynamic = 'force-dynamic';

export default async function RelatorioPage() {
  await ensureInit();
  const [stats, monthly] = await Promise.all([getDashboardStats(), getMonthlyStats()]);

  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayOfMonth = now.getDate();
  const isOverdue = dayOfMonth > 10;

  const activeLots = await sql`
    SELECT id, display_id, owner_name FROM lots WHERE is_empty=0 ORDER BY id
  ` as Array<{ id: number; display_id: string; owner_name: string | null }>;

  const lotMonthlyRows = await sql`
    SELECT lot_id, reference_month,
      SUM(CASE WHEN status='pago' THEN amount ELSE 0 END) as paid,
      SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END) as pending
    FROM donations WHERE reference_month IS NOT NULL
    GROUP BY lot_id, reference_month
  ` as Array<{ lot_id: number; reference_month: string; paid: number; pending: number }>;

  const lotMonthMap = new Map<number, Map<string, { paid: number; pending: number }>>();
  for (const row of lotMonthlyRows) {
    if (!lotMonthMap.has(row.lot_id)) lotMonthMap.set(row.lot_id, new Map());
    lotMonthMap.get(row.lot_id)!.set(row.reference_month, { paid: Number(row.paid), pending: Number(row.pending) });
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

  const expenses = await sql`SELECT * FROM expenses ORDER BY expense_date DESC` as Array<{
    id: number; description: string; amount: number; category: string;
    expense_date: string; reference_month: string | null; notes: string | null;
  }>;

  return (
    <RelatorioClient
      stats={stats}
      monthly={monthly}
      allMonths={allMonths}
      lotReport={lotReport}
      expenses={expenses.map(e => ({ ...e, amount: Number(e.amount) }))}
      currentMonth={cur}
      isOverdue={isOverdue}
    />
  );
}
