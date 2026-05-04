'use client';

// 折线图组件
interface LineChartProps {
  data: { date: string; count: number }[];
  height?: number;
}

export function LineChart({ data, height = 200 }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.count), 1);
  const minValue = Math.min(...data.map(d => d.count), 0);
  const range = maxValue - minValue || 1;

  // 生成 SVG 路径
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - ((d.count - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `0,100 ${points} 100,100 Z`;

  // Y 轴刻度
  const ticks = [0, 25, 50, 75, 100].map(pct => ({
    y: pct,
    value: Math.round(maxValue - (range * pct / 100)),
  }));

  return (
    <div style={{ height }} className="relative w-full">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {/* 网格线 */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="0.3"
            strokeDasharray="2,2"
          />
        ))}

        {/* 渐变填充 */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 面积填充 */}
        <polygon points={areaPath} fill="url(#chartGradient)" />

        {/* 折线 */}
        <polyline
          points={points}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 数据点 */}
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - ((d.count - minValue) / range) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill="#8b5cf6"
              className="hover:r-2 transition-all"
            />
          );
        })}
      </svg>

      {/* Y 轴刻度标签 */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] text-gray-400 -ml-1">
        {ticks.map(t => (
          <span key={t.y}>{t.value}</span>
        ))}
      </div>

      {/* X 轴日期标签 */}
      <div className="flex justify-between text-[8px] text-gray-400 mt-1 px-0">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
          <span key={i} className="truncate">
            {new Date(d.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  );
}

// 饼图组件
interface PieChartProps {
  data: { name: string; count: number }[];
  height?: number;
}

export function PieChart({ data, height = 150 }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'];

  // 用 forEach + push 避免 lint 对 map 中修改变量的警告
  const slices: Array<{
    name: string;
    count: number;
    path: string;
    color: string;
    percentage: string;
  }> = [];

  let startAngle = 0;
  data.forEach((item, index) => {
    const angle = (item.count / total) * 360;

    // SVG 弧线路径计算
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

    slices.push({
      ...item,
      path,
      color: colors[index % colors.length],
      percentage: ((item.count / total) * 100).toFixed(1),
    });

    startAngle += angle;
  });

  return (
    <div style={{ height }} className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-32 h-32 flex-shrink-0">
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill={slice.color}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
        {/* 中心白色圆，做成环形 */}
        <circle cx="50" cy="50" r="22" className="fill-white dark:fill-slate-800" />
      </svg>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-gray-600 dark:text-gray-400 truncate">
              {slice.name}
            </span>
            <span className="font-medium text-gray-900 dark:text-white ml-auto">
              {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 条形图组件
interface BarChartProps {
  data: { name: string; count: number }[];
  height?: number;
}

export function BarChart({ data, height = 180 }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ height }} className="flex flex-col justify-end gap-2">
      {data.map((item, index) => {
        const percentage = (item.count / maxValue) * 100;
        return (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400 w-16 truncate text-right flex-shrink-0">
              {item.name}
            </span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white w-8 text-right flex-shrink-0">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface GeoMapChartProps {
  data: { name: string; count: number; lat?: number | null; lng?: number | null }[];
  height?: number;
}

function projectPoint(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  };
}

export function GeoMapChart({ data, height = 260 }: GeoMapChartProps) {
  const heatPoints = (data || [])
    .filter((item): item is { name: string; count: number; lat: number; lng: number } => (
      typeof item.lat === 'number' && typeof item.lng === 'number'
    ));
  const unlocatedCount = (data || [])
    .filter((item) => typeof item.lat !== 'number' || typeof item.lng !== 'number')
    .reduce((sum, item) => sum + item.count, 0);

  if (heatPoints.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
        <span>暂无可定位数据</span>
        {unlocatedCount > 0 && (
          <span className="text-xs">未定位访问 {unlocatedCount} 次</span>
        )}
      </div>
    );
  }

  const maxValue = Math.max(...heatPoints.map((item) => item.count), 1);

  return (
    <div style={{ height }} className="flex flex-col gap-3">
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-700">
        <svg viewBox="0 0 100 52" className="w-full h-full" role="img" aria-label="访客位置地图">
          <defs>
            <radialGradient id="analyticsHeatmapGradient">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="34%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="67%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <filter id="analyticsHeatmapBlur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
          </defs>

          <rect width="100" height="52" className="fill-sky-50 dark:fill-slate-900" />

          {[15, 30, 45, 60, 75, 90].map((x) => (
            <line
              key={`lng-${x}`}
              x1={x}
              y1="0"
              x2={x}
              y2="52"
              className="stroke-sky-100 dark:stroke-slate-800"
              strokeWidth="0.2"
            />
          ))}
          {[13, 26, 39].map((y) => (
            <line
              key={`lat-${y}`}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              className="stroke-sky-100 dark:stroke-slate-800"
              strokeWidth="0.2"
            />
          ))}

          <g className="fill-slate-200 dark:fill-slate-700">
            <path d="M12 17 C18 9 31 8 37 16 C32 18 30 24 22 24 C17 24 13 22 12 17 Z" />
            <path d="M24 26 C31 25 36 29 35 37 C34 45 28 48 23 42 C19 37 20 30 24 26 Z" />
            <path d="M43 15 C51 9 66 10 73 18 C68 22 57 21 50 24 C46 22 42 20 43 15 Z" />
            <path d="M49 25 C56 23 62 28 61 36 C60 43 53 46 49 40 C45 34 45 28 49 25 Z" />
            <path d="M69 22 C77 16 87 17 92 25 C87 30 76 31 70 27 Z" />
            <path d="M78 35 C84 34 90 38 89 43 C85 46 78 44 76 39 Z" />
          </g>

          <g filter="url(#analyticsHeatmapBlur)">
            {heatPoints.map((item) => {
              const point = projectPoint(item.lat, item.lng);
              const intensity = item.count / maxValue;
              const radius = 5 + intensity * 11;
              return (
                <circle
                  key={`heat-${item.name}`}
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill="url(#analyticsHeatmapGradient)"
                  opacity={0.45 + intensity * 0.45}
                />
              );
            })}
          </g>

          {heatPoints.map((item) => {
            const point = projectPoint(item.lat, item.lng);
            const intensity = item.count / maxValue;
            return (
              <g key={item.name}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="0.9"
                  className="fill-white"
                  opacity={0.9}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="0.45"
                  fill={intensity > 0.65 ? '#991b1b' : '#1d4ed8'}
                >
                  <title>{`${item.name}: ${item.count}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>低</span>
        <div
          className="h-2 flex-1 rounded-full"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #22c55e, #f59e0b, #ef4444)' }}
        />
        <span>高</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {heatPoints.slice(0, 4).map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
            <span className="ml-auto font-medium text-gray-900 dark:text-white">{item.count}</span>
          </div>
        ))}
        {unlocatedCount > 0 && (
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 flex-shrink-0" />
            <span className="text-gray-500 dark:text-gray-400 truncate">未定位</span>
            <span className="ml-auto font-medium text-gray-900 dark:text-white">{unlocatedCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
