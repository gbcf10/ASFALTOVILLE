import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { name, currentPassword, newPassword } = body;
  const db = getDb();

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(session.id) as {
    id: number; name: string; password_hash: string; username: string; role: string;
  } | undefined;

  if (!admin) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });

  if (currentPassword) {
    const hash = hashPassword(currentPassword);
    if (hash !== admin.password_hash) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }
    db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hashPassword(newPassword), admin.id);
  }

  if (name && name.trim()) {
    db.prepare('UPDATE admins SET name=? WHERE id=?').run(name.trim(), admin.id);
  }

  return NextResponse.json({ ok: true });
}
