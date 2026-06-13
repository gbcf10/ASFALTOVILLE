'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Lot, Donation, MonthlyLotStatus } from '@/lib/db';

const PixQRCode = dynamic(() => import('@/components/PixQRCode'), { ssr: false });

interface Props {
  lot: Lot;
  donations: Donation[];
  monthlyStatus: MonthlyLotStatus[];
  totalPaid: number;
  currentMonth: string;
  dayOfMonth: number;
  isOverdue: boolean;
  paidThisMonth: boolean;
  isAdmin: boolean;
  pixKey: string;
  pixBeneficiary: string;
  pixCity: string;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtMonth(yyyyMm: string) {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [year, month] = yyyyMm.split('-');
  return `${months[parseInt(month) - 1]}/${year}`;
}

// Generate list of months from a start month to current
function getMonthRange(monthlyStatus: MonthlyLotStatus[], currentMonth: string): string[] {
  const months = new Set<string>([currentMonth, ...monthlyStatus.map(m => m.reference_month)]);
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

// Generate selectable months for the donation form (current + up to 3 previous)
function getSelectableMonths(currentMonth: string): Array<{ value: string; label: string }> {
  const result = [];
  const [year, month] = currentMonth.split('-').map(Number);
  for (let i = 0; i < 4; i++) {
    let m = month - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    const val = `${y}-${String(m).padStart(2, '0')}`;
    result.push({ value: val, label: fmtMonth(val) + (i === 0 ? ' (atual)' : '') });
  }
  return result;
}

export default function LotDashboard({
  lot, donations, monthlyStatus, totalPaid, currentMonth,
  dayOfMonth, isOverdue, paidThisMonth, isAdmin, pixKey, pixBeneficiary, pixCity,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'form' | 'pix' | 'success'>('form');
  const [method, setMethod] = useState<'pix' | 'dinheiro'>('pix');
  const [amount, setAmount] = useState('');
  const [refMonth, setRefMonth] = useState(currentMonth);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'historico'>('resumo');

  const selectableMonths = getSelectableMonths(currentMonth);
  const allMonths = getMonthRange(monthlyStatus, currentMonth);
  const statusMap = new Map(monthlyStatus.map(m => [m.reference_month, m]));

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  async function submitDonation() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: lot.id,
          donorName: lot.owner_name || `Lote ${lot.display_id}`,
          amount: parseFloat(amount),
          paymentMethod: method,
          referenceMonth: refMonth,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao registrar'); return; }
      router.refresh();
      setStep(method === 'pix' ? 'pix' : 'success');
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setStep('form');
    setAmount('');
    setNotes('');
    setError('');
    setMethod('pix');
    setRefMonth(currentMonth);
  }

  // Current month status banner
  const overdueMonths = allMonths.filter(m => {
    if (m === currentMonth && !isOverdue) return false;
    const s = statusMap.get(m);
    return !s || !s.is_paid;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-800 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-sm font-bold">
              {lot.display_id}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{lot.owner_name || `Lote ${lot.display_id}`}</p>
              <p className="text-brand-300 text-xs">Lote {lot.display_id} · Condomínio Ville</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="text-xs bg-yellow-500 text-yellow-900 font-semibold px-3 py-1.5 rounded-lg">Admin</Link>
            )}
            <button onClick={handleLogout} className="text-xs text-brand-300 hover:text-white transition-colors px-2 py-1.5">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Status do mês atual */}
        {isOverdue && !paidThisMonth ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-red-800">Contribuição em atraso!</p>
                <p className="text-red-600 text-sm mt-0.5">
                  O vencimento de {fmtMonth(currentMonth)} foi no dia 10. Regularize agora.
                </p>
              </div>
            </div>
          </div>
        ) : !paidThisMonth ? (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-bold text-yellow-800">Vencimento: dia 10 de cada mês</p>
                <p className="text-yellow-600 text-sm mt-0.5">
                  Você ainda não contribuiu em {fmtMonth(currentMonth)}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-green-800">Em dia em {fmtMonth(currentMonth)}!</p>
                <p className="text-green-600 text-sm mt-0.5">
                  Você contribuiu {fmt(statusMap.get(currentMonth)?.total_paid ?? 0)} este mês.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Total card */}
        <div className="card text-center py-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total acumulado contribuído</p>
          <p className={`text-4xl font-bold ${totalPaid > 0 ? 'text-brand-700' : 'text-gray-300'}`}>
            {fmt(totalPaid)}
          </p>
          {overdueMonths.length > 0 && (
            <p className="text-red-500 text-xs mt-2">
              {overdueMonths.length} {overdueMonths.length === 1 ? 'mês em atraso' : 'meses em atraso'}
            </p>
          )}
        </div>

        {/* Nova contribuição */}
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
        >
          <span className="text-xl font-light">+</span> Nova Contribuição
        </button>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['resumo', 'historico'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab ? 'text-brand-700 border-b-2 border-brand-700' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab === 'resumo' ? '📅 Mensalidades' : '📋 Histórico'}
            </button>
          ))}
        </div>

        {/* Tab: Monthly summary */}
        {activeTab === 'resumo' && (
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Status por Mês <span className="text-gray-400 font-normal text-sm">(vencimento todo dia 10)</span></h2>
            {allMonths.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">Nenhuma contribuição registrada ainda.</p>
                <p className="text-gray-300 text-xs mt-1">Comece contribuindo agora!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allMonths.map(m => {
                  const s = statusMap.get(m);
                  const paid = s?.is_paid ?? false;
                  const isCurrent = m === currentMonth;
                  const isPastDue = !isCurrent || isOverdue;
                  const late = isPastDue && !paid;
                  return (
                    <div key={m} className={`flex items-center justify-between p-3 rounded-lg ${
                      paid ? 'bg-green-50' : late ? 'bg-red-50' : 'bg-yellow-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{paid ? '✅' : late ? '❌' : '⏳'}</span>
                        <div>
                          <p className={`text-sm font-semibold ${paid ? 'text-green-800' : late ? 'text-red-800' : 'text-yellow-800'}`}>
                            {fmtMonth(m)}
                            {isCurrent && <span className="ml-1 text-xs font-normal opacity-70">(atual)</span>}
                          </p>
                          <p className={`text-xs ${paid ? 'text-green-600' : late ? 'text-red-600' : 'text-yellow-600'}`}>
                            {paid ? `Pago: ${fmt(s!.total_paid)}` : late ? 'Em atraso' : 'Aguardando (vence dia 10)'}
                            {s?.total_pending && s.total_pending > 0 ? ` · ${fmt(s.total_pending)} pendente` : ''}
                          </p>
                        </div>
                      </div>
                      {!paid && (
                        <button
                          onClick={() => { setRefMonth(m); setShowModal(true); }}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-800 border border-brand-300 px-3 py-1.5 rounded-lg"
                        >
                          Pagar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Full history */}
        {activeTab === 'historico' && (
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Histórico Completo</h2>
            {donations.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhuma contribuição ainda.</p>
            ) : (
              <div className="space-y-3">
                {donations.map(d => (
                  <div key={d.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{fmt(d.amount)}</span>
                        <span className={d.payment_method === 'pix' ? 'badge-pix' : 'badge-dinheiro'}>
                          {d.payment_method === 'pix' ? '💠 PIX' : '💵 Dinheiro'}
                        </span>
                        <span className={d.status === 'pago' ? 'badge-pago' : 'badge-pendente'}>
                          {d.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                        </span>
                      </div>
                    </div>
                    {d.reference_month && (
                      <p className="text-brand-600 text-xs mt-1 font-medium">Ref: {fmtMonth(d.reference_month)}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-0.5">{fmtDate(d.created_at)}</p>
                    {d.notes && <p className="text-gray-500 text-xs italic mt-0.5">{d.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="text-center space-y-2">
          <Link href="/prestacao" className="text-sm text-brand-600 hover:text-brand-800 font-medium block">
            📊 Ver prestação de contas do condomínio
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 block">← Página inicial</Link>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-800">
                {step === 'form' && 'Nova Contribuição'}
                {step === 'pix' && 'Pagar via PIX'}
                {step === 'success' && '✓ Registrado!'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>

            <div className="p-5">
              {step === 'form' && (
                <div className="space-y-4">
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mês de referência</label>
                    <select className="input" value={refMonth} onChange={e => setRefMonth(e.target.value)}>
                      {selectableMonths.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Valor <span className="text-gray-400 font-normal">(mínimo R$ 20,00)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                      <input
                        className="input pl-9 text-lg font-semibold"
                        type="number" min="20" step="0.01"
                        value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="20,00" autoFocus
                      />
                    </div>
                    {amount && parseFloat(amount) < 20 && (
                      <p className="text-red-500 text-xs mt-1">Valor mínimo: R$ 20,00</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Forma de pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['pix', 'dinheiro'] as const).map(m => (
                        <button key={m} type="button" onClick={() => setMethod(m)}
                          className={`py-4 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${
                            method === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}>
                          <span className="text-2xl">{m === 'pix' ? '💠' : '💵'}</span>
                          {m === 'pix' ? 'PIX' : 'Dinheiro'}
                          <span className="text-xs font-normal opacity-70">{m === 'pix' ? 'Confirmado na hora' : 'Síndico confirma'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: pagando dois meses..." />
                  </div>

                  <button onClick={submitDonation} disabled={loading || !amount || parseFloat(amount) < 20} className="btn-primary w-full py-3 text-base">
                    {loading ? 'Registrando...' : method === 'pix' ? 'Gerar QR Code PIX →' : 'Registrar →'}
                  </button>
                </div>
              )}

              {step === 'pix' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-green-800 font-semibold text-sm">✓ Contribuição de {fmt(parseFloat(amount))} registrada para {fmtMonth(refMonth)}!</p>
                    <p className="text-green-600 text-xs mt-0.5">Realize o PIX abaixo para concluir.</p>
                  </div>
                  <PixQRCode pixKey={pixKey} merchantName={pixBeneficiary} merchantCity={pixCity} amount={parseFloat(amount)} />
                  <button onClick={closeModal} className="btn-primary w-full py-3">Pronto, fiz o PIX ✓</button>
                  <p className="text-xs text-gray-400 text-center">Escaneie o QR Code com o app do seu banco ou copie o código PIX.</p>
                </div>
              )}

              {step === 'success' && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-3xl mx-auto">💵</div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">Registrado!</p>
                    <p className="text-gray-500 text-sm mt-1">Aguarde o síndico confirmar o recebimento.</p>
                  </div>
                  <button onClick={closeModal} className="btn-primary w-full">Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
