import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface Params { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const donationId = parseInt(params.id, 10);
  const body = await request.json();
  const { status } = body;

  if (!['pago', 'pendente'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const db = getDb();
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId) as {
    id: number; lot_id: number; status: string;
  } | null;

  if (!donation) return NextResponse.json({ error: 'Contribuição não encontrada' }, { status: 404 });

  // Lot user can only confirm their own PIX donations
  if (session.type === 'lot') {
    if (session.id !== donation.lot_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    // Lot user can only mark as pago (PIX confirmation)
    if (status !== 'pago') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
  }

  const confirmedAt = status === 'pago' ? new Date().toISOString() : null;
  const confirmedBy = status === 'pago'
    ? (session.type === 'admin' ? (session.username || 'admin') : 'auto-pix')
    : null;

  db.prepare(`
    UPDATE donations SET status = ?, confirmed_at = ?, confirmed_by = ? WHERE id = ?
  `).run(status, confirmedAt, confirmedBy, donationId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const donationId = parseInt(params.id, 10);
  const db = getDb();
  db.prepare('DELETE FROM donations WHERE id = ?').run(donationId);

  return NextResponse.json({ ok: true });
}
