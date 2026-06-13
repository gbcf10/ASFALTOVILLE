import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const body = await request.json();
  const { description, amount, category, expense_date, notes } = body;
  if (!description || !amount || !expense_date) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }
  const refMonth = expense_date.substring(0, 7); // YYYY-MM from YYYY-MM-DD
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO expenses (description, amount, category, expense_date, reference_month, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(description.trim(), amount, category || 'geral', expense_date, refMonth, notes?.trim() || null);
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });
  getDb().prepare('DELETE FROM expenses WHERE id = ?').run(parseInt(id, 10));
  return NextResponse.json({ ok: true });
}
