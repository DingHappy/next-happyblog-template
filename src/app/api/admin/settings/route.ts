import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/settings';
import { createAuditLog } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
  const auth = await requirePermission('settings:manage');
  if (!auth.ok) return auth.response;

  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get settings failed:', error);
    return NextResponse.json(
      { error: '获取设置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requirePermission('settings:manage');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const oldSettings = await getSettings();
    await updateSettings(body);

    await createAuditLog({
      action: 'update',
      resource: 'setting',
      oldData: { keys: Object.keys(oldSettings) },
      newData: { keys: Object.keys(body) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings failed:', error);
    return NextResponse.json(
      { error: '更新设置失败' },
      { status: 500 }
    );
  }
}
