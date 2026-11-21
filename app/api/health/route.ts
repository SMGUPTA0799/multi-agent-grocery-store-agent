import { NextResponse } from 'next/server';
import { ensureSchema, getDb } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const sql = getDb();
    await sql`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Health check failed';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
