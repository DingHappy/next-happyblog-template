import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import { FeedbackProvider } from "@/components/FeedbackProvider";
import { siteUrl } from "@/lib/site";
import { siteConfig } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
    locale: siteConfig.locale,
  },
};

const themeScript = `
(() => {
  try {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', shouldUseDark);
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteConfig.language}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <FeedbackProvider>
          <AnalyticsProvider>
            <Navbar />
            <main className="flex-1 pb-20 lg:pb-0">{children}</main>
            <Footer />
            <BackToTop />
            <MobileBottomNav />
          </AnalyticsProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
