'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

type ToolbarButton =
  | { icon: string; title: string; before: string; after?: string }
  | { icon: '|'; divider: true };

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + before.length + selected.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  }, [value, onChange]);

  const toolbarButtons = useMemo<ToolbarButton[]>(() => [
    { icon: 'H1', before: '# ', title: '一级标题 (Ctrl+1)' },
    { icon: 'H2', before: '## ', title: '二级标题 (Ctrl+2)' },
    { icon: 'H3', before: '### ', title: '三级标题 (Ctrl+3)' },
    { icon: '|', divider: true },
    { icon: 'B', before: '**', after: '**', title: '粗体 (Ctrl+B)' },
    { icon: 'I', before: '*', after: '*', title: '斜体 (Ctrl+I)' },
    { icon: 'S', before: '~~', after: '~~', title: '删除线' },
    { icon: '|', divider: true },
    { icon: '•', before: '- ', title: '无序列表 (Ctrl+L)' },
    { icon: '1.', before: '1. ', title: '有序列表' },
    { icon: '❝', before: '> ', title: '引用 (Ctrl+Q)' },
    { icon: '|', divider: true },
    { icon: '</>', before: '`', after: '`', title: '行内代码' },
    { icon: '📄', before: '\n```javascript\n', after: '\n```\n', title: '代码块' },
    { icon: '|', divider: true },
    { icon: '🔗', before: '[', after: '](url)', title: '链接 (Ctrl+K)' },
    { icon: '🖼️', before: '![', after: '](image-url)', title: '图片' },
    { icon: '➖', before: '\n---\n', title: '分割线' },
  ], []);

  const wordCount = value.replace(/[#*`\n\s]/g, '').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 300));

  const headings: { level: number; text: string; line: number }[] = [];
  value.split('\n').forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2],
        line: index,
      });
    }
  });

  const scrollToLine = (line: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lines = value.split('\n').slice(0, line);
    const charCount = lines.reduce((acc, l) => acc + l.length + 1, 0);
    
    textarea.focus();
    textarea.setSelectionRange(charCount, charCount);
    
    const lineHeight = 28.8;
    textarea.scrollTop = line * lineHeight - 100;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsUploading(true);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const imageMarkdown = `\n![${file.name}](${data.url})\n`;
          const newValue = value.slice(0, start) + imageMarkdown + value.slice(end);
          onChange(newValue);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }
    setIsUploading(false);
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + '  ' + value.slice(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertText('**', '**');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertText('*', '*');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      insertText('[', '](url)');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      insertText('- ');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
      e.preventDefault();
      insertText('> ');
    }
  }, [value, onChange, insertText]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900 p-4' : ''}`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-b-0 rounded-t-xl">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarButtons.map((button, index) => (
            'divider' in button ? (
              <span key={index} className="w-px h-5 mx-1 bg-gray-300 dark:bg-gray-600" />
            ) : (
              <button
                key={index}
                onClick={() => insertText(button.before, button.after)}
                title={button.title}
                className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {button.icon}
              </button>
            )
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'edit' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              编辑
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'split' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              并排
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              预览
            </button>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="全屏模式 (F11)"
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
          
          <div className="text-xs text-gray-400 dark:text-gray-500 border-l border-gray-300 dark:border-gray-600 pl-3">
            {wordCount} 字 · {readingTime} 分钟
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {viewMode !== 'preview' && (
          <div className={`relative ${viewMode === 'split' ? (headings.length > 0 ? 'flex-1' : 'w-1/2') : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder={placeholder}
              className="w-full h-full min-h-[400px] p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 resize-none focus:outline-none leading-relaxed border border-gray-200 dark:border-gray-700 rounded-b-xl"
              style={{ lineHeight: '1.8' }}
            />
            {(isDragging || isUploading) && (
              <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed flex items-center justify-center rounded-b-xl backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-bounce">🖼️</div>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    {isUploading ? '上传中...' : '松开鼠标上传图片'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'split' && (
          <div className="w-px bg-gray-200 dark:bg-gray-700" />
        )}

        {viewMode !== 'edit' && (
          <>
            <div 
              className={`${viewMode === 'split' ? 'flex-1' : 'w-full'} p-4 overflow-auto bg-white dark:bg-gray-900 prose dark:prose-invert prose-sm max-w-none border border-gray-200 dark:border-gray-700 rounded-b-xl`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value || placeholder || '开始写作...'}
              </ReactMarkdown>
            </div>
            
            {viewMode === 'split' && headings.length > 0 && (
              <div className="w-48 p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-auto rounded-br-xl">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  📑 大纲
                </h4>
                <nav className="space-y-1">
                  {headings.map((heading, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToLine(heading.line)}
                      className="block w-full text-left text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate py-1 transition-colors"
                      style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                    >
                      {heading.text}
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
