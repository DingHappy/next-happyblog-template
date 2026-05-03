import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPermissionsForRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();

  if (user) {
    return NextResponse.json({
      authenticated: true,
      user,
      permissions: getPermissionsForRole(user.role),
    });
  }

  return NextResponse.json(
    { authenticated: false },
    { status: 401 }
  );
}
