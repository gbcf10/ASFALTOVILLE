import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await request.json();
  const { description, amount, category, expense_date, notes } = body;
  if (!description || !amount || !expense_date) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }
  const refMonth = expense_date.substring(0, 7);
  getDb().prepare(`
    UPDATE expenses SET description=?, amount=?, category=?, expense_date=?, reference_month=?, notes=? WHERE id=?
  `).run(description.trim(), amount, category || 'geral', expense_date, refMonth, notes?.trim() || null, id);

  return NextResponse.json({ ok: true });
}
