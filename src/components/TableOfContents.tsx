'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/markdown';

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0% -70% 0%', threshold: 0 }
    );

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return <span className="text-gray-400 text-xs">暂无目录</span>;
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <nav className="flex flex-col gap-1 text-sm max-h-[calc(100vh-160px)] overflow-y-auto">
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={(e) => handleClick(e, h.id)}
          className={`block py-1.5 border-l-2 transition-all duration-200 leading-snug ${
            activeId === h.id
              ? 'border-purple-500 text-purple-600 font-medium bg-purple-50/50 dark:bg-purple-950/20'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-700'
          }`}
          style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
