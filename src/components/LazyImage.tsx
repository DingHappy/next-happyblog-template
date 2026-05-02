'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  imageClassName = '',
  fill = false,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* 骨架屏占位 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse" />
      )}

      {/* 实际图片 */}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          className={`transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${fill ? 'object-cover' : ''} ${imageClassName}`}
          onLoad={() => setIsLoaded(true)}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          sizes={sizes}
        />
      )}
    </div>
  );
}
