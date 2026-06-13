import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureInit } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.type !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const { description, amount, category, expense_date, notes } = await request.json();
  if (!description || !amount || !expense_date) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });

  await ensureInit();
  const refMonth = expense_date.substring(0, 7);
  await sql`
    UPDATE expenses SET description=${description.trim()}, amount=${amount}, category=${category || 'geral'},
    expense_date=${expense_date}, reference_month=${refMonth}, notes=${notes?.trim() || null}
    WHERE id=${id}
  `;
  return NextResponse.json({ ok: true });
}
