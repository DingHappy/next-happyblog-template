import { Link } from '@/i18n/navigation';
import { siteConfig } from '@/config/site';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white/90 text-gray-500 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/90 dark:text-gray-400">
      <div className="max-w-[1400px] mx-auto py-8 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 px-4">
        <span className="text-sm font-medium">
          © {new Date().getFullYear()}&nbsp;
          <Link className="hover:underline font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent" href="/about">
            {siteConfig.logoEmoji} {siteConfig.name}
          </Link>
          &nbsp; Made with care
        </span>
        <span className="text-sm font-medium">
          Powered by&nbsp;
          <a className="font-bold text-blue-600 hover:underline dark:text-blue-400" href="https://nextjs.org">Next.js</a>
          &nbsp;+&nbsp;
          <a className="font-bold text-cyan-600 hover:underline dark:text-cyan-400" href="https://tailwindcss.com">Tailwind CSS</a>
        </span>
      </div>
    </footer>
  );
}
