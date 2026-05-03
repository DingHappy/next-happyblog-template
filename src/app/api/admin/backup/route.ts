import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole, unauthorizedResponse } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import fs from 'fs/promises';
import path from 'path';

type BackupDelegate = {
  findMany: () => Promise<unknown[]>;
  deleteMany: () => Promise<unknown>;
  createMany: (data: unknown[]) => Promise<unknown>;
};

const BACKUP_MODELS = {
  Category: {
    findMany: () => prisma.category.findMany(),
    deleteMany: () => prisma.category.deleteMany(),
    createMany: (data) => prisma.category.createMany({ data: data as Prisma.CategoryCreateManyInput[], skipDuplicates: true }),
  },
  Tag: {
    findMany: () => prisma.tag.findMany(),
    deleteMany: () => prisma.tag.deleteMany(),
    createMany: (data) => prisma.tag.createMany({ data: data as Prisma.TagCreateManyInput[], skipDuplicates: true }),
  },
  Media: {
    findMany: () => prisma.media.findMany(),
    deleteMany: () => prisma.media.deleteMany(),
    createMany: (data) => prisma.media.createMany({ data: data as Prisma.MediaCreateManyInput[], skipDuplicates: true }),
  },
  Setting: {
    findMany: () => prisma.setting.findMany(),
    deleteMany: () => prisma.setting.deleteMany(),
    createMany: (data) => prisma.setting.createMany({ data: data as Prisma.SettingCreateManyInput[], skipDuplicates: true }),
  },
  FriendLink: {
    findMany: () => prisma.friendLink.findMany(),
    deleteMany: () => prisma.friendLink.deleteMany(),
    createMany: (data) => prisma.friendLink.createMany({ data: data as Prisma.FriendLinkCreateManyInput[], skipDuplicates: true }),
  },
  Post: {
    findMany: () => prisma.post.findMany(),
    deleteMany: () => prisma.post.deleteMany(),
    createMany: (data) => prisma.post.createMany({ data: data as Prisma.PostCreateManyInput[], skipDuplicates: true }),
  },
  PostVersion: {
    findMany: () => prisma.postVersion.findMany(),
    deleteMany: () => prisma.postVersion.deleteMany(),
    createMany: (data) => prisma.postVersion.createMany({ data: data as Prisma.PostVersionCreateManyInput[], skipDuplicates: true }),
  },
  Comment: {
    findMany: () => prisma.comment.findMany(),
    deleteMany: () => prisma.comment.deleteMany(),
    createMany: (data) => prisma.comment.createMany({ data: data as Prisma.CommentCreateManyInput[], skipDuplicates: true }),
  },
  User: {
    findMany: () => prisma.user.findMany(),
    deleteMany: () => prisma.user.deleteMany(),
    createMany: (data) => prisma.user.createMany({ data: data as Prisma.UserCreateManyInput[], skipDuplicates: true }),
  },
  AuditLog: {
    findMany: () => prisma.auditLog.findMany(),
    deleteMany: () => prisma.auditLog.deleteMany(),
    createMany: (data) => prisma.auditLog.createMany({ data: data as Prisma.AuditLogCreateManyInput[], skipDuplicates: true }),
  },
  CommentSubscription: {
    findMany: () => prisma.commentSubscription.findMany(),
    deleteMany: () => prisma.commentSubscription.deleteMany(),
    createMany: (data) => prisma.commentSubscription.createMany({ data: data as Prisma.CommentSubscriptionCreateManyInput[], skipDuplicates: true }),
  },
} satisfies Record<string, BackupDelegate>;

const BACKUP_TABLES = Object.keys(BACKUP_MODELS) as Array<keyof typeof BACKUP_MODELS>;
const RESTORE_DELETE_TABLES = [...BACKUP_TABLES].reverse();

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const RESTORE_CONFIRMATION = 'RESTORE';

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function collectBackupData() {
  const backupData: { version: number; createdAt: string; tables: Record<string, unknown[]> } = {
    version: 1,
    createdAt: new Date().toISOString(),
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    backupData.tables[table] = await BACKUP_MODELS[table].findMany();
  }

  return backupData;
}

