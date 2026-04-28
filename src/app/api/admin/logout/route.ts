import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('admin_session')?.value;

  if (sessionId) {
    await destroySession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
