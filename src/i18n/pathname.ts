import { routing } from './routing';

export function getPathnameLocale(pathname: string) {
  const [, locale] = pathname.match(new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`)) ?? [];
  return locale && routing.locales.includes(locale as never)
    ? (locale as (typeof routing.locales)[number])
    : undefined;
}

export function normalizeLocalePathname(pathname: string) {
  const localePattern = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);
  let normalized = pathname;

  while (localePattern.test(normalized)) {
    normalized = normalized.replace(localePattern, '');
  }

  return normalized || '/';
}

export function localizePathname(pathname: string, locale: (typeof routing.locales)[number]) {
  const normalized = normalizeLocalePathname(pathname);
  return normalized === '/' ? `/${locale}` : `/${locale}${normalized}`;
}
