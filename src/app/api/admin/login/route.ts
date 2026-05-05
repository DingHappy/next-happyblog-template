import { NextResponse } from 'next/server';
import {
  createSession,
  verifyPasswordAgainstHash,
  hashPassword,
  shouldUpgradePasswordHash,
  ensureDefaultUser,
} from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const identifier = typeof username === 'string' ? username.trim() : '';

    if (!identifier || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 登录限流：同 IP + 用户名 15 分钟最多 10 次尝试，防爆破
    const ip = getClientIp(request) ?? 'unknown';
    const limitKey = `login:${ip}:${identifier.toLowerCase()}`;
    const limited = rateLimit({ key: limitKey, limit: 10, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: '登录尝试过于频繁，请稍后再试' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
        },
      );
    }

    await ensureDefaultUser();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user || !verifyPasswordAgainstHash(password, user.password)) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    if (shouldUpgradePasswordHash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) },
      });
    }

    const sessionId = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
    response.cookies.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
