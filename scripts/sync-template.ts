import { createHash } from 'crypto';
import { constants } from 'fs';
import fs from 'fs/promises';
import path from 'path';

type Options = {
  source: string;
  target: string;
  write: boolean;
  deleteExtra: boolean;
  verbose: boolean;
  allowDirty: boolean;
};

type Summary = {
  copied: string[];
  updated: string[];
  deleted: string[];
  skipped: string[];
  unchanged: number;
};

const ALWAYS_SKIP = [
  '.git',
  '.next',
  'node_modules',
  'coverage',
  'out',
  'build',
  '.vercel',
  'src/generated/prisma',
  'public/uploads',
  'uploads',
  'backups',
];

const PRIVATE_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\..+/,
  /\.pem$/,
  /\.bak$/,
  /\.sql$/,
  /\.dump$/,
  /tsconfig\.tsbuildinfo$/,
  /^next-env\.d\.ts$/,
];

const ALLOWED_ENV_EXAMPLES = new Set([
  '.env.example',
  '.env.local.example',
  '.env.production.example',
]);

function parseArgs(argv: string[]): Options {
  const options: Options = {
    source: process.cwd(),
    target: '',
    write: false,
    deleteExtra: false,
    verbose: false,
    allowDirty: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--target') {
      options.target = argv[++index] || '';
    } else if (arg.startsWith('--target=')) {
      options.target = arg.slice('--target='.length);
    } else if (arg === '--source') {
      options.source = argv[++index] || '';
    } else if (arg.startsWith('--source=')) {
      options.source = arg.slice('--source='.length);
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--delete') {
      options.deleteExtra = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--allow-dirty') {
      options.allowDirty = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.target) {
    throw new Error('Missing required --target <path>');
  }

  options.source = path.resolve(options.source);
  options.target = path.resolve(options.target);
  return options;
}

function printHelp() {
  console.log(`Usage:
  npm run template:sync -- --target ../my-blog-production
  npm run template:sync -- --target ../my-blog-production --write
  npm run template:sync -- --target ../my-blog-production --write --delete

Options:
  --target <path>   Production project directory to update.
  --source <path>   Template directory. Defaults to current working directory.
  --write           Apply changes. Without this, only prints a dry-run report.
  --delete          Delete target files that no longer exist in the template, except protected paths.
  --verbose         Print unchanged and skipped files.
  --allow-dirty     Allow syncing into a target worktree with uncommitted changes.
`);
}

function toRelative(root: string, filePath: string) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function isProtectedPath(relativePath: string) {
  if (!relativePath) return false;
  if (/^prisma\/migrations\/[^/]+\/migration\.sql$/.test(relativePath)) {
    return false;
  }
  if (ALWAYS_SKIP.some((item) => relativePath === item || relativePath.startsWith(`${item}/`))) {
    return true;
  }
  if (ALLOWED_ENV_EXAMPLES.has(relativePath)) return false;
  return PRIVATE_FILE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fileHash(filePath: string) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function walkFiles(root: string, current = root): Promise<string[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    const relativePath = toRelative(root, fullPath);
    if (isProtectedPath(relativePath)) continue;

    if (entry.isDirectory()) {
      files.push(...await walkFiles(root, fullPath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function assertDirectory(filePath: string, label: string) {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`${label} is not a directory: ${filePath}`);
  }
}

async function assertGitWorktreeClean(target: string, allowDirty: boolean) {
  const gitDir = path.join(target, '.git');
  if (!(await exists(gitDir))) return;

  const { spawnSync } = await import('child_process');
  const result = spawnSync('git', ['status', '--short'], {
    cwd: target,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to inspect target git status:\n${result.stderr || result.stdout}`);
  }

  if (result.stdout.trim() && !allowDirty) {
    throw new Error(
      `Target worktree has uncommitted changes. Commit or stash them first:\n${result.stdout}`
    );
  }
}

async function copyFile(sourceRoot: string, targetRoot: string, relativePath: string, write: boolean) {
  if (!write) return;
  const sourcePath = path.join(sourceRoot, relativePath);
  const targetPath = path.join(targetRoot, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function deleteFile(targetRoot: string, relativePath: string, write: boolean) {
  if (!write) return;
  await fs.unlink(path.join(targetRoot, relativePath));
}

async function syncTemplate(options: Options) {
  await assertDirectory(options.source, 'Source');
  await assertDirectory(options.target, 'Target');
  await assertGitWorktreeClean(options.target, options.allowDirty);

  const sourceFiles = await walkFiles(options.source);
  const targetFiles = await walkFiles(options.target);
  const sourceSet = new Set(sourceFiles);
  const summary: Summary = {
    copied: [],
    updated: [],
    deleted: [],
    skipped: [],
    unchanged: 0,
  };

  for (const relativePath of sourceFiles) {
    const sourcePath = path.join(options.source, relativePath);
    const targetPath = path.join(options.target, relativePath);

    if (!(await exists(targetPath))) {
      summary.copied.push(relativePath);
      await copyFile(options.source, options.target, relativePath, options.write);
      continue;
    }

    const [sourceHash, targetHash] = await Promise.all([
      fileHash(sourcePath),
      fileHash(targetPath),
    ]);

    if (sourceHash !== targetHash) {
      summary.updated.push(relativePath);
      await copyFile(options.source, options.target, relativePath, options.write);
    } else {
      summary.unchanged += 1;
    }
  }

  if (options.deleteExtra) {
    for (const relativePath of targetFiles) {
      if (sourceSet.has(relativePath)) continue;
      if (isProtectedPath(relativePath)) {
        summary.skipped.push(relativePath);
        continue;
      }
      summary.deleted.push(relativePath);
      await deleteFile(options.target, relativePath, options.write);
    }
  }

  return summary;
}

function printList(label: string, items: string[], verbose = true) {
  console.log(`${label}: ${items.length}`);
  if (!verbose || items.length === 0) return;
  for (const item of items.slice(0, 80)) {
    console.log(`  - ${item}`);
  }
  if (items.length > 80) {
    console.log(`  ... ${items.length - 80} more`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await syncTemplate(options);

  console.log(options.write ? 'Template sync applied.' : 'Template sync dry run.');
  console.log(`Source: ${options.source}`);
  console.log(`Target: ${options.target}`);
  console.log(`Delete extra files: ${options.deleteExtra ? 'yes' : 'no'}`);
  console.log(`Allow dirty target: ${options.allowDirty ? 'yes' : 'no'}`);
  console.log('');
  printList('Copied', summary.copied);
  printList('Updated', summary.updated);
  printList('Deleted', summary.deleted);
  printList('Skipped protected', summary.skipped, options.verbose);
  console.log(`Unchanged: ${summary.unchanged}`);
  if (!options.write) {
    console.log('');
    console.log('Dry run only. Re-run with --write to apply these changes.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
