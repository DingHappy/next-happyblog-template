'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  quality = 80,
  onError,
}: OptimizedImageProps) {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setIsError(true);
    setIsLoading(false);
    onError?.();
  };

  if (isError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-slate-700 ${className}`}>
        <span className="text-4xl">🖼️</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && !priority && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-slate-700 animate-pulse">
          <span className="text-2xl">⏳</span>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={!fill ? width || 800 : undefined}
        height={!fill ? height || 600 : undefined}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoading(false)}
        onError={handleError}
        className={`transition-opacity duration-300 ${className} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
