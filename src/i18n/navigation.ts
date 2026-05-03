import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware drop-in replacements for next/link and next/navigation.
// Use these in client components to keep links scoped to the current locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
