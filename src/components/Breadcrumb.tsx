'use client';

import Link from 'next/link';
import { BreadcrumbListJsonLd, BreadcrumbItem } from './JsonLd';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <>
      <BreadcrumbListJsonLd items={items} />
      <nav aria-label="面包屑导航" className="mb-4">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
              {index === items.length - 1 ? (
                <span className="text-gray-900 dark:text-white font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
