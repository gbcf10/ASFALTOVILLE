'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Props { name: string; role: string }

export default function AdminNav({ name, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const links = [
    { href: '/admin', label: '📊 Painel', exact: true },
    { href: '/admin/lotes', label: '🏘️ Lotes', exact: false },
    { href: '/admin/relatorio', label: '📋 Relatório', exact: false },
    { href: '/admin/despesas', label: '💰 Despesas', exact: false },
    { href: '/admin/configuracoes', label: '⚙️ Conta', exact: false },
  ];

  return (
    <header className="bg-asphalt-900 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-base">🛣️</div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Administração</p>
              <p className="text-sm font-bold text-white leading-tight">Asfalto Ville</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-white font-medium">{name}</p>
              <p className="text-xs text-gray-400">{role === 'superadmin' ? 'Super Admin' : 'Síndico'}</p>
            </div>
            <button onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">
              Sair
            </button>
          </div>
        </div>
        <nav className="flex gap-1 py-2 overflow-x-auto">
          {links.map(l => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-brand-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}>
                {l.label}
              </Link>
            );
          })}
          <Link href="/" className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ml-auto">
            🌐 Site
          </Link>
        </nav>
      </div>
    </header>
  );
}
