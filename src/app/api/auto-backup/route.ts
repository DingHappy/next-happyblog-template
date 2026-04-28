import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

type BackupDelegate = {
  findMany: () => Promise<unknown[]>;
};

const BACKUP_MODELS = {
  Category: { findMany: () => prisma.category.findMany() as Promise<Prisma.CategoryCreateManyInput[]> },
  Tag: { findMany: () => prisma.tag.findMany() as Promise<Prisma.TagCreateManyInput[]> },
  Media: { findMany: () => prisma.media.findMany() as Promise<Prisma.MediaCreateManyInput[]> },
  Setting: { findMany: () => prisma.setting.findMany() as Promise<Prisma.SettingCreateManyInput[]> },
  FriendLink: { findMany: () => prisma.friendLink.findMany() as Promise<Prisma.FriendLinkCreateManyInput[]> },
  Post: { findMany: () => prisma.post.findMany() as Promise<Prisma.PostCreateManyInput[]> },
  PostVersion: { findMany: () => prisma.postVersion.findMany() as Promise<Prisma.PostVersionCreateManyInput[]> },
  Comment: { findMany: () => prisma.comment.findMany() as Promise<Prisma.CommentCreateManyInput[]> },
  User: { findMany: () => prisma.user.findMany() as Promise<Prisma.UserCreateManyInput[]> },
  AuditLog: { findMany: () => prisma.auditLog.findMany() as Promise<Prisma.AuditLogCreateManyInput[]> },
  CommentSubscription: { findMany: () => prisma.commentSubscription.findMany() as Promise<Prisma.CommentSubscriptionCreateManyInput[]> },
} satisfies Record<string, BackupDelegate>;

const BACKUP_TABLES = Object.keys(BACKUP_MODELS) as Array<keyof typeof BACKUP_MODELS>;

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 7;

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function cleanupOldBackups() {
  const files = await fs.readdir(BACKUP_DIR);
  const backupFiles = files
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (backupFiles.length > MAX_BACKUPS) {
    const toDelete = backupFiles.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      await fs.unlink(path.join(BACKUP_DIR, file));
    }
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await ensureBackupDir();

    const backupData: { version: number; createdAt: string; tables: Record<string, unknown[]> } = {
      version: 1,
      createdAt: new Date().toISOString(),
      tables: {},
    };

    for (const table of BACKUP_TABLES) {
      try {
        backupData.tables[table] = await BACKUP_MODELS[table].findMany();
      } catch (error) {
        console.warn(`Warning: Could not backup table ${table}:`, error);
      }
    }

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(BACKUP_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    await cleanupOldBackups();

    return NextResponse.json({ 
      success: true, 
      filename,
      tables: Object.keys(backupData.tables),
      message: `Backup created successfully, keeping last ${MAX_BACKUPS} backups`
    });
  } catch (error) {
    console.error('Auto backup error:', error);
    return NextResponse.json(
      { error: 'Backup failed' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
