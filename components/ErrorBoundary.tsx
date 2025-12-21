"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Error tracking service interface
 */
interface ErrorTracker {
  captureException(error: Error, context?: Record<string, any>): void;
  captureMessage(message: string, level?: 'error' | 'warning' | 'info'): void;
}

/**
 * Basic error tracker implementation
 * In production, replace with Sentry, LogRocket, or similar service
 */
class BasicErrorTracker implements ErrorTracker {
  captureException(error: Error, context?: Record<string, any>) {
    console.error('[ErrorTracker] Exception captured:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // In production, send to external service here
    // Example: Sentry.captureException(error, { contexts: { custom: context } });
  }

  captureMessage(message: string, level: 'error' | 'warning' | 'info' = 'error') {
    console[level]('[ErrorTracker] Message:', message, {
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });

    // In production, send to external service here
    // Example: Sentry.captureMessage(message, level);
  }
}

// Global error tracker instance
const errorTracker = new BasicErrorTracker();

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track the error with context
    errorTracker.captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
      errorInfo,
    });

    // Also log to console for development
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-red-100 p-3">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-red-900">Something went wrong</h2>
            </div>
            <p className="text-red-700 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-800 bg-red-100 p-3 rounded overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => window.location.reload()}
                className="neu-button inline-flex items-center justify-center gap-2 text-sm font-medium"
                style={{ fontSize: '14px', padding: '8px 20px' }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  errorTracker.captureMessage('User reported error from ErrorBoundary', 'info');
                  alert('Error report sent. Thank you for helping us improve!');
                }}
                className="neu-button-secondary inline-flex items-center justify-center gap-2 text-sm font-medium"
                style={{ fontSize: '14px', padding: '8px 20px' }}
              >
                Report Error
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
