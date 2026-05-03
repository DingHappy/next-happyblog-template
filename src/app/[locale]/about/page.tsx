import { getTranslations, setRequestLocale } from 'next-intl/server';
import { siteConfig } from '@/config/site';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const cardStyles = {
  emerald: {
    wrapper: 'from-emerald-50 to-green-50 border-emerald-100 dark:from-emerald-950/40 dark:to-green-950/30 dark:border-emerald-900/50',
    title: 'text-emerald-800 dark:text-emerald-200',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  blue: {
    wrapper: 'from-blue-50 to-indigo-50 border-blue-100 dark:from-blue-950/40 dark:to-indigo-950/30 dark:border-blue-900/50',
    title: 'text-blue-800 dark:text-blue-200',
    text: 'text-blue-700 dark:text-blue-300',
  },
};

const techColors = [
  'from-cyan-400 to-blue-500',
  'from-gray-800 to-black',
  'from-blue-500 to-blue-700',
  'from-cyan-500 to-teal-500',
  'from-indigo-500 to-purple-600',
  'from-blue-600 to-blue-800',
  'from-blue-400 to-blue-600',
];

function getSocialHref(type: string, value: string) {
  if (type === 'email') return `mailto:${value}`;
  return value;
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');

  const socialEntries = Object.entries(siteConfig.socialLinks).filter(([, value]) => value);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <section className="text-center mb-16">
        <div className="relative inline-block mb-8">
          <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-[3px] shadow-2xl shadow-purple-500/25">
            <div className="w-full h-full rounded-[20px] bg-white dark:bg-slate-900 flex items-center justify-center">
              <span className="text-5xl">{siteConfig.author.avatarEmoji}</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/25">
            ✓
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {siteConfig.about.headline}
          </span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          {siteConfig.about.subtitle}
        </p>
      </section>

      <section className="relative rounded-3xl overflow-hidden mb-10 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-5" />
        <div className="relative bg-white dark:bg-slate-900 p-8 md:p-10 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xl shadow-lg shadow-orange-500/20">
              👋
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{siteConfig.about.introTitle}</h2>
          </div>
          <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
            {siteConfig.about.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="grid md:grid-cols-2 gap-6 my-8">
              {siteConfig.about.featureCards.map((card) => {
                const style = cardStyles[card.color as keyof typeof cardStyles] || cardStyles.blue;
                return (
                  <div key={card.title} className={`p-6 bg-gradient-to-br rounded-2xl border shadow-sm ${style.wrapper}`}>
                    <div className="text-3xl mb-3">{card.icon}</div>
                    <h3 className={`font-bold mb-2 text-lg ${style.title}`}>{card.title}</h3>
                    <p className={`text-sm ${style.text}`}>{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 dark:border-slate-800 mb-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/20">
            🔧
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('techStackTitle')}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {siteConfig.about.techStack.map((tech, index) => (
            <span
              key={tech}
              className={`px-5 py-3 bg-gradient-to-r ${techColors[index % techColors.length]} text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-default`}
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 dark:border-slate-800 mb-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center text-white text-xl shadow-lg shadow-pink-500/20">
            🎯
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('interestsTitle')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {siteConfig.about.interests.map(item => (
            <div key={item.label} className="text-center p-6 bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default group">
              <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
              <span className="font-bold text-gray-900 dark:text-white block mb-1">{item.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="relative p-8 md:p-12 text-white text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm shadow-lg">
            📬
          </div>
          <h2 className="text-2xl font-bold mb-4">{t('contactTitle')}</h2>
          <p className="mb-8 opacity-90 max-w-md mx-auto">
            {t('contactBlurb')}
          </p>
          <div className="flex justify-center gap-4">
            {socialEntries.length === 0 ? (
              <span className="rounded-2xl bg-white/20 px-5 py-3 text-sm font-bold backdrop-blur-sm">
                {t('contactPlaceholder')}
              </span>
            ) : socialEntries.map(([type, value]) => (
              <a
                key={type}
                href={getSocialHref(type, value)}
                className="h-14 min-w-14 bg-white/20 rounded-2xl flex items-center justify-center px-4 text-sm font-bold hover:bg-white hover:text-gray-900 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl"
                title={type}
              >
                {type}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
