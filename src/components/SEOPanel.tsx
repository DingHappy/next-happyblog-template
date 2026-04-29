'use client';

interface SEOScore {
  title: { score: number; message: string };
  description: { score: number; message: string };
  content: { score: number; message: string };
  headings: { score: number; message: string };
  images: { score: number; message: string };
  links: { score: number; message: string };
}

interface SEOPanelProps {
  title?: string;
  description?: string;
  content?: string;
}

export default function SEOPanel({ title = '', description = '', content = '' }: SEOPanelProps) {
  const scores = analyzeSEO(title, description, content);

  const totalScore = Math.round(
    Object.values(scores).reduce((sum, item) => sum + item.score, 0) /
    Object.keys(scores).length
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          SEO 分析
        </h3>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
            totalScore >= 80
              ? 'bg-green-100 text-green-700'
              : totalScore >= 60
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          <span>{totalScore >= 80 ? '✅' : totalScore >= 60 ? '⚠️' : '❌'}</span>
          <span>{totalScore}/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(scores).map(([key, value]) => (
          <div key={key} className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                value.score >= 80
                  ? 'bg-green-100 text-green-600'
                  : value.score >= 50
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {value.score >= 80 ? '✓' : value.score >= 50 ? '!' : '✗'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 capitalize">{key}</p>
              <p className="text-xs text-gray-500">{value.message}</p>
            </div>
            <div className="text-xs font-mono text-gray-400 w-8 text-right">{value.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function analyzeSEO(title: string, description: string, content: string): SEOScore {
  // 标题分析
  let titleScore = 0;
  let titleMessage = '';
  if (title.length === 0) {
    titleMessage = '请添加文章标题';
  } else if (title.length < 30) {
    titleScore = 60;
    titleMessage = `标题偏短 (${title.length} 字)，建议 30-60 字`;
  } else if (title.length > 70) {
    titleScore = 70;
    titleMessage = `标题偏长 (${title.length} 字)，建议 30-60 字`;
  } else {
    titleScore = 100;
    titleMessage = `标题长度合适 (${title.length} 字)`;
  }

  // 描述分析
  let descScore = 0;
  let descMessage = '';
  if (description.length === 0) {
    descMessage = '请添加文章摘要/描述';
  } else if (description.length < 50) {
    descScore = 60;
    descMessage = `摘要偏短 (${description.length} 字)，建议 50-160 字`;
  } else if (description.length > 200) {
    descScore = 70;
    descMessage = `摘要偏长 (${description.length} 字)，建议 50-160 字`;
  } else {
    descScore = 100;
    descMessage = `摘要长度合适 (${description.length} 字)`;
  }

  // 内容分析
  const contentLength = content.replace(/\s/g, '').length;
  let contentScore = 0;
  let contentMessage = '';
  if (contentLength === 0) {
    contentMessage = '请添加文章内容';
  } else if (contentLength < 300) {
    contentScore = 40;
    contentMessage = `内容较少 (${contentLength} 字)，建议至少 300 字`;
  } else if (contentLength < 1000) {
    contentScore = 70;
    contentMessage = `内容长度一般 (${contentLength} 字)，建议 1000 字以上`;
  } else {
    contentScore = 100;
    contentMessage = `内容长度良好 (${contentLength} 字)`;
  }

  // 标题层级分析
  const h1Matches = (content.match(/^#\s+/gm) || []).length;
  const h2Matches = (content.match(/^##\s+/gm) || []).length;
  let headingScore = 0;
  let headingMessage = '';
  if (h1Matches === 0 && h2Matches === 0) {
    headingMessage = '建议使用标题层级 (H1-H3) 组织内容';
  } else if (h1Matches > 1) {
    headingScore = 60;
    headingMessage = `找到 ${h1Matches} 个 H1 标题，建议只有 1 个 H1`;
  } else if (h2Matches < 2) {
    headingScore = 70;
    headingMessage = `找到 ${h2Matches} 个 H2 标题，建议 2 个以上`;
  } else {
    headingScore = 100;
    headingMessage = `标题层级良好 (${h2Matches} 个 H2)`;
  }

  // 图片分析
  const imageMatches = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  let imageScore = 0;
  let imageMessage = '';
  if (imageMatches === 0) {
    imageScore = 50;
    imageMessage = '建议添加配图提升阅读体验';
  } else {
    imageScore = 100;
    imageMessage = `包含 ${imageMatches} 张配图`;
  }

  // 内链分析
  const linkMatches = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  let linkScore = 0;
  let linkMessage = '';
  if (linkMatches === 0) {
    linkScore = 50;
    linkMessage = '建议添加相关文章内链';
  } else {
    linkScore = 100;
    linkMessage = `包含 ${linkMatches} 个链接`;
  }

  return {
    title: { score: titleScore, message: titleMessage },
    description: { score: descScore, message: descMessage },
    content: { score: contentScore, message: contentMessage },
    headings: { score: headingScore, message: headingMessage },
    images: { score: imageScore, message: imageMessage },
    links: { score: linkScore, message: linkMessage },
  };
}
