import path from 'path';
import fs from 'fs/promises';

export interface PutResult {
  url: string;
}

export interface Storage {
  put(key: string, buffer: Buffer, contentType: string): Promise<PutResult>;
  delete(key: string): Promise<void>;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const UPLOADS_PREFIX = 'uploads';

class LocalStorage implements Storage {
  async put(key: string, buffer: Buffer, contentType: string): Promise<PutResult> {
    void contentType;
    const relPath = path.join(UPLOADS_PREFIX, key);
    const absPath = path.join(PUBLIC_DIR, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);
    return { url: '/' + relPath.split(path.sep).join('/') };
  }

  async delete(key: string): Promise<void> {
    const absPath = path.join(PUBLIC_DIR, UPLOADS_PREFIX, key);
    await fs.unlink(absPath).catch(() => undefined);
  }
}

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  const driver = process.env.STORAGE_DRIVER || 'local';
  switch (driver) {
    case 'local':
      cached = new LocalStorage();
      return cached;
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
  }
}
