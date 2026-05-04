import { NextResponse } from 'next/server';

export function verifySyncToken(request: Request): boolean {
  const expected = process.env.ADMIN_SYNC_TOKEN;
  if (!expected) return false;

  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return timingSafeEqual(match[1].trim(), expected.trim());
}

export function syncUnauthorizedResponse() {
  return NextResponse.json({ error: 'invalid sync token' }, { status: 401 });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
