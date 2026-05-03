import { describe, expect, it } from 'vitest';
import { calculateReadingTime, countWords, truncateText } from '@/lib/utils';

describe('calculateReadingTime', () => {
  it('returns at least 1 minute for short content', () => {
    expect(calculateReadingTime('hi')).toBe(1);
  });

  it('rounds up based on 300 chars per minute', () => {
    const content = 'x'.repeat(900);
    expect(calculateReadingTime(content)).toBe(3);
  });

  it('ignores whitespace when counting', () => {
    const content = 'a '.repeat(600); // 600 non-whitespace chars
    expect(calculateReadingTime(content)).toBe(2);
  });
});

describe('countWords', () => {
  it('strips markdown punctuation and whitespace', () => {
    expect(countWords('# Hello\n\n*world*')).toBe('Helloworld'.length);
  });
});

describe('truncateText', () => {
  it('returns input unchanged when under limit', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('appends ellipsis when truncated', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });
});
