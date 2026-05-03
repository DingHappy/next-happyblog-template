import { describe, expect, it } from 'vitest';
import { getPathnameLocale, localizePathname, normalizeLocalePathname } from '@/i18n/pathname';

describe('getPathnameLocale', () => {
  it('gets the leading locale from the URL path', () => {
    expect(getPathnameLocale('/zh')).toBe('zh');
    expect(getPathnameLocale('/en/about')).toBe('en');
  });

  it('returns undefined for non-locale paths', () => {
    expect(getPathnameLocale('/archives')).toBeUndefined();
    expect(getPathnameLocale('/zh-cn')).toBeUndefined();
  });
});

describe('normalizeLocalePathname', () => {
  it('normalizes bare locale paths to root', () => {
    expect(normalizeLocalePathname('/zh')).toBe('/');
    expect(normalizeLocalePathname('/en')).toBe('/');
  });

  it('removes a locale prefix from nested paths', () => {
    expect(normalizeLocalePathname('/zh/about')).toBe('/about');
    expect(normalizeLocalePathname('/en/about')).toBe('/about');
  });

  it('removes repeated leading locale prefixes from polluted paths', () => {
    expect(normalizeLocalePathname('/zh/zh')).toBe('/');
    expect(normalizeLocalePathname('/en/zh')).toBe('/');
    expect(normalizeLocalePathname('/en/zh/about')).toBe('/about');
    expect(normalizeLocalePathname('/zh/en/zh/about')).toBe('/about');
  });

  it('leaves non-locale paths unchanged', () => {
    expect(normalizeLocalePathname('/about')).toBe('/about');
    expect(normalizeLocalePathname('/archives')).toBe('/archives');
  });
});

describe('localizePathname', () => {
  it('adds the target locale to normalized paths', () => {
    expect(localizePathname('/', 'en')).toBe('/en');
    expect(localizePathname('/about', 'zh')).toBe('/zh/about');
  });

  it('replaces polluted leading locale prefixes with the target locale', () => {
    expect(localizePathname('/zh/zh', 'en')).toBe('/en');
    expect(localizePathname('/en/zh/about', 'zh')).toBe('/zh/about');
  });
});
