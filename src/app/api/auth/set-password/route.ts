import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { lotId, password, ownerName } = await request.json();
  if (!lotId || !password || !ownerName) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres' }, { status: 400 });
  }

  try {
    const db = getDb();
    const lot = db.prepare('SELECT id, display_id, password_hash, is_empty FROM lots WHERE id = ?').get(lotId) as {
      id: number; display_id: string; password_hash: string | null; is_empty: number;
    } | null;

    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    if (lot.is_empty) return NextResponse.json({ error: 'Lote vazio' }, { status: 403 });
    if (lot.password_hash) {
      return NextResponse.json({ error: 'Este lote já possui senha cadastrada. Use o login normal.' }, { status: 409 });
    }

    const hash = hashPassword(password);
    db.prepare('UPDATE lots SET password_hash = ?, owner_name = ? WHERE id = ?').run(hash, ownerName.trim(), lotId);

    const token = await signToken({
      type: 'lot',
      id: lot.id,
      displayId: lot.display_id,
      name: ownerName.trim(),
      role: 'lot',
    });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({ ok: true, lotId: lot.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
