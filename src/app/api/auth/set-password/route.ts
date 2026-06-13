import { NextRequest, NextResponse } from 'next/server';
import { sql, hashPassword, ensureInit } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { lotId, password, ownerName } = await request.json();
  if (!lotId || !password || !ownerName) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres' }, { status: 400 });

  try {
    await ensureInit();
    const rows = await sql`SELECT id, display_id, password_hash, is_empty FROM lots WHERE id = ${lotId}`;
    const lot = rows[0] as { id: number; display_id: string; password_hash: string | null; is_empty: number } | undefined;

    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    if (lot.is_empty) return NextResponse.json({ error: 'Lote vazio' }, { status: 403 });
    if (lot.password_hash) return NextResponse.json({ error: 'Este lote já possui senha cadastrada. Use o login normal.' }, { status: 409 });

    const hash = hashPassword(password);
    await sql`UPDATE lots SET password_hash = ${hash}, owner_name = ${ownerName.trim()} WHERE id = ${lot.id}`;

    const token = await signToken({ type: 'lot', id: lot.id, displayId: lot.display_id, name: ownerName.trim(), role: 'lot' });
    const cookieStore = await cookies();
    cookieStore.set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });

    return NextResponse.json({ ok: true, lotId: lot.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
