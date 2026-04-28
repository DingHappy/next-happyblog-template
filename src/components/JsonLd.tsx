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
