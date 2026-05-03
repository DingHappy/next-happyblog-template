'use client';

import { useState, useEffect } from 'react';
import { LineChart, PieChart, BarChart } from '@/components/Charts';

interface AnalyticsData {
  period: { days: number };
  overview: {
    totalViews: number;
    totalSessions: number;
    avgDuration: number;
    avgPageViews: number;
  };
  changes: {
    totalViews: number;
    totalSessions: number;
    avgDuration: number;
    avgPageViews: number;
  };
  trend: { date: string; count: number }[];
  topPosts: { postId: string | null; slug: string | null; title: string; views: number }[];
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  referers: { name: string; count: number }[];
  internalReferrals: number;
}

export default function AnalyticsClient() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadStats = (showLoading = false) => {
      if (showLoading) setLoading(true);
      fetch(`/api/analytics/stats?days=${days}`)
        .then(res => res.json())
        .then((nextData) => {
          if (!cancelled) setData(nextData);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    loadStats(true);
    const timer = window.setInterval(() => loadStats(), 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [days]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} 秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`;
    return `${Math.floor(seconds / 3600)} 小时`;
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 访问统计
          </h1>

          {/* 时间范围选择 */}
          <div className="flex gap-2">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  days === d
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
                }`}
              >
                最近 {d} 天
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-500">暂无数据</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="总浏览量"
                value={data.overview.totalViews.toLocaleString()}
                icon="👁️"
                trend={data.changes.totalViews}
                color="from-blue-500 to-cyan-500"
              />
              <StatCard
                title="访问人次"
                value={data.overview.totalSessions.toLocaleString()}
                icon="👥"
                trend={data.changes.totalSessions}
                color="from-purple-500 to-pink-500"
              />
              <StatCard
                title="平均停留"
                value={formatDuration(data.overview.avgDuration)}
                icon="⏱️"
                trend={data.changes.avgDuration}
                color="from-green-500 to-teal-500"
              />
              <StatCard
                title="平均浏览"
                value={`${data.overview.avgPageViews} 页`}
                icon="📄"
                trend={data.changes.avgPageViews}
                color="from-orange-500 to-red-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">📈 流量趋势</h3>
                <LineChart data={data.trend} height={250} />
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">📱 设备分布</h3>
                <PieChart data={data.devices} height={200} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">🔥 热门文章 TOP 10</h3>
                <BarChart data={data.topPosts.map(p => ({ name: p.title, count: p.views }))} height={300} />
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">🌐 流量来源</h3>
                <BarChart data={data.referers} height={300} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">🌍 浏览器分布</h3>
                <PieChart data={data.browsers} height={200} />
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-purple-100 dark:border-slate-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">💡 统计说明</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <li>• 已自动过滤爬虫和机器人流量</li>
                  <li>• 数据每 10 秒自动刷新</li>
                  <li>• 访客标识有效期 1 年</li>
                  <li>• IP 和 User-Agent 已匿名化处理</li>
                  <li>• 热门文章和趋势按当前时间范围计算</li>
                  <li>• 流量来源按每次浏览的 Referer 统计，直接访问归为 direct</li>
                  <li>• 本站内部跳转不计入外部来源，本周期内部跳转 {data.internalReferrals} 次</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend: number;
  color: string;
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const trendLabel = trend > 0 ? `+${trend}%` : `${trend}%`;
  const trendClass = trend >= 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-5 rounded-bl-full -mr-8 -mt-8`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className={`text-xs mt-2 font-medium ${trendClass}`}>较上周期 {trendLabel}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
