import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { displayId } = await request.json();
  if (!displayId) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

  try {
    const db = getDb();
    const lot = db.prepare('SELECT id, display_id, password_hash, is_empty FROM lots WHERE display_id = ?').get(displayId) as {
      id: number; display_id: string; password_hash: string | null; is_empty: number;
    } | null;

    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    if (lot.is_empty) return NextResponse.json({ error: 'Este lote está marcado como vazio' }, { status: 403 });

    return NextResponse.json({
      lotId: lot.id,
      displayId: lot.display_id,
      firstAccess: !lot.password_hash,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
