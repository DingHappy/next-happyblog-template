'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from './BackToTop';
import MobileBottomNav from './MobileBottomNav';

// 在 /admin 下隐藏前台外壳(Navbar/Footer/MobileBottomNav),让管理后台用全屏空间。
function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const adminMode = isAdminPath(pathname);

  if (adminMode) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* 给底部固定的 MobileBottomNav 让出空间,避免遮挡 Footer */}
      <div
        aria-hidden="true"
        className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:hidden"
      />
      <BackToTop />
      <MobileBottomNav />
    </>
  );
}
