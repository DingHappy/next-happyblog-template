import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

// Narrow matcher: only act on locale-prefixed routes. The rest of the
// site (Chinese-only `/`, `/posts/...`, `/admin/...`, `/api/...`) is
// untouched until those pages are migrated under `[locale]/`.
export const config = {
  matcher: ['/(zh|en)/:path*'],
};
