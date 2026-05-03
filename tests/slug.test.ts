import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('collapses repeated dashes', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
  });

  it('strips punctuation but keeps CJK characters', () => {
    expect(slugify('你好, world!')).toBe('你好-world');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });
});
