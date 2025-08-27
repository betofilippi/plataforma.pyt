/**
 * LazyImage - Componente otimizado para carregamento de imagens
 * Features: lazy loading, compression, progressive loading, blur-up technique
 */

import React, { 
  memo, 
  useState, 
  useEffect, 
  useRef, 
  useCallback,
  useMemo 
} from 'react';
import { useLazyImage, usePerformanceTracking } from '@/lib/performance-utils';

export interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string;
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  className?: string;
  containerClassName?: string;
  enableBlurUp?: boolean;
  threshold?: number;
  rootMargin?: string;
}

// Image compression utilities
const getOptimizedImageUrl = (src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}) => {
  // Se for URL externa ou não tiver parâmetros, retorna original
  if (src.startsWith('http') || (!options.width && !options.height && !options.quality)) {
    return src;
  }

  // Implementa otimização de imagem via query params ou serviço
  const params = new URLSearchParams();
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('f', options.format);

  return `${src}${src.includes('?') ? '&' : '?'}${params.toString()}`;
};

// Generate blur placeholder
const generateBlurPlaceholder = (width: number = 10, height: number = 10) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Create a simple gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  width,
  height,
  placeholder,
  blurDataURL,
  quality = 75,
  priority = false,
  sizes,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  className = '',
  containerClassName = '',
  enableBlurUp = true,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: LazyImageProps) {
  usePerformanceTracking('LazyImage');

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimized image URLs with different formats
  const optimizedUrls = useMemo(() => {
    const baseOptions = { width, height, quality };
    
    return {
      webp: getOptimizedImageUrl(src, { ...baseOptions, format: 'webp' }),
      avif: getOptimizedImageUrl(src, { ...baseOptions, format: 'avif' }),
      jpeg: getOptimizedImageUrl(src, { ...baseOptions, format: 'jpeg' }),
      original: src
    };
  }, [src, width, height, quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [priority, threshold, rootMargin]);

  // Generate blur placeholder if not provided
  const blurPlaceholder = useMemo(() => {
    if (blurDataURL) return blurDataURL;
    if (placeholder) return placeholder;
    if (enableBlurUp && width && height) {
      return generateBlurPlaceholder(Math.min(width, 40), Math.min(height, 40));
    }
    return '';
  }, [blurDataURL, placeholder, enableBlurUp, width, height]);

  // Handle image load
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(event);
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoaded(false);
    onError?.(event);
  }, [onError]);

  // Preload critical images
  useEffect(() => {
    if (priority && isInView) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = optimizedUrls.webp || optimizedUrls.original;
      link.as = 'image';
      if (sizes) link.setAttribute('imagesizes', sizes);
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [priority, isInView, optimizedUrls, sizes]);

  // Loading state component
  const LoadingPlaceholder = memo(() => (
    <div 
      className="animate-pulse bg-gray-300/20 flex items-center justify-center"
      style={{ 
        width: width || '100%', 
        height: height || '200px',
        objectFit,
        objectPosition
      }}
    >
      <svg 
        className="w-12 h-12 text-gray-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
        />
      </svg>
    </div>
  ));

  // Error state component
  const ErrorPlaceholder = memo(() => (
    <div 
      className="bg-red-100/10 border border-red-300/20 flex items-center justify-center"
      style={{ 
        width: width || '100%', 
        height: height || '200px',
        objectFit,
        objectPosition
      }}
    >
      <div className="text-center text-red-400">
        <svg 
          className="w-12 h-12 mx-auto mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
        <p className="text-sm">Erro ao carregar</p>
      </div>
    </div>
  ));

  // Render states
  if (hasError) {
    return (
      <div ref={containerRef} className={containerClassName}>
        <ErrorPlaceholder />
      </div>
    );
  }

  if (!isInView) {
    return (
      <div ref={containerRef} className={containerClassName}>
        {blurPlaceholder ? (
          <img
            src={blurPlaceholder}
            alt=""
            className={`${className} filter blur-sm`}
            style={{
              width: width || '100%',
              height: height || '200px',
              objectFit,
              objectPosition
            }}
          />
        ) : (
          <LoadingPlaceholder />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${containerClassName}`}>
      {/* Blur placeholder background */}
      {!isLoaded && blurPlaceholder && (
        <img
          src={blurPlaceholder}
          alt=""
          className={`absolute inset-0 w-full h-full ${className} filter blur-sm transition-opacity duration-300`}
          style={{ objectFit, objectPosition }}
        />
      )}

      {/* Loading placeholder */}
      {!isLoaded && !blurPlaceholder && <LoadingPlaceholder />}

      {/* Main image with modern format support */}
      <picture>
        {/* AVIF format for modern browsers */}
        <source srcSet={optimizedUrls.avif} type="image/avif" sizes={sizes} />
        
        {/* WebP format for better compression */}
        <source srcSet={optimizedUrls.webp} type="image/webp" sizes={sizes} />
        
        {/* JPEG fallback */}
        <source srcSet={optimizedUrls.jpeg} type="image/jpeg" sizes={sizes} />
        
        {/* Main image element */}
        <img
          ref={imageRef}
          src={optimizedUrls.original}
          alt={alt}
          width={width}
          height={height}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectFit,
            objectPosition,
            width: width || '100%',
            height: height || 'auto'
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          {...props}
        />
      </picture>
    </div>
  );
});

// Image gallery with lazy loading
export interface LazyImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
    caption?: string;
  }>;
  columns?: number;
  spacing?: number;
  aspectRatio?: number;
  onImageClick?: (index: number, image: any) => void;
  className?: string;
}

export const LazyImageGallery = memo(function LazyImageGallery({
  images,
  columns = 3,
  spacing = 16,
  aspectRatio = 1,
  onImageClick,
  className = ''
}: LazyImageGalleryProps) {
  const handleImageClick = useCallback((index: number, image: any) => {
    onImageClick?.(index, image);
  }, [onImageClick]);

  return (
    <div 
      className={`grid gap-${spacing/4} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${spacing}px`
      }}
    >
      {images.map((image, index) => (
        <div
          key={`${image.src}-${index}`}
          className="relative group cursor-pointer"
          style={{
            aspectRatio: aspectRatio.toString()
          }}
          onClick={() => handleImageClick(index, image)}
        >
          <LazyImage
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="w-full h-full rounded-lg transition-transform group-hover:scale-105"
            containerClassName="w-full h-full"
            objectFit="cover"
            quality={80}
            sizes={`(max-width: 768px) 100vw, (max-width: 1200px) ${100 / columns}vw, ${100 / columns}vw`}
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
          
          {/* Caption */}
          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
              {image.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

// Hook for image preloading
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    urls.forEach(url => {
      if (loadedImages.has(url) || failedImages.has(url)) return;

      const img = new Image();
      
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, url]));
      };
      
      img.onerror = () => {
        setFailedImages(prev => new Set([...prev, url]));
      };
      
      img.src = url;
    });
  }, [urls, loadedImages, failedImages]);

  return {
    loadedImages,
    failedImages,
    isLoaded: (url: string) => loadedImages.has(url),
    hasFailed: (url: string) => failedImages.has(url)
  };
}