export type CommentModerationResult = {
  approved: boolean;
  reason: string | null;
};

const DEFAULT_SPAM_KEYWORDS = [
  'http://',
  'https://',
  'www.',
  '.com',
  '.cn',
  '.net',
  '.org',
  '减肥',
  '祛痘',
  '祛斑',
  '丰胸',
  '壮阳',
  '伟哥',
  '贷款',
  '放贷',
  '套现',
  '信用卡',
  '博彩',
  '赌博',
  '赚钱',
  '兼职',
  '日赚',
  '月入',
  '加微信',
  '加v',
  'seo',
  '优化',
  '排名',
  '代运营',
  '刷流量',
  'fuck',
  'shit',
  'porn',
  'sex',
  'bitch',
  '垃圾广告',
  '测试测试',
  '111',
  '222',
  '333',
  '...',
  '。。。',
  '，，，',
  '，，，，',
];

const DEFAULT_SPAM_EMAIL_DOMAINS = [
  'temp-mail.org',
  'mailinator.com',
  '10minutemail.com',
];

function envList(name: string) {
  return (process.env[name] || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getSpamKeywords() {
  return [...DEFAULT_SPAM_KEYWORDS, ...envList('COMMENT_SPAM_KEYWORDS')]
    .map((word) => word.toLowerCase());
}

function getSpamEmailDomains() {
  return [...DEFAULT_SPAM_EMAIL_DOMAINS, ...envList('COMMENT_SPAM_EMAIL_DOMAINS')]
    .map((domain) => domain.toLowerCase());
}

function getBlockedAuthors() {
  return envList('COMMENT_BLOCKED_AUTHORS');
}

export function moderateComment(input: {
  author: string;
  email?: string | null;
  content: string;
}): CommentModerationResult {
  const author = input.author.trim();
  const email = input.email?.trim() || null;
  const content = input.content.trim();
  const contentLower = content.toLowerCase();

  if (author.length < 1 || author.length > 80) {
    return { approved: false, reason: '昵称长度异常' };
  }

  if (getBlockedAuthors().includes(author.toLowerCase())) {
    return { approved: false, reason: '命中昵称黑名单' };
  }

  if (content.length < 2) {
    return { approved: false, reason: '内容过短' };
  }

  if (content.length > 2000) {
    return { approved: false, reason: '内容过长' };
  }

  const matchedKeywords = getSpamKeywords()
    .filter((keyword) => contentLower.includes(keyword))
    .slice(0, 4);
  if (matchedKeywords.length >= 2) {
    return { approved: false, reason: `命中垃圾关键词：${matchedKeywords.join(', ')}` };
  }

  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && getSpamEmailDomains().some((blockedDomain) => domain.includes(blockedDomain))) {
      return { approved: false, reason: `命中临时邮箱域名：${domain}` };
    }
  }

  if (/(.)\1{4,}/.test(content)) {
    return { approved: false, reason: '包含异常重复字符' };
  }

  if (/^[^a-zA-Z一-龥]*$/.test(content.replace(/\s/g, ''))) {
    return { approved: false, reason: '内容缺少有效文字' };
  }

  return { approved: true, reason: null };
}
