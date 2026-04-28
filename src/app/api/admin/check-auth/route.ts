import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isAuthenticated = await requireAuth();

  if (isAuthenticated) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json(
    { authenticated: false },
    { status: 401 }
  );
}
