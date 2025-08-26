/**
 * Module Error Boundary - Error handling for failed modules
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import type { ModuleErrorBoundaryProps } from '../types';

/**
 * Error state interface
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  moduleName: string;
}> = ({ error, retry, moduleName }) => (
  <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
    <div className="text-red-600 dark:text-red-400 mb-4">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    
    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
      Module Failed to Load
    </h3>
    
    <p className="text-red-700 dark:text-red-300 text-center mb-4">
      The module "<strong>{moduleName}</strong>" encountered an error and could not be loaded.
    </p>
    
    <details className="w-full max-w-md mb-4">
      <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
        Show error details
      </summary>
      <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200 font-mono overflow-auto">
        <div className="mb-2">
          <strong>Error:</strong> {error.message}
        </div>
        {error.stack && (
          <div>
            <strong>Stack:</strong>
            <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
          </div>
        )}
      </div>
    </details>
    
    <div className="flex space-x-3">
      <button
        onClick={retry}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
      >
        Retry Loading
      </button>
      
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
);

/**
 * Module Error Boundary component
 */
export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  /**
   * Catch errors during rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Handle errors and perform side effects
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, this.props.moduleName);
    }

    // Log error to console
    console.error(`[ModuleErrorBoundary] Error in module "${this.props.moduleName}":`, error, errorInfo);

    // Automatic retry if enabled
    if (this.props.autoRetry && this.state.retryCount < (this.props.maxRetries || 3)) {
      const delay = this.props.retryDelay || 2000;
      
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, delay);
    }
  }

  /**
   * Clean up timeout on unmount
   */
  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Handle retry logic
   */
  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };

  /**
   * Render error fallback or children
   */
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          retry={this.handleRetry}
          moduleName={this.props.moduleName}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary (for functional components)
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    error,
    resetError,
    captureError
  };
}

/**
 * Async error boundary component
 */
export function AsyncErrorBoundary({ 
  children, 
  onError,
  fallback: Fallback = DefaultErrorFallback,
  moduleName = 'Unknown'
}: {
  children: ReactNode;
  onError?: (error: Error) => void;
  fallback?: React.ComponentType<{ error: Error; retry: () => void; moduleName: string }>;
  moduleName?: string;
}) {
  const [error, setError] = React.useState<Error | null>(null);

  const retry = React.useCallback(() => {
    setError(null);
  }, []);

  // Handle async errors
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setError(new Error(event.reason));
      if (onError) {
        onError(new Error(event.reason));
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  if (error) {
    return <Fallback error={error} retry={retry} moduleName={moduleName} />;
  }

  return (
    <ModuleErrorBoundary
      moduleName={moduleName}
      onError={onError}
      fallback={Fallback}
    >
      {children}
    </ModuleErrorBoundary>
  );
}

/**
 * Error boundary with recovery strategies
 */
export function RecoverableErrorBoundary({
  children,
  moduleName,
  recoveryStrategies = ['retry', 'fallback'],
  fallbackModule,
  maxRetries = 3,
  retryDelay = 2000,
  onError
}: {
  children: ReactNode;
  moduleName: string;
  recoveryStrategies?: Array<'retry' | 'fallback' | 'skip' | 'reload'>;
  fallbackModule?: ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}) {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [currentStrategy, setCurrentStrategy] = React.useState(0);

  const executeStrategy = React.useCallback((strategyIndex: number) => {
    const strategy = recoveryStrategies[strategyIndex];
    
    switch (strategy) {
      case 'retry':
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setError(null);
            setRetryCount(prev => prev + 1);
          }, retryDelay);
          return;
        }
        break;
        
      case 'fallback':
        if (fallbackModule) {
          return;
        }
        break;
        
      case 'reload':
        window.location.reload();
        return;
        
      case 'skip':
        setError(null);
        return;
    }
    
    // Move to next strategy if current one failed
    if (strategyIndex + 1 < recoveryStrategies.length) {
      setCurrentStrategy(strategyIndex + 1);
      executeStrategy(strategyIndex + 1);
    }
  }, [recoveryStrategies, retryCount, maxRetries, retryDelay, fallbackModule]);

  const handleRetry = React.useCallback(() => {
    setCurrentStrategy(0);
    executeStrategy(0);
  }, [executeStrategy]);

  if (error) {
    const strategy = recoveryStrategies[currentStrategy];
    
    if (strategy === 'fallback' && fallbackModule) {
      return <>{fallbackModule}</>;
    }
    
    return (
      <DefaultErrorFallback
        error={error}
        retry={handleRetry}
        moduleName={moduleName}
      />
    );
  }

  return (
    <ModuleErrorBoundary
      moduleName={moduleName}
      onError={(error) => {
        setError(error);
        executeStrategy(0);
        if (onError) {
          onError(error);
        }
      }}
    >
      {children}
    </ModuleErrorBoundary>
  );
}