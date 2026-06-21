import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureInit } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { displayId } = await request.json();
  if (!displayId) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

  try {
    await ensureInit();
    const rows = await sql`SELECT id, display_id, password_hash, is_empty FROM lots WHERE display_id = ${String(displayId).padStart(3, '0')}`;
    const lot = rows[0] as { id: number; display_id: string; password_hash: string | null; is_empty: number } | undefined;

    if (!lot) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    if (lot.is_empty) return NextResponse.json({ error: 'Este lote está marcado como vazio' }, { status: 403 });

    return NextResponse.json({ lotId: lot.id, displayId: lot.display_id, firstAccess: !lot.password_hash });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 });
  }
}
