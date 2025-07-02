import { useState, useCallback } from 'react';

export interface LoadingState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (promise: Promise<T>) => Promise<T>;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

/**
 * Hook to manage loading state for async operations
 * Replaces the repetitive pattern of useState for isLoading, error, and data
 * 
 * @param initialData - Optional initial data
 * @returns Object with data, loading state, error, and helper functions
 */
export function useLoadingState<T = any>(initialData: T | null = null): LoadingState<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (promise: Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await promise;
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
  }, [initialData]);

  return {
    data,
    isLoading,
    error,
    execute,
    setData,
    setError,
    setIsLoading,
    reset
  };
}

/**
 * Hook specifically for loading state without data management
 * Useful for operations that don't return data (e.g., delete operations)
 */
export function useLoadingOnly() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (promise: Promise<void>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await promise;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    setError,
    setIsLoading,
    reset
  };
}