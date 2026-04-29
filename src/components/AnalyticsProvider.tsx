'use client';

import { useEffect, Suspense, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function AnalyticsInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enteredAtRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      return;
    }

    const postMatch = pathname?.match(/\/posts\/([^/]+)/);
    const postId = postMatch ? postMatch[1] : null;
    const now = Date.now();
    const duration = enteredAtRef.current
      ? Math.max(0, Math.round((now - enteredAtRef.current) / 1000))
      : 0;
    enteredAtRef.current = now;

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        event: 'page_view',
        path: pathname,
        postId,
        sessionId: sessionIdRef.current,
        duration,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { sessionId?: string } | null) => {
        if (data?.sessionId) sessionIdRef.current = data.sessionId;
      })
      .catch(() => {
        // 统计失败不影响页面访问。
      });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner>{children}</AnalyticsInner>
    </Suspense>
  );
}
