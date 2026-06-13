'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Donation {
  id: number; lot_id: number; donor_name: string; amount: number;
  payment_method: string; notes: string | null; created_at: string;
  display_id: string; owner_name: string | null;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function AdminConfirmCard({ donation: d }: { donation: Donation }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    await fetch(`/api/donations/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pago' }),
    });
    setLoading(false);
    router.refresh();
  }

  async function reject() {
    if (!window.confirm('Rejeitar esta contribuição?')) return;
    setLoading(true);
    await fetch(`/api/donations/${d.id}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-xl gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-gray-700">Lote {d.display_id}</span>
          <span className="font-semibold text-gray-800">{formatCurrency(d.amount)}</span>
          <span className="badge-dinheiro">💵 Dinheiro</span>
        </div>
        <p className="text-gray-600 text-xs mt-0.5 truncate">{d.owner_name || d.donor_name}</p>
        {d.notes && <p className="text-gray-400 text-xs italic truncate">{d.notes}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={confirm} disabled={loading} className="btn-success text-xs py-1.5 px-3">✓</button>
        <button onClick={reject} disabled={loading} className="btn-danger text-xs py-1.5 px-3">✕</button>
      </div>
    </div>
  );
}
