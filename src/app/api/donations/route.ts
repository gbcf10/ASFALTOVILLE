import { NextRequest, NextResponse } from 'next/server';
import { getDb, currentMonth } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const { lotId, donorName, amount, paymentMethod, notes, referenceMonth } = body;

  if (!lotId || !donorName || !amount || !paymentMethod) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }
  if (amount < 20) return NextResponse.json({ error: 'Valor mínimo é R$ 20,00' }, { status: 400 });
  if (session.type === 'lot' && session.id !== lotId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const db = getDb();
  if (!db.prepare('SELECT id FROM lots WHERE id = ?').get(lotId)) {
    return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
  }

  const refMonth = referenceMonth || currentMonth();
  const status = paymentMethod === 'pix' ? 'pago' : 'pendente';
  const confirmedAt = paymentMethod === 'pix' ? new Date().toISOString() : null;
  const confirmedBy = paymentMethod === 'pix' ? 'auto-pix' : null;

  const result = db.prepare(`
    INSERT INTO donations (lot_id, donor_name, amount, payment_method, status, reference_month, notes, confirmed_at, confirmed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(lotId, donorName.trim(), amount, paymentMethod, status, refMonth, notes?.trim() || null, confirmedAt, confirmedBy);

  return NextResponse.json({ id: result.lastInsertRowid, status }, { status: 201 });
}
