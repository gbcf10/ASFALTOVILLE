import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureInit } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface Params { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.type !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const lotId = parseInt(params.id, 10);
  const { ownerName, isEmpty, resetPassword } = await request.json();

  await ensureInit();

  if (resetPassword) {
    await sql`UPDATE lots SET owner_name = ${ownerName?.trim() || null}, is_empty = ${isEmpty ? 1 : 0}, password_hash = NULL WHERE id = ${lotId}`;
  } else {
    await sql`UPDATE lots SET owner_name = ${ownerName?.trim() || null}, is_empty = ${isEmpty ? 1 : 0} WHERE id = ${lotId}`;
  }

  return NextResponse.json({ ok: true });
}
