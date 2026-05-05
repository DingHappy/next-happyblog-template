import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { headers } from 'next/headers';

type AuditJson = Record<string, unknown>;

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'publish' | 'unpublish' | 'submit' | 'approve' | 'reject' | 'export' | 'import' | 'backup' | 'restore';
export type AuditResource = 'post' | 'comment' | 'category' | 'tag' | 'user' | 'setting' | 'media' | 'system' | 'session';

export interface AuditLogData {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  oldData?: AuditJson | null;
  newData?: AuditJson | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const user = await getCurrentUser();
    const headerList = await headers();
    
    const ipAddress = data.ipAddress 
      || headerList.get('x-forwarded-for') 
      || headerList.get('x-real-ip') 
      || 'unknown';
    
    const userAgent = data.userAgent 
      || headerList.get('user-agent') 
      || 'unknown';

    await prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        ipAddress: ipAddress?.split(',')[0].trim() || 'unknown',
        userAgent: userAgent.substring(0, 500),
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function withAuditLog<T>(
  data: Omit<AuditLogData, 'oldData' | 'newData'>,
  fn: () => Promise<T>,
  getOldData?: (result?: T) => Promise<AuditJson | null> | AuditJson | null,
  getNewData?: (result: T) => Promise<AuditJson | null> | AuditJson | null
): Promise<T> {
  const oldData = getOldData ? await getOldData() : null;
  const result = await fn();
  const newData = getNewData ? await getNewData(result) : null;
  
  await createAuditLog({
    ...data,
    oldData,
    newData,
  });
  
  return result;
}
