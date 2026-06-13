import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type } = body;

  try {
    const db = getDb();

    if (type === 'lot') {
      const { lotId, password } = body;
      if (!lotId || !password) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

      const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lotId) as {
        id: number; display_id: string; owner_name: string | null; password_hash: string | null; is_empty: number;
      } | null;

      if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
      if (lot.is_empty) return NextResponse.json({ error: 'Lote vazio' }, { status: 403 });
      if (!lot.password_hash) return NextResponse.json({ error: 'Senha ainda não cadastrada. Use o primeiro acesso.' }, { status: 401 });

      if (hashPassword(password) !== lot.password_hash) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
      }

      const token = await signToken({
        type: 'lot',
        id: lot.id,
        displayId: lot.display_id,
        name: lot.owner_name || lot.display_id,
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

      return NextResponse.json({ lotId: lot.id });
    }

    if (type === 'admin') {
      const { username, password } = body;
      if (!username || !password) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

      const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as {
        id: number; username: string; name: string; password_hash: string; role: string;
      } | null;

      if (!admin || hashPassword(password) !== admin.password_hash) {
        return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
      }

      const token = await signToken({
        type: 'admin',
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role as 'admin' | 'superadmin',
      });

      const cookieStore = await cookies();
      cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return NextResponse.json({ ok: true, role: admin.role });
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