async function saveBackupFile(prefix = 'backup') {
  await ensureBackupDir();
  const backupData = await collectBackupData();
  const filename = `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

  return { backupData, filename };
}

function validateRestoreConfirmation(value: FormDataEntryValue | null) {
  return String(value || '').trim().toUpperCase() === RESTORE_CONFIRMATION;
}

function resolveBackupPath(filename: string) {
  if (!/^backup-[\w.-]+\.json$/.test(filename) && !/^pre-restore-[\w.-]+\.json$/.test(filename)) {
    return null;
  }

  const filePath = path.resolve(BACKUP_DIR, filename);
  const backupDir = path.resolve(BACKUP_DIR);
  if (!filePath.startsWith(`${backupDir}${path.sep}`)) {
    return null;
  }

  return filePath;
}

export async function GET() {
  if (!(await requireRole('superadmin'))) return unauthorizedResponse();

  try {
    const { backupData, filename } = await saveBackupFile();
    await createAuditLog({
      action: 'backup',
      resource: 'system',
      newData: { filename },
    });

    return NextResponse.json(backupData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: '备份失败' },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  if (!(await requireRole('superadmin'))) return unauthorizedResponse();

  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = await Promise.all(
      files
        .filter(f => (f.startsWith('backup-') || f.startsWith('pre-restore-')) && f.endsWith('.json'))
        .sort()
        .reverse()
        .map(async (filename) => {
          const filePath = path.join(BACKUP_DIR, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            createdAt: stats.birthtime.toISOString(),
            size: stats.size,
          };
        })
    );

    return NextResponse.json({ backups: backupFiles });
  } catch (error) {
    console.error('List backups error:', error);
    return NextResponse.json(
      { error: '获取备份列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireRole('superadmin'))) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const confirmation = formData.get('confirmation');

    if (!file) {
      return NextResponse.json(
        { error: '请上传备份文件' },
        { status: 400 }
      );
    }

    if (!validateRestoreConfirmation(confirmation)) {
      return NextResponse.json(
        { error: `请输入 ${RESTORE_CONFIRMATION} 确认恢复操作` },
        { status: 400 }
      );
    }

    const content = await file.text();
    const backupData = JSON.parse(content) as {
      version?: number;
      tables?: Record<string, unknown>;
    };

    if (backupData.version !== 1) {
      return NextResponse.json(
        { error: '不支持的备份版本' },
        { status: 400 }
      );
    }

    const preRestore = await saveBackupFile('pre-restore');

    for (const table of RESTORE_DELETE_TABLES) {
      await BACKUP_MODELS[table].deleteMany();
    }

    for (const table of BACKUP_TABLES) {
      const records = backupData.tables?.[table];
      if (!records || !Array.isArray(records)) continue;

      if (records.length > 0) {
        await BACKUP_MODELS[table].createMany(records);
      }
    }

    await createAuditLog({
      action: 'restore',
      resource: 'system',
      newData: {
        source: 'upload',
        preRestoreBackup: preRestore.filename,
      },
    });

    return NextResponse.json({ success: true, preRestoreBackup: preRestore.filename });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: '恢复失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireRole('superadmin'))) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    const confirmation = url.searchParams.get('confirmation');
    
    if (!filename) {
      return NextResponse.json(
        { error: '请指定备份文件名' },
        { status: 400 }
      );
    }

    if (String(confirmation || '').trim().toUpperCase() !== RESTORE_CONFIRMATION) {
      return NextResponse.json(
        { error: `请输入 ${RESTORE_CONFIRMATION} 确认恢复操作` },
        { status: 400 }
      );
    }

    const filePath = resolveBackupPath(filename);
    if (!filePath) {
      return NextResponse.json(
        { error: '备份文件名不合法' },
        { status: 400 }
      );
    }
    
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: '备份文件不存在' },
        { status: 404 }
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const backupData = JSON.parse(content) as {
      version?: number;
      tables?: Record<string, unknown>;
    };

    if (backupData.version !== 1) {
      return NextResponse.json(
        { error: '不支持的备份版本' },
        { status: 400 }
      );
    }

    const preRestore = await saveBackupFile('pre-restore');

    for (const table of RESTORE_DELETE_TABLES) {
      await BACKUP_MODELS[table].deleteMany();
    }

    for (const table of BACKUP_TABLES) {
      const records = backupData.tables?.[table];
      if (!records || !Array.isArray(records)) continue;

      if (records.length > 0) {
        await BACKUP_MODELS[table].createMany(records);
      }
    }

    await createAuditLog({
      action: 'restore',
      resource: 'system',
      newData: {
        filename,
        preRestoreBackup: preRestore.filename,
      },
    });

    return NextResponse.json({ success: true, preRestoreBackup: preRestore.filename });
  } catch (error) {
    console.error('Restore from server error:', error);
    return NextResponse.json(
      { error: '恢复失败' },
      { status: 500 }
    );
  }
}
