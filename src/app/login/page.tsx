'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tab = 'lote' | 'admin';
type Step = 'enter-lot' | 'first-access' | 'enter-password';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('lote');
  const [step, setStep] = useState<Step>('enter-lot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lot flow
  const [lotNumber, setLotNumber] = useState('');
  const [lotId, setLotId] = useState<number | null>(null);
  const [displayId, setDisplayId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Admin flow
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });

  function normalizeLot(raw: string): string {
    const n = parseInt(raw.replace(/\D/g, ''), 10);
    if (isNaN(n) || n < 1 || n > 256) return '';
    return String(n).padStart(3, '0');
  }

  async function handleCheckLot(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeLot(lotNumber);
    if (!normalized) {
      setError('Número inválido. Digite de 1 a 256.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/check-lot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId: normalized }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lote não encontrado'); return; }

      setLotId(data.lotId);
      setDisplayId(data.displayId);

      if (data.firstAccess) {
        setStep('first-access');
      } else {
        setStep('enter-password');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFirstAccess(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (!ownerName.trim()) { setError('Informe seu nome.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId, password: newPassword, ownerName: ownerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao criar senha'); return; }
      router.push(`/lote/${lotId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lot', lotId, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Senha incorreta'); return; }
      router.push(`/lote/${lotId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'admin', ...adminForm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Credenciais inválidas'); return; }
      router.push('/admin');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function resetLot() {
    setStep('enter-lot');
    setLotNumber('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOwnerName('');
    setError('');
    setLotId(null);
    setDisplayId('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-asphalt-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🛣️</div>
          <h1 className="text-2xl font-bold text-white">Asfalto Condomínio Ville</h1>
          <p className="text-brand-300 text-sm mt-1">Acesse sua área</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setTab('lote'); setError(''); resetLot(); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === 'lote' ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🏠 Acesso por Lote
            </button>
            <button
              onClick={() => { setTab('admin'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === 'admin' ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🔑 Administração
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            {tab === 'lote' && (
              <>
                {/* STEP 1: Enter lot number */}
                {step === 'enter-lot' && (
                  <form onSubmit={handleCheckLot} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Número do seu lote</label>
                      <input
                        className="input text-center text-2xl font-bold tracking-widest"
                        placeholder="Ex: 42"
                        value={lotNumber}
                        onChange={e => setLotNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        inputMode="numeric"
                        maxLength={3}
                        required
                        autoFocus
                      />
                      <p className="text-xs text-gray-400 mt-1 text-center">Lotes de 1 a 256</p>
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={loading || !lotNumber}>
                      {loading ? 'Verificando...' : 'Continuar →'}
                    </button>
                  </form>
                )}

                {/* STEP 2a: First access — create password */}
                {step === 'first-access' && (
                  <form onSubmit={handleFirstAccess} className="space-y-4">
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-center mb-2">
                      <p className="text-brand-800 font-semibold text-sm">Lote {displayId} — Primeiro acesso</p>
                      <p className="text-brand-600 text-xs mt-0.5">Crie sua senha para acessar.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Seu nome completo</label>
                      <input
                        className="input"
                        placeholder="Nome completo"
                        value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Criar senha (mín. 6 caracteres)</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Crie uma senha"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={loading || !newPassword || !confirmPassword || !ownerName}
                    >
                      {loading ? 'Criando...' : 'Criar senha e entrar'}
                    </button>
                    <button type="button" onClick={resetLot} className="w-full text-sm text-gray-400 hover:text-gray-600 text-center mt-1">
                      ← Voltar
                    </button>
                  </form>
                )}

                {/* STEP 2b: Returning user — enter password */}
                {step === 'enter-password' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center mb-2">
                      <p className="text-gray-700 font-semibold text-sm">Lote {displayId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Sua senha</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoFocus
                        autoComplete="current-password"
                      />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={loading || !password}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                    <button type="button" onClick={resetLot} className="w-full text-sm text-gray-400 hover:text-gray-600 text-center">
                      ← Trocar lote
                    </button>
                  </form>
                )}
              </>
            )}

            {tab === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuário</label>
                  <input
                    className="input"
                    placeholder="sindico ou admin"
                    value={adminForm.username}
                    onChange={e => setAdminForm(f => ({ ...f, username: e.target.value }))}
                    required
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Senha administrativa"
                    value={adminForm.password}
                    onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Acessar painel'}
                </button>
              </form>
            )}

            <div className="mt-5 text-center">
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Voltar ao início</Link>
            </div>
          </div>
        </div>

        <p className="text-center text-brand-400 text-xs mt-5">
          Esqueceu a senha? Fale com o síndico.
        </p>
      </div>
    </div>
  );
}
