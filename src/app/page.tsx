import { getDashboardStats, getMonthlyStats } from '@/lib/db';
import { formatMonth } from '@/lib/utils';
import { formatCurrency } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let stats, monthly;
  try {
    [stats, monthly] = await Promise.all([getDashboardStats(), getMonthlyStats()]);
  } catch {
    stats = { totalPaid: 0, totalPending: 0, contributingLots: 0, totalActiveLots: 256, totalExpenses: 0, balance: 0 };
    monthly = [];
  }

  const pct = stats.totalActiveLots > 0
    ? Math.round((stats.contributingLots / stats.totalActiveLots) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-800 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-xl">🛣️</div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Asfalto Condomínio Ville</h1>
              <p className="text-brand-100 text-xs">Vencimento todo dia 10 · Mínimo R$ 20,00</p>
            </div>
          </div>
          <Link href="/login" className="bg-white text-brand-800 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Total arrecadado</p>
          <p className="text-5xl font-bold text-brand-700">{formatCurrency(stats.totalPaid)}</p>
          {stats.totalExpenses > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              Despesas: {formatCurrency(stats.totalExpenses)} · Saldo: {formatCurrency(stats.balance)}
            </p>
          )}
          {stats.totalPending > 0 && (
            <p className="text-yellow-600 text-sm mt-1">
              + {formatCurrency(stats.totalPending)} aguardando confirmação
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-700">{stats.contributingLots}</p>
            <p className="text-gray-500 text-sm mt-1">Lotes colaboraram</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-400">{stats.totalActiveLots - stats.contributingLots}</p>
            <p className="text-gray-500 text-sm mt-1">Lotes pendentes</p>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">Participação geral</span>
            <span className="text-sm font-bold text-brand-700">{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div className="bg-brand-600 h-4 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {stats.contributingLots} de {stats.totalActiveLots} lotes participando
          </p>
        </div>

        {monthly.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Arrecadação Mensal</h2>
            <div className="space-y-3">
              {monthly.slice(0, 4).map(m => (
                <div key={m.reference_month} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{formatMonth(m.reference_month)}</span>
                      <span className="text-sm font-bold text-brand-700">{formatCurrency(m.total_paid)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-brand-500 h-2 rounded-full"
                          style={{ width: `${stats.totalActiveLots > 0 ? Math.min(100, (m.contributing_lots / stats.totalActiveLots) * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{m.contributing_lots} lotes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <Link href="/prestacao" className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                Ver prestação de contas completa →
              </Link>
            </div>
          </div>
        )}

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
          <p className="text-brand-800 text-sm font-medium">
            Contribuição mínima de <strong>R$ 20,00</strong> até o <strong>dia 10</strong> de cada mês.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/login" className="btn-primary block text-center py-3">Acessar meu lote</Link>
          <Link href="/prestacao" className="btn-secondary block text-center py-3">Ver contas</Link>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        Condomínio Ville — Sistema de Arrecadação para Asfaltamento
      </footer>
    </div>
  );
}
