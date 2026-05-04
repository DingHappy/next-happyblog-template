'use client';

import { useCallback, useEffect, Suspense, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type ActiveView = {
  path: string;
  postId: string | null;
  startedAt: number;
  viewId?: string;
};

function getTrafficReferrer() {
  if (typeof document === 'undefined') return null;
  return document.referrer || null;
}

function AnalyticsInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionIdRef = useRef<string | null>(null);
  const activeViewRef = useRef<ActiveView | null>(null);

  const sendDuration = useCallback((view: ActiveView | null) => {
    if (!view) return;

    const duration = Math.max(0, Math.round((Date.now() - view.startedAt) / 1000));
    if (duration === 0) return;

    const payload = JSON.stringify({
      event: 'page_duration',
      path: view.path,
      postId: view.postId,
      sessionId: sessionIdRef.current,
      viewId: view.viewId,
      duration,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
      return;
    }

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: payload,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      return;
    }

    const postMatch = pathname?.match(/\/posts\/([^/]+)/);
    const postId = postMatch ? postMatch[1] : null;
    const currentPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    const activeView: ActiveView = {
      path: currentPath,
      postId,
      startedAt: Date.now(),
    };
    activeViewRef.current = activeView;

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        event: 'page_view',
        path: currentPath,
        postId,
        sessionId: sessionIdRef.current,
        referrer: getTrafficReferrer(),
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { sessionId?: string; viewId?: string } | null) => {
        if (data?.sessionId) sessionIdRef.current = data.sessionId;
        if (data?.viewId && activeViewRef.current === activeView) {
          activeView.viewId = data.viewId;
        }
      })
      .catch(() => {
        // 统计失败不影响页面访问。
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendDuration(activeViewRef.current);
        activeViewRef.current = null;
      }
    };
    const handlePageHide = () => {
      sendDuration(activeViewRef.current);
      activeViewRef.current = null;
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (activeViewRef.current === activeView) {
        sendDuration(activeView);
        activeViewRef.current = null;
      }
    };
  }, [pathname, searchParams, sendDuration]);

  return <>{children}</>;
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner>{children}</AnalyticsInner>
    </Suspense>
  );
}
