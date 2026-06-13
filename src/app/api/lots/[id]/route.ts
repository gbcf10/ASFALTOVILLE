import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface Params { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const lotId = parseInt(params.id, 10);
  const body = await request.json();
  const { ownerName, isEmpty, resetPassword } = body;

  const db = getDb();

  if (resetPassword) {
    db.prepare(`UPDATE lots SET owner_name = ?, is_empty = ?, password_hash = NULL WHERE id = ?`)
      .run(ownerName?.trim() || null, isEmpty ? 1 : 0, lotId);
  } else {
    db.prepare(`UPDATE lots SET owner_name = ?, is_empty = ? WHERE id = ?`)
      .run(ownerName?.trim() || null, isEmpty ? 1 : 0, lotId);
  }

  return NextResponse.json({ ok: true });
}
