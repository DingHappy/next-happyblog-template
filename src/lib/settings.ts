import prisma from './prisma';
import { siteConfig } from '@/config/site';

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  authorName: string;
  authorAvatar: string;
  authorBio: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
  seoDescription: string;
  seoKeywords: string;
}

const defaultSettings: SiteSettings = {
  siteTitle: siteConfig.name,
  siteDescription: siteConfig.description,
  siteUrl: siteConfig.url,
  authorName: siteConfig.author.name,
  authorAvatar: '',
  authorBio: siteConfig.author.bio,
  socialLinks: siteConfig.socialLinks,
  seoDescription: siteConfig.description,
  seoKeywords: 'blog,nextjs,template',
};

export async function getSettings(): Promise<SiteSettings> {
  const settings = await prisma.setting.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s]));
  
  const result: Record<string, unknown> = { ...defaultSettings };
  
  for (const [key, setting] of settingsMap) {
    if (setting.type === 'json') {
      try {
        result[key] = JSON.parse(setting.value || '{}');
      } catch {
        result[key] = {};
      }
    } else if (setting.type === 'boolean') {
      result[key] = setting.value === 'true';
    } else if (setting.type === 'number') {
      result[key] = Number(setting.value) || 0;
    } else {
      result[key] = setting.value;
    }
  }
  
  return result as unknown as SiteSettings;
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    let type = 'string';
    let stringValue: string;
    
    if (typeof value === 'object') {
      type = 'json';
      stringValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      type = 'boolean';
      stringValue = String(value);
    } else if (typeof value === 'number') {
      type = 'number';
      stringValue = String(value);
    } else {
      stringValue = String(value);
    }
    
    await prisma.setting.upsert({
      where: { key },
      update: { value: stringValue, type },
      create: { key, value: stringValue, type },
    });
  }
}

export async function initDefaultSettings() {
  const existing = await prisma.setting.count();
  if (existing === 0) {
    await updateSettings(defaultSettings);
  }
}
