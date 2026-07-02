'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LotRow {
  id: number; display_id: string;
  owner_name: string | null; password_hash: string | null; is_empty: number;
  total_paid: number; total_pending: number; donation_count: number;
}

interface DonationRow {
  id: number;
  donor_name: string;
  amount: number;
  payment_method: string;
  status: string;
  reference_month: string | null;
  notes: string | null;
  created_at: string;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function LotesClient({ lots }: { lots: LotRow[] }) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editLot, setEditLot] = useState<LotRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmpty, setEditEmpty] = useState(false);
  const [resetPwd, setResetPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Contribuições do lote sendo editado
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [donationSaving, setDonationSaving] = useState<number | null>(null);

  const filtered = lots.filter(l => {
    if (filterStatus === 'pago' && l.total_paid === 0) return false;
    if (filterStatus === 'pendente' && (l.total_paid > 0 || l.is_empty)) return false;
    if (filterStatus === 'sem-senha' && l.password_hash) return false;
    if (filterStatus === 'vazio' && !l.is_empty) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.display_id.includes(q) && !(l.owner_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPaid = lots.filter(l => l.total_paid > 0).length;
  const totalEmpty = lots.filter(l => l.is_empty).length;
  const totalSemSenha = lots.filter(l => !l.password_hash && !l.is_empty).length;

  async function openEdit(l: LotRow) {
    setEditLot(l);
    setEditName(l.owner_name || '');
    setEditEmpty(l.is_empty === 1);
    setResetPwd(false);
    setDonations([]);
    setLoadingDonations(true);
    try {
      const res = await fetch(`/api/lots/${l.id}/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setDonations(data.donations || []);
      }
    } finally {
      setLoadingDonations(false);
    }
  }

  async function saveEdit() {
    if (!editLot) return;
    setSaving(true);
    await fetch(`/api/lots/${editLot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: editName, isEmpty: editEmpty, resetPassword: resetPwd }),
    });
    setSaving(false);
    setEditLot(null);
    router.refresh();
  }

  async function updateDonationStatus(donationId: number, status: 'pago' | 'pendente') {
    setDonationSaving(donationId);
    try {
      const res = await fetch(`/api/donations/${donationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDonations(prev => prev.map(d => d.id === donationId ? { ...d, status } : d));
        router.refresh();
      }
    } finally {
      setDonationSaving(null);
    }
  }

  async function deleteDonation(donationId: number) {
    if (!confirm('Excluir esta contribuição? Essa ação não pode ser desfeita.')) return;
    setDonationSaving(donationId);
    try {
      const res = await fetch(`/api/donations/${donationId}`, { method: 'DELETE' });
      if (res.ok) {
        setDonations(prev => prev.filter(d => d.id !== donationId));
        router.refresh();
      }
    } finally {
      setDonationSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Lotes</h1>
        <div className="text-sm text-gray-500">
          {totalPaid} colaboraram · {totalSemSenha} sem senha · {totalEmpty} vazios · {lots.length} total
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Buscar por número ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="pago">Colaboraram</option>
            <option value="pendente">Pendentes</option>
            <option value="sem-senha">Sem senha criada</option>
            <option value="vazio">Vazios</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Lote</th>
                <th className="px-4 py-3 font-medium">Proprietário</th>
                <th className="px-4 py-3 font-medium">Acesso</th>
                <th className="px-4 py-3 font-medium text-right">Pago</th>
                <th className="px-4 py-3 font-medium text-right">Pendente</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(l => (
                <tr key={l.id} className={`hover:bg-gray-50 ${l.is_empty ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 font-mono font-bold text-gray-700">{l.display_id}</td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <span className={l.owner_name ? 'text-gray-700' : 'text-gray-400 italic'}>
                      {l.owner_name || 'Sem nome'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!l.password_hash ? (
                      <span className="text-xs text-orange-500 font-medium">Sem senha</span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓ Cadastrado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700">
                    {l.total_paid > 0 ? fmt(l.total_paid) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-600">
                    {l.total_pending > 0 ? fmt(l.total_pending) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {l.is_empty ? (
                      <span className="badge-pendente">Vazio</span>
                    ) : l.total_paid > 0 ? (
                      <span className="badge-pago">✓ Colaborou</span>
                    ) : (
                      <span className="badge-pendente">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(l)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Editar
                      </button>
                      <Link href={`/lote/${l.id}`} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Ver</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">Nenhum lote encontrado.</p>
          )}
        </div>
      </div>

      {editLot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">Lote {editLot.display_id}</h3>
              <button onClick={() => setEditLot(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do proprietário</label>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome completo" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editEmpty} onChange={e => setEditEmpty(e.target.checked)} className="w-4 h-4 text-brand-600" />
                <span className="text-sm text-gray-700">Lote vazio (sem morador)</span>
              </label>
              {editLot.password_hash && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={resetPwd} onChange={e => setResetPwd(e.target.checked)} className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-700">Resetar senha (morador precisará criar nova)</span>
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar dados do lote'}</button>
                <button onClick={() => setEditLot(null)} className="btn-secondary flex-1">Cancelar</button>
              </div>

              {/* Contribuições do lote */}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-gray-800 text-sm mb-3">Contribuições registradas</h4>
                {loadingDonations ? (
                  <p className="text-gray-400 text-sm">Carregando...</p>
                ) : donations.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhuma contribuição registrada para este lote.</p>
                ) : (
                  <div className="space-y-2">
                    {donations.map(d => (
                      <div key={d.id} className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">
                            {fmt(d.amount)} <span className="text-gray-400 font-normal">· {d.payment_method === 'pix' ? 'PIX' : 'Dinheiro'}</span>
                          </p>
                          <p className="text-gray-400 text-xs">
                            {d.reference_month ? `Ref: ${d.reference_month}` : ''} {d.notes ? `· ${d.notes}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                            value={d.status}
                            disabled={donationSaving === d.id}
                            onChange={e => updateDonationStatus(d.id, e.target.value as 'pago' | 'pendente')}
                          >
                            <option value="pago">Pago</option>
                            <option value="pendente">Pendente</option>
                          </select>
                          <button
                            onClick={() => deleteDonation(d.id)}
                            disabled={donationSaving === d.id}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
