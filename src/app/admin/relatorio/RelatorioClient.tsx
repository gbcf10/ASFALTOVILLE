'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatMonth } from '@/lib/utils';

interface MonthData { month: string; paid: number; pending: number; isOk: boolean }
interface LotRow {
  id: number; display_id: string; owner_name: string | null;
  monthData: MonthData[]; totalPaid: number; overdueCount: number; currentMonthPaid: boolean;
}
interface MonthlyStats {
  reference_month: string; contributing_lots: number;
  total_paid: number; total_pending: number; total_expenses: number;
}
interface Stats { totalPaid: number; totalPending: number; totalExpenses: number; balance: number; contributingLots: number; totalActiveLots: number }
interface Expense { id: number; description: string; amount: number; category: string; expense_date: string; reference_month: string | null; notes: string | null }

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface Props {
  stats: Stats;
  monthly: MonthlyStats[];
  allMonths: string[];
  lotReport: LotRow[];
  expenses: Expense[];
  currentMonth: string;
  isOverdue: boolean;
}

export default function RelatorioClient({ stats, monthly, allMonths, lotReport, expenses, currentMonth, isOverdue }: Props) {
  const [view, setView] = useState<'resumo' | 'inadimplencia' | 'despesas'>('resumo');
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');

  const overdueTotal = lotReport.filter(l => l.overdueCount > 0).length;
  const overdueThisMonth = lotReport.filter(l => !l.currentMonthPaid).length;

  // Filter for inadimplencia tab
  const filteredLots = lotReport.filter(l => {
    const monthStatus = l.monthData.find(m => m.month === filterMonth);
    const isLate = !monthStatus?.isOk && (filterMonth < currentMonth || (filterMonth === currentMonth && isOverdue));
    if (view === 'inadimplencia' && !isLate) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.display_id.includes(q) && !(l.owner_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Relatório e Prestação de Contas</h1>
        <Link href="/prestacao" target="_blank"
          className="text-sm text-brand-600 hover:text-brand-800 font-medium border border-brand-300 px-3 py-1.5 rounded-lg">
          🌐 Ver pública
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Arrecadado</p>
          <p className="text-xl font-bold text-brand-700">{fmt(stats.totalPaid)}</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Despesas</p>
          <p className="text-xl font-bold text-red-600">{fmt(stats.totalExpenses)}</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Saldo</p>
          <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{fmt(stats.balance)}</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inadimplentes mês</p>
          <p className="text-xl font-bold text-red-600">{overdueThisMonth}</p>
          <p className="text-xs text-gray-400">{isOverdue ? 'após dia 10' : 'antes do dia 10'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['resumo', 'inadimplencia', 'despesas'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              view === t ? 'text-brand-700 border-b-2 border-brand-700' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t === 'resumo' && '📅 Mensal'}
            {t === 'inadimplencia' && `❌ Inadimplentes (${overdueTotal})`}
            {t === 'despesas' && '💰 Despesas'}
          </button>
        ))}
      </div>

      {/* RESUMO MENSAL */}
      {view === 'resumo' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 font-medium text-right">Arrecadado</th>
                  <th className="px-4 py-3 font-medium text-right">Lotes</th>
                  <th className="px-4 py-3 font-medium text-right">Despesas</th>
                  <th className="px-4 py-3 font-medium text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthly.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum dado ainda.</td></tr>
                ) : (
                  monthly.map(m => {
                    const resultado = m.total_paid - m.total_expenses;
                    return (
                      <tr key={m.reference_month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">{formatMonth(m.reference_month)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-700">{fmt(m.total_paid)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{m.contributing_lots}</td>
                        <td className="px-4 py-3 text-right text-red-600">{fmt(m.total_expenses)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${resultado >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                          {fmt(resultado)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {monthly.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">TOTAL</td>
                    <td className="px-4 py-3 text-right text-brand-700">{fmt(stats.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{stats.contributingLots}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(stats.totalExpenses)}</td>
                    <td className={`px-4 py-3 text-right ${stats.balance >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{fmt(stats.balance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* INADIMPLENTES */}
      {view === 'inadimplencia' && (
        <div className="space-y-4">
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                {allMonths.map(m => (
                  <option key={m} value={m}>{formatMonth(m)}{m === currentMonth ? ' (atual)' : ''}</option>
                ))}
              </select>
              <input className="input" placeholder="Buscar por lote ou nome..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {filteredLots.length} lote(s) sem pagamento em {formatMonth(filterMonth)}
              {filterMonth === currentMonth && !isOverdue && ' (mês ainda não vencido)'}
            </p>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Lote</th>
                    <th className="px-4 py-3 font-medium">Proprietário</th>
                    <th className="px-4 py-3 font-medium text-right">Total pago</th>
                    <th className="px-4 py-3 font-medium text-center">Meses atraso</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLots.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum lote em atraso neste mês. ✓</td></tr>
                  ) : (
                    filteredLots.map(l => {
                      const monthStatus = l.monthData.find(m => m.month === filterMonth);
                      return (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-bold text-gray-700">{l.display_id}</td>
                          <td className="px-4 py-3 max-w-[140px]">
                            <span className={l.owner_name ? 'text-gray-700' : 'text-gray-400 italic'}>
                              {l.owner_name || 'Sem nome'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-700">
                            {l.totalPaid > 0 ? fmt(l.totalPaid) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {l.overdueCount > 0 ? (
                              <span className="badge-pendente">{l.overdueCount} {l.overdueCount === 1 ? 'mês' : 'meses'}</span>
                            ) : <span className="badge-pago">Em dia</span>}
                          </td>
                          <td className="px-4 py-3">
                            {monthStatus?.isOk ? (
                              <span className="badge-pago">✓ Pago</span>
                            ) : monthStatus?.pending && monthStatus.pending > 0 ? (
                              <span className="badge-pendente">Pendente {fmt(monthStatus.pending)}</span>
                            ) : (
                              <span className="text-red-600 text-xs font-medium">Não pago</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DESPESAS */}
      {view === 'despesas' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Mês ref.</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma despesa ainda.</td></tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{e.description}</p>
                        {e.notes && <p className="text-xs text-gray-400 italic">{e.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.reference_month ? formatMonth(e.reference_month) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{e.category}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(e.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {expenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-bold text-gray-700">TOTAL DESPESAS</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
