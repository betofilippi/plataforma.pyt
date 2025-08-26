/**
 * Loading Fallback - Beautiful loading states for modules
 */

import React from 'react';
import type { LoadingFallbackProps } from '../types';

/**
 * Default loading component
 */
const DefaultLoadingComponent: React.FC<{
  moduleName?: string;
  progress?: number;
  message?: string;
  animation: 'spinner' | 'progress' | 'skeleton' | 'pulse';
  size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
}> = ({ moduleName, progress, message, animation, size, theme }) => {
  const getThemeClasses = () => {
    if (theme === 'auto') {
      return 'text-gray-600 dark:text-gray-400';
    }
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4';
      case 'large':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  const getContainerPadding = () => {
    switch (size) {
      case 'small':
        return 'p-2';
      case 'large':
        return 'p-8';
      default:
        return 'p-4';
    }
  };

  const renderSpinner = () => (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${getSizeClasses()}`} />
  );

  const renderProgress = () => (
    <div className="w-full max-w-xs">
      <div className="flex justify-between text-xs mb-1">
        <span>Loading...</span>
        <span>{progress ?? 0}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-300 rounded dark:bg-gray-600"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 rounded w-3/4 dark:bg-gray-600"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2 dark:bg-gray-600"></div>
      </div>
    </div>
  );

  const renderPulse = () => (
    <div className={`animate-pulse bg-gray-300 rounded dark:bg-gray-600 ${getSizeClasses()}`} />
  );

  const renderAnimation = () => {
    switch (animation) {
      case 'progress':
        return renderProgress();
      case 'skeleton':
        return renderSkeleton();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${getContainerPadding()} ${getThemeClasses()}`}>
      <div className="flex flex-col items-center space-y-3">
        {renderAnimation()}
        
        <div className="text-center space-y-1">
          {moduleName && (
            <p className="text-sm font-medium">
              Loading {moduleName}
            </p>
          )}
          
          {message && (
            <p className="text-xs opacity-75">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Loading Fallback component
 */
export function LoadingFallback({
  moduleName,
  progress,
  message,
  component: CustomComponent,
  animation = 'spinner',
  size = 'medium',
  theme = 'auto'
}: LoadingFallbackProps) {
  if (CustomComponent) {
    return <CustomComponent moduleName={moduleName} progress={progress} message={message} />;
  }

  return (
    <DefaultLoadingComponent
      moduleName={moduleName}
      progress={progress}
      message={message}
      animation={animation}
      size={size}
      theme={theme}
    />
  );
}

/**
 * Skeleton loading component for module placeholders
 */
export function ModuleSkeleton({ 
  height = 'h-64', 
  className = '' 
}: { 
  height?: string; 
  className?: string; 
}) {
  return (
    <div className={`animate-pulse ${height} ${className}`}>
      <div className="bg-gray-300 dark:bg-gray-600 h-full rounded-lg flex flex-col">
        {/* Header skeleton */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-4 bg-gray-400 dark:bg-gray-500 rounded w-1/3"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 p-4 space-y-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded"></div>
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-5/6"></div>
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-4/6"></div>
          </div>
          
          <div className="space-y-2">
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-3/4"></div>
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-1/2"></div>
          </div>
        </div>
        
        {/* Footer skeleton */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-20"></div>
            <div className="h-3 bg-gray-400 dark:bg-gray-500 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Progress ring component
 */
export function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 3, 
  className = '' 
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-300 dark:text-gray-600"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-blue-600 transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Dots loading animation
 */
export function DotsLoader({ 
  size = 'medium', 
  className = '' 
}: {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const getDotSize = () => {
    switch (size) {
      case 'small':
        return 'w-1 h-1';
      case 'large':
        return 'w-3 h-3';
      default:
        return 'w-2 h-2';
    }
  };

  const dotClass = `bg-current rounded-full ${getDotSize()} animate-pulse`;

  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className={dotClass} style={{ animationDelay: '0ms' }}></div>
      <div className={dotClass} style={{ animationDelay: '150ms' }}></div>
      <div className={dotClass} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

/**
 * Shimmer loading effect
 */
export function ShimmerLoader({ 
  className = '',
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
    </div>
  );
}