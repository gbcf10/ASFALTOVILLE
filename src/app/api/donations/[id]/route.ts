import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureInit } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface Params { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const donationId = parseInt(params.id, 10);
  const { status } = await request.json();
  if (!['pago', 'pendente'].includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 });

  await ensureInit();
  const rows = await sql`SELECT * FROM donations WHERE id = ${donationId}`;
  const donation = rows[0] as { id: number; lot_id: number; status: string } | undefined;

  if (!donation) return NextResponse.json({ error: 'Contribuição não encontrada' }, { status: 404 });

  if (session.type === 'lot') {
    if (session.id !== donation.lot_id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    if (status !== 'pago') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const confirmedAt = status === 'pago' ? new Date().toISOString() : null;
  const confirmedBy = status === 'pago' ? (session.type === 'admin' ? (session.username || 'admin') : 'auto-pix') : null;

  await sql`UPDATE donations SET status = ${status}, confirmed_at = ${confirmedAt}, confirmed_by = ${confirmedBy} WHERE id = ${donationId}`;

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.type !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await ensureInit();
  await sql`DELETE FROM donations WHERE id = ${parseInt(params.id, 10)}`;
  return NextResponse.json({ ok: true });
}
