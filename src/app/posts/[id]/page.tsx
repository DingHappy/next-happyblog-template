import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default async function PostRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/${routing.defaultLocale}/posts/${id}`);
}
