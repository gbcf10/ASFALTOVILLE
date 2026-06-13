import { NextRequest, NextResponse } from 'next/server';
import { sql, hashPassword, ensureInit } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { name, currentPassword, newPassword } = await request.json();

  await ensureInit();
  const rows = await sql`SELECT * FROM admins WHERE id = ${session.id}`;
  const admin = rows[0] as { id: number; name: string; password_hash: string; username: string; role: string } | undefined;

  if (!admin) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });

  if (currentPassword) {
    if (hashPassword(currentPassword) !== admin.password_hash) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: 'Nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    await sql`UPDATE admins SET password_hash=${hashPassword(newPassword)} WHERE id=${admin.id}`;
  }

  if (name?.trim()) {
    await sql`UPDATE admins SET name=${name.trim()} WHERE id=${admin.id}`;
  }

  return NextResponse.json({ ok: true });
}
