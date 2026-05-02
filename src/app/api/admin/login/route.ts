import { NextResponse } from 'next/server';
import {
  createSession,
  createLegacySession,
  verifyPassword,
  verifyPasswordAgainstHash,
  hashPassword,
  shouldUpgradePasswordHash,
  ensureDefaultUser,
} from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: '请输入密码' },
        { status: 400 }
      );
    }

    await ensureDefaultUser();

    let userId: string | null = null;

    if (username) {
      const user = await prisma.user.findUnique({
        where: { username },
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

      userId = user.id;
    } else {
      if (!await verifyPassword(password)) {
        return NextResponse.json(
          { error: '密码错误' },
          { status: 401 }
        );
      }

      const adminUser = await prisma.user.findFirst({
        where: { role: 'superadmin' },
      });
      userId = adminUser?.id || null;
    }

    const sessionId = userId
      ? await createSession(userId)
      : await createLegacySession();

    const response = NextResponse.json({ success: true });
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
