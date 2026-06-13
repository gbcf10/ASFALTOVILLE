import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminNav from './AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.type !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav name={session.name || ''} role={session.role} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
