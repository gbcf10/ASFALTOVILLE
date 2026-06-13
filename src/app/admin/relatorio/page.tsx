import { getDb, getMonthlyStats, getDashboardStats, formatMonth, currentMonth } from '@/lib/db';
import { formatCurrency } from '@/lib/auth';
import RelatorioClient from './RelatorioClient';

export const dynamic = 'force-dynamic';

export default function RelatorioPage() {
  const db = getDb();
  const stats = getDashboardStats();
  const monthly = getMonthlyStats();
  const cur = currentMonth();

  // For each active month, get per-lot status
  const activeLots = db.prepare(`SELECT id, display_id, owner_name FROM lots WHERE is_empty=0 ORDER BY id`).all() as Array<{
    id: number; display_id: string; owner_name: string | null;
  }>;

  // Get all paid months per lot
  const lotMonthly = db.prepare(`
    SELECT lot_id, reference_month,
      SUM(CASE WHEN status='pago' THEN amount ELSE 0 END) as paid,
      SUM(CASE WHEN status='pendente' THEN amount ELSE 0 END) as pending
    FROM donations
    WHERE reference_month IS NOT NULL
    GROUP BY lot_id, reference_month
  `).all() as Array<{ lot_id: number; reference_month: string; paid: number; pending: number }>;

  // Build map: lotId -> month -> { paid, pending }
  const lotMonthMap = new Map<number, Map<string, { paid: number; pending: number }>>();
  for (const row of lotMonthly) {
    if (!lotMonthMap.has(row.lot_id)) lotMonthMap.set(row.lot_id, new Map());
    lotMonthMap.get(row.lot_id)!.set(row.reference_month, { paid: row.paid, pending: row.pending });
  }

  // Determine all months that have activity
  const allMonths = Array.from(new Set([
    cur,
    ...monthly.map(m => m.reference_month),
  ])).sort((a, b) => b.localeCompare(a)).slice(0, 6); // last 6 months

  // Build lot report for the current month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const isOverdue = dayOfMonth > 10;

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

  const expenses = db.prepare(`SELECT * FROM expenses ORDER BY expense_date DESC`).all() as Array<{
    id: number; description: string; amount: number; category: string;
    expense_date: string; reference_month: string | null; notes: string | null;
  }>;

  return (
    <RelatorioClient
      stats={stats}
      monthly={monthly}
      allMonths={allMonths}
      lotReport={lotReport}
      expenses={expenses}
      currentMonth={cur}
      isOverdue={isOverdue}
    />
  );
}
