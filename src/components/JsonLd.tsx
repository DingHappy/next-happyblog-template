import { absoluteUrl } from '@/lib/site';
import { siteConfig } from '@/config/site';

export interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  authorName: string;
  datePublished: string;
  dateModified: string;
  image?: string;
  tags?: string[];
  category?: string;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  authorName,
  datePublished,
  dateModified,
  image,
  tags = [],
  category,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description,
    url: url,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/favicon.ico'),
      },
    },
    datePublished: datePublished,
    dateModified: dateModified,
    keywords: tags.join(', '),
    articleSection: category,
    ...(image && {
      image: image,
      thumbnailUrl: image,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }}
    />
  );
}

export function WebSiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    description: siteConfig.description,
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }}
    />
  );
}

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function BreadcrumbListJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }}
    />
  );
}

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    description: siteConfig.description,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/favicon.ico'),
    sameAs: [
      siteConfig.socialLinks.github,
      siteConfig.socialLinks.twitter,
      siteConfig.socialLinks.linkedin,
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }}
    />
  );
}
