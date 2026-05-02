import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'ok';
  let dbResponseTime = 0;
  let migrationStatus = 'unknown';
  let migrationCount = 0;
  let latestMigration: string | null = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbResponseTime = Date.now() - dbStart;
  } catch {
    dbStatus = 'error';
    migrationStatus = 'error';
  }

  if (dbStatus === 'ok') {
    try {
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        ORDER BY finished_at DESC NULLS LAST, started_at DESC
      `;
      migrationCount = migrations.length;
      latestMigration = migrations[0]?.migration_name ?? null;
      migrationStatus = migrations.some((migration) => !migration.finished_at) ? 'pending' : 'ok';
    } catch {
      migrationStatus = 'unavailable';
    }
  }

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  const healthData = {
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: {
      name: process.env.APP_NAME || 'next-happyblog-template',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
      commit: process.env.BUILD_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime),
    },
    database: {
      status: dbStatus,
      responseTimeMs: dbResponseTime,
      migrations: {
        status: migrationStatus,
        count: migrationCount,
        latest: latestMigration,
      },
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      systemTotal: Math.round(totalMemory / 1024 / 1024),
      systemFree: Math.round(freeMemory / 1024 / 1024),
      systemUsagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    },
    load: {
      average: os.loadavg(),
    },
  };

  const statusCode = healthData.status === 'healthy' ? 200 : 503;

  return NextResponse.json(healthData, { status: statusCode });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}
