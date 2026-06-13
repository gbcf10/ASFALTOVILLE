import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureInit } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { description, amount, category, expense_date, notes } = await request.json();
  if (!description || !amount || !expense_date) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

  await ensureInit();
  const refMonth = expense_date.substring(0, 7);
  const result = await sql`
    INSERT INTO expenses (description, amount, category, expense_date, reference_month, notes)
    VALUES (${description.trim()}, ${amount}, ${category || 'geral'}, ${expense_date}, ${refMonth}, ${notes?.trim() || null})
    RETURNING id
  `;
  return NextResponse.json({ id: result[0].id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });

  await ensureInit();
  await sql`DELETE FROM expenses WHERE id = ${parseInt(id, 10)}`;
  return NextResponse.json({ ok: true });
}
