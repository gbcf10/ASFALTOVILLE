import { getMonthlyStats, getDashboardStats, formatMonth, getDb } from '@/lib/db';
import { formatCurrency } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PrestacaoPage() {
  const stats = getDashboardStats();
  const monthly = getMonthlyStats();
  const db = getDb();

  const allExpenses = db.prepare(`SELECT * FROM expenses ORDER BY expense_date DESC`).all() as Array<{
    id: number; description: string; amount: number; category: string;
    expense_date: string; reference_month: string | null; notes: string | null;
  }>;

  let runningBalance = 0;
  const monthlyWithBalance = [...monthly].reverse().map(m => {
    runningBalance += m.total_paid - m.total_expenses;
    return { ...m, running_balance: runningBalance };
  }).reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-800 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-xl">📊</div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Prestação de Contas</h1>
              <p className="text-brand-200 text-xs">Condomínio Ville — Asfaltamento</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-brand-200 hover:text-white">← Início</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Resumo geral */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Arrecadado</p>
            <p className="text-xl font-bold text-brand-700">{formatCurrency(stats.totalPaid)}</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Despesas</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Saldo</p>
            <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
              {formatCurrency(stats.balance)}
            </p>
          </div>
        </div>

        {stats.totalPending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-yellow-700 text-sm">
              ⏳ Mais <strong>{formatCurrency(stats.totalPending)}</strong> aguardando confirmação (dinheiro em mãos).
            </p>
          </div>
        )}

        {/* Por mês */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-5 text-lg">Arrecadação e Gastos por Mês</h2>
          {monthlyWithBalance.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum dado registrado ainda.</p>
          ) : (
            <div className="space-y-4">
              {monthlyWithBalance.map(m => (
                <div key={m.reference_month} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-gray-700">{formatMonth(m.reference_month)}</h3>
                    <span className={`text-sm font-bold ${m.running_balance >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                      Saldo acum.: {formatCurrency(m.running_balance)}
                    </span>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Arrecadado</p>
                      <p className="font-bold text-brand-700">{formatCurrency(m.total_paid)}</p>
                      <p className="text-xs text-gray-400">{m.contributing_lots} lotes</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Despesas</p>
                      <p className="font-bold text-red-600">{formatCurrency(m.total_expenses)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Resultado</p>
                      <p className={`font-bold ${m.total_paid - m.total_expenses >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                        {formatCurrency(m.total_paid - m.total_expenses)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Todas as despesas */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">Gastos Realizados com a Obra</h2>
          {allExpenses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Nenhum gasto registrado ainda.</p>
              <p className="text-gray-300 text-xs mt-1">Os gastos aparecerão aqui conforme forem sendo realizados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allExpenses.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{e.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {e.reference_month && (
                        <span className="text-xs text-brand-600">{formatMonth(e.reference_month)}</span>
                      )}
                      <span className="text-xs text-gray-400 capitalize bg-gray-200 px-2 py-0.5 rounded-full">{e.category}</span>
                    </div>
                    {e.notes && <p className="text-xs text-gray-400 italic mt-0.5">{e.notes}</p>}
                  </div>
                  <span className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(e.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 font-bold">
                <span className="text-gray-700">Total gasto</span>
                <span className="text-red-600">{formatCurrency(allExpenses.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center text-sm text-brand-700">
          <p>Esta prestação de contas é atualizada automaticamente pelo sistema.</p>
          <p className="text-brand-500 text-xs mt-1">Contribuições mínimas de R$ 20,00 até o dia 10 de cada mês.</p>
        </div>
      </main>
    </div>
  );
}
