import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  if (!(await requireAuth())) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
      <AdminSidebar />
      <AnalyticsClient />
    </div>
  );
}
