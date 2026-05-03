import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  // 'always' makes URLs explicit (/zh/about, /en/about). Easier to migrate
  // page-by-page than 'as-needed' because non-i18n pages are obviously
  // unaffected. Switch to 'as-needed' once the full site is migrated.
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
