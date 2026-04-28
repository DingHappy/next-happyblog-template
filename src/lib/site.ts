import { siteConfig } from '@/config/site';

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_URL ||
  process.env.SITE_URL ||
  siteConfig.url
).replace(/\/$/, '');

export function absoluteUrl(path: string) {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
