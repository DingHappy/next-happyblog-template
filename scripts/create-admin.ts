import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const ROLES = new Set(['superadmin', 'admin', 'author']);

type Options = {
  username: string;
  password?: string;
  passwordHash?: string;
  email?: string;
  displayName?: string;
  role: 'superadmin' | 'admin' | 'author';
};

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];

  return undefined;
}

function readOptions(): Options {
  const username = readArg('username') ?? process.env.ADMIN_USERNAME ?? 'admin';
  const password = readArg('password') ?? process.env.ADMIN_PASSWORD;
  const passwordHash = readArg('password-hash') ?? process.env.ADMIN_PASSWORD_HASH;
  const email = readArg('email') ?? process.env.ADMIN_EMAIL;
  const displayName = readArg('display-name') ?? process.env.ADMIN_DISPLAY_NAME ?? '管理员';
  const role = (readArg('role') ?? process.env.ADMIN_ROLE ?? 'superadmin') as Options['role'];

  if (!password && !passwordHash) {
    throw new Error(
      'Missing admin password. Use ADMIN_PASSWORD=... npm run admin:create, ADMIN_PASSWORD_HASH=..., or -- --password=...'
    );
  }

  if (password && password.length < 8) {
    throw new Error('Admin password must be at least 8 characters.');
  }

  if (!ROLES.has(role)) {
    throw new Error('Invalid role. Use one of: superadmin, admin, author.');
  }

  return {
    username,
    password,
    passwordHash,
    email: email || undefined,
    displayName,
    role,
  };
}

async function main() {
  const options = readOptions();
  const passwordHash = options.passwordHash ?? bcrypt.hashSync(options.password!, BCRYPT_ROUNDS);
  const existing = await prisma.user.findUnique({
    where: { username: options.username },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: passwordHash,
        email: options.email,
        displayName: options.displayName,
        role: options.role,
      },
    });
    console.log(`Updated admin user "${options.username}" with role "${options.role}".`);
    return;
  }

  await prisma.user.create({
    data: {
      username: options.username,
      password: passwordHash,
      email: options.email,
      displayName: options.displayName,
      role: options.role,
    },
  });
  console.log(`Created admin user "${options.username}" with role "${options.role}".`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
