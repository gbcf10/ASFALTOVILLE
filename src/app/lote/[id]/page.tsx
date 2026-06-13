import { getSession } from '@/lib/auth';
import { getLotById, getDonationsByLotId, getLotMonthlyStatus } from '@/lib/db';
import { currentMonth } from '@/lib/utils';
import { redirect } from 'next/navigation';
import LotDashboard from './LotDashboard';

export const dynamic = 'force-dynamic';

interface Props { params: { id: string } }

export default async function LotPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect('/login');

  const lotDbId = parseInt(params.id, 10);
  if (isNaN(lotDbId)) redirect('/login');
  if (session.type === 'lot' && session.id !== lotDbId) redirect(`/lote/${session.id}`);

  const [lot, donations, monthlyStatus] = await Promise.all([
    getLotById(lotDbId),
    getDonationsByLotId(lotDbId),
    getLotMonthlyStatus(lotDbId),
  ]);

  if (!lot) redirect('/login');

  const totalPaid = donations.filter(d => d.status === 'pago').reduce((s, d) => s + Number(d.amount), 0);
  const now = new Date();
  const cur = currentMonth();
  const dayOfMonth = now.getDate();
  const isOverdue = dayOfMonth > 10;
  const paidThisMonth = monthlyStatus.find(m => m.reference_month === cur)?.is_paid ?? false;

  return (
    <LotDashboard
      lot={lot}
      donations={donations}
      monthlyStatus={monthlyStatus}
      totalPaid={totalPaid}
      currentMonth={cur}
      dayOfMonth={dayOfMonth}
      isOverdue={isOverdue}
      paidThisMonth={paidThisMonth}
      isAdmin={session.type === 'admin'}
      pixKey={process.env.PIX_KEY || ''}
      pixBeneficiary={process.env.PIX_BENEFICIARY || 'Condomínio Ville'}
      pixCity={process.env.PIX_CITY || 'Rio de Janeiro'}
    />
  );
}
