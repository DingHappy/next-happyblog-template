import { NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sendTestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorizedResponse();

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '请输入邮箱地址' },
        { status: 400 }
      );
    }

    await sendTestEmail(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发送测试邮件失败，请检查 SMTP 配置' },
      { status: 500 }
    );
  }
}
