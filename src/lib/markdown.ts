import GithubSlugger from 'github-slugger';

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const stripped = markdown.replace(/```[\s\S]*?```/g, '');
  const headings: Heading[] = [];
  const regex = /^(#{1,3})\s+(.+?)\s*$/gm;
  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/[*_`]/g, '').trim();
    if (!text) continue;
    headings.push({ level, text, id: slugger.slug(text) });
  }
  return headings;
}
