import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const debug = {
    POSTGRES_URL: process.env['POSTGRES_URL'] ? 'SET' : 'NOT SET',
    DATABASE_URL: process.env['DATABASE_URL'] ? 'SET' : 'NOT SET',
    NODE_ENV: process.env['NODE_ENV'],
  };
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true, message: 'Conexão OK!', debug });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), debug });
  }
}
