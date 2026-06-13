'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [nameForm, setNameForm] = useState({ name: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [nameMsg, setNameMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

  async function handleName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameForm.name.trim()) return;
    setNameSaving(true);
    setNameMsg('');
    const res = await fetch('/api/admin/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameForm.name }),
    });
    setNameSaving(false);
    if (res.ok) {
      setNameMsg('success:Nome atualizado com sucesso!');
      setNameForm({ name: '' });
      router.refresh();
    } else {
      const d = await res.json();
      setNameMsg('error:' + (d.error || 'Erro ao salvar'));
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg('');
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassMsg('error:As senhas não coincidem');
      return;
    }
    if (passForm.newPassword.length < 6) {
      setPassMsg('error:A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setPassSaving(true);
    const res = await fetch('/api/admin/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword }),
    });
    setPassSaving(false);
    if (res.ok) {
      setPassMsg('success:Senha alterada com sucesso!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      const d = await res.json();
      setPassMsg('error:' + (d.error || 'Erro ao alterar senha'));
    }
  }

  function msgBox(msg: string) {
    if (!msg) return null;
    const [type, text] = msg.split(':', 2) as [string, string];
    const isOk = type === 'success';
    return (
      <p className={`text-sm mt-2 px-3 py-2 rounded-lg font-medium ${isOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {isOk ? '✓ ' : '⚠ '}{text}
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações da Conta</h1>
        <p className="text-gray-500 text-sm mt-1">Altere seu nome de exibição ou sua senha de acesso.</p>
      </div>

      {/* Change name */}
      <div className="card space-y-4">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Nome de exibição</h2>
          <p className="text-gray-400 text-sm">É o nome que aparece no topo do painel administrativo.</p>
        </div>
        <form onSubmit={handleName} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Novo nome</label>
            <input
              className="input"
              placeholder="Ex: Gabriel Ferraz, Síndico Elton..."
              value={nameForm.name}
              onChange={e => setNameForm({ name: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={nameSaving} className="btn-primary w-full">
            {nameSaving ? 'Salvando...' : 'Atualizar nome'}
          </button>
          {msgBox(nameMsg)}
        </form>
      </div>

      {/* Change password */}
      <div className="card space-y-4">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Alterar senha</h2>
          <p className="text-gray-400 text-sm">Mínimo de 6 caracteres.</p>
        </div>
        <form onSubmit={handlePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha atual</label>
            <input
              className="input" type="password"
              placeholder="Sua senha atual"
              value={passForm.currentPassword}
              onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
            <input
              className="input" type="password"
              placeholder="Mínimo 6 caracteres"
              value={passForm.newPassword}
              onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar nova senha</label>
            <input
              className="input" type="password"
              placeholder="Repita a nova senha"
              value={passForm.confirmPassword}
              onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
          </div>
          <button type="submit" disabled={passSaving} className="btn-primary w-full">
            {passSaving ? 'Alterando...' : 'Alterar senha'}
          </button>
          {msgBox(passMsg)}
        </form>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <p className="font-semibold mb-1">Credenciais iniciais</p>
        <p>Síndico: <code className="bg-yellow-100 px-1 rounded">sindico</code> / senha: <code className="bg-yellow-100 px-1 rounded">Sindico@2024</code></p>
        <p>Admin: <code className="bg-yellow-100 px-1 rounded">admin</code> / senha: <code className="bg-yellow-100 px-1 rounded">Admin@2024</code></p>
        <p className="text-xs text-yellow-600 mt-2">Altere as senhas acima o quanto antes.</p>
      </div>
    </div>
  );
}
