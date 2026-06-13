import { getDb } from '@/lib/db';
import LotesClient from './LotesClient';

export const dynamic = 'force-dynamic';

export default function LotesPage() {
  const db = getDb();

  const lots = db.prepare(`
    SELECT
      l.*,
      COALESCE(SUM(CASE WHEN d.status = 'pago' THEN d.amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN d.status = 'pendente' THEN d.amount ELSE 0 END), 0) as total_pending,
      COUNT(DISTINCT CASE WHEN d.status = 'pago' THEN d.id END) as donation_count
    FROM lots l
    LEFT JOIN donations d ON d.lot_id = l.id
    GROUP BY l.id
    ORDER BY l.id
  `).all() as Array<{
    id: number; display_id: string;
    owner_name: string | null; password_hash: string | null; is_empty: number;
    total_paid: number; total_pending: number; donation_count: number;
  }>;

  return <LotesClient lots={lots} />;
}
