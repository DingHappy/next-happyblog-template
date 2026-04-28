'use client';

import { useEffect, useState } from 'react';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, progressPercent)));
    };

    window.addEventListener('scroll', updateProgress);
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1.5 z-50 bg-gray-200 dark:bg-gray-800">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}