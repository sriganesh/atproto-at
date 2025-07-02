import { useCallback } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  statusCode?: number;
  context?: string;
  timestamp: Date;
  details?: any;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  fallbackMessage?: string;
}

/**
 * Custom hook for centralized error handling
 * Provides consistent error processing and reporting across the application
 */
export function useErrorHandler(defaultOptions?: ErrorHandlerOptions) {
  const handleError = useCallback((
    error: unknown,
    context?: string,
    options?: ErrorHandlerOptions
  ): ErrorInfo => {
    const opts = { 
      showNotification: true, 
      logToConsole: true,
      ...defaultOptions,
      ...options 
    };

    // Extract error information
    const errorInfo: ErrorInfo = {
      message: 'An unexpected error occurred',
      timestamp: new Date(),
      context
    };

    if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.details = error.stack;
    } else if (typeof error === 'string') {
      errorInfo.message = error;
    } else if (error && typeof error === 'object') {
      // Handle API error responses
      const apiError = error as any;
      if (apiError.error) {
        errorInfo.message = apiError.error;
      } else if (apiError.message) {
        errorInfo.message = apiError.message;
      }
      
      if (apiError.code) {
        errorInfo.code = apiError.code;
      }
      
      if (apiError.status || apiError.statusCode) {
        errorInfo.statusCode = apiError.status || apiError.statusCode;
      }
      
      errorInfo.details = error;
    }

    // Apply fallback message if provided
    if (opts.fallbackMessage && errorInfo.message === 'An unexpected error occurred') {
      errorInfo.message = opts.fallbackMessage;
    }

    // Log to console if enabled
    if (opts.logToConsole) {
      const logMessage = context 
        ? `Error in ${context}:` 
        : 'Error:';
      console.error(logMessage, error);
    }

    // In a real app, you might send errors to a monitoring service here
    // Example: sendToErrorMonitoring(errorInfo);

    return errorInfo;
  }, [defaultOptions]);

  const clearError = useCallback(() => {
    // This could clear any global error state if needed
    // For now, it's a placeholder for future expansion
  }, []);

  return {
    handleError,
    clearError
  };
}

/**
 * Categorize errors based on their type or status code
 */
export function categorizeError(error: ErrorInfo): 'network' | 'validation' | 'authorization' | 'server' | 'unknown' {
  if (error.statusCode) {
    if (error.statusCode >= 400 && error.statusCode < 500) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return 'authorization';
      }
      return 'validation';
    }
    if (error.statusCode >= 500) {
      return 'server';
    }
  }

  const message = error.message.toLowerCase();
  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  }
  
  if (message.includes('invalid') || message.includes('required')) {
    return 'validation';
  }

  return 'unknown';
}

/**
 * Get user-friendly error message based on error category
 */
export function getUserFriendlyMessage(error: ErrorInfo): string {
  const category = categorizeError(error);
  
  switch (category) {
    case 'network':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'validation':
      return error.message; // Validation errors are usually already user-friendly
    case 'authorization':
      return 'You are not authorized to perform this action.';
    case 'server':
      return 'Something went wrong on our end. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}