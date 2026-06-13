import { getDb, getDashboardStats } from '@/lib/db';
import { formatCurrency } from '@/lib/auth';
import AdminConfirmCard from './AdminConfirmCard';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const stats = getDashboardStats();
  const db = getDb();

  const pendingDonations = db.prepare(`
    SELECT d.*, l.display_id, l.owner_name
    FROM donations d
    JOIN lots l ON l.id = d.lot_id
    WHERE d.status = 'pendente'
    ORDER BY d.created_at DESC
  `).all() as Array<{
    id: number; lot_id: number; donor_name: string; amount: number;
    payment_method: string; status: string; notes: string | null;
    created_at: string; display_id: string; owner_name: string | null;
  }>;

  const recentDonations = db.prepare(`
    SELECT d.*, l.display_id, l.owner_name
    FROM donations d
    JOIN lots l ON l.id = d.lot_id
    ORDER BY d.created_at DESC
    LIMIT 20
  `).all() as typeof pendingDonations;

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Painel Geral</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Arrecadado</p>
          <p className="text-2xl font-bold text-brand-700">{formatCurrency(stats.totalPaid)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pendente</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPending)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Despesas</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Saldo</p>
          <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-700">{stats.contributingLots}</p>
          <p className="text-gray-500 text-sm mt-1">Lotes colaboraram</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.totalActiveLots - stats.contributingLots}</p>
          <p className="text-gray-500 text-sm mt-1">Lotes pendentes</p>
        </div>
      </div>

      {pendingDonations.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            Aguardando Confirmação ({pendingDonations.length})
          </h2>
          <div className="space-y-3">
            {pendingDonations.map(d => <AdminConfirmCard key={d.id} donation={d} />)}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-bold text-gray-800 mb-4">Contribuições Recentes</h2>
        {recentDonations.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhuma contribuição ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Lote</th>
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                  <th className="pb-2 font-medium">Método</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDonations.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-2 font-mono font-bold text-xs text-gray-700">{d.display_id}</td>
                    <td className="py-2 text-gray-700 max-w-[120px] truncate">{d.owner_name || d.donor_name}</td>
                    <td className="py-2 font-semibold text-gray-800 text-right">{formatCurrency(d.amount)}</td>
                    <td className="py-2">
                      <span className={d.payment_method === 'pix' ? 'badge-pix' : 'badge-dinheiro'}>
                        {d.payment_method === 'pix' ? '💠 PIX' : '💵 Dinheiro'}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={d.status === 'pago' ? 'badge-pago' : 'badge-pendente'}>
                        {d.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs whitespace-nowrap">{fmtDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
