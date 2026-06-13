'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Expense {
  id: number; description: string; amount: number; category: string;
  expense_date: string; notes: string | null; created_at: string;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const CATEGORIES = ['geral', 'material', 'mão de obra', 'equipamento', 'administrativo', 'outro'];

const emptyForm = () => ({
  description: '', amount: '', category: 'geral',
  expense_date: new Date().toISOString().split('T')[0], notes: '',
});

export default function DespesasClient({ expenses, total }: { expenses: Expense[]; total: number }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditingId(e.id);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      expense_date: e.expense_date,
      notes: e.notes || '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (editingId !== null) {
      await fetch(`/api/expenses/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setLoading(false);
    closeForm();
    router.refresh();
  }

  async function deleteExpense(id: number) {
    if (!window.confirm('Excluir esta despesa?')) return;
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Despesas</h1>
        <button onClick={openNew} className="btn-primary">+ Nova Despesa</button>
      </div>

      <div className="card text-center py-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total de Despesas</p>
        <p className="text-4xl font-bold text-red-600">{fmt(total)}</p>
      </div>

      {/* Form modal (add or edit) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">{editingId ? 'Editar Despesa' : 'Nova Despesa'}</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição / Material</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Compra de brita, areia, mão de obra..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor gasto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                    <input
                      className="input pl-9"
                      type="number" min="0.01" step="0.01"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                  <input
                    className="input" type="date"
                    value={form.expense_date}
                    onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
                <input
                  className="input"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Quantidade, fornecedor, detalhes... (opcional)"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar'}
                </button>
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden p-0">
        {expenses.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">Nenhuma despesa registrada ainda.</p>
            <p className="text-gray-300 text-xs mt-1">Clique em &ldquo;+ Nova Despesa&rdquo; para registrar um gasto.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Descrição / Material</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{e.description}</p>
                      {e.notes && <p className="text-xs text-gray-400 italic mt-0.5">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{e.category}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(e.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEdit(e)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Editar
                        </button>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => deleteExpense(e.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
