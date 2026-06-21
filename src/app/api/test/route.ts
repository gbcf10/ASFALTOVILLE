import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true, message: 'Conexão OK!' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
