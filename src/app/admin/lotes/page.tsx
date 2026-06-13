import { sql, ensureInit } from '@/lib/db';
import LotesClient from './LotesClient';

export const dynamic = 'force-dynamic';

export default async function LotesPage() {
  await ensureInit();

  const lots = await sql`
    SELECT l.*,
      COALESCE(SUM(CASE WHEN d.status = 'pago' THEN d.amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN d.status = 'pendente' THEN d.amount ELSE 0 END), 0) as total_pending,
      COUNT(DISTINCT CASE WHEN d.status = 'pago' THEN d.id END) as donation_count
    FROM lots l LEFT JOIN donations d ON d.lot_id = l.id
    GROUP BY l.id ORDER BY l.id
  ` as Array<{
    id: number; display_id: string;
    owner_name: string | null; password_hash: string | null; is_empty: number;
    total_paid: number; total_pending: number; donation_count: number;
  }>;

  const normalized = lots.map(l => ({
    ...l,
    total_paid: Number(l.total_paid),
    total_pending: Number(l.total_pending),
    donation_count: Number(l.donation_count),
  }));

  return <LotesClient lots={normalized} />;
}
