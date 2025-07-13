"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseSafeAsyncOptions {
  showErrorToast?: boolean;
  errorToastTitle?: string;
  successToastTitle?: string;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export function useSafeAsync<T = any>(options: UseSafeAsyncOptions = {}) {
  const {
    showErrorToast = true,
    errorToastTitle = "Error",
    successToastTitle,
    onError,
    onSuccess,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>) => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFunction();
        setData(result);
        
        if (successToastTitle) {
          toast({
            title: successToastTitle,
            description: "Operation completed successfully",
          });
        }
        
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("An unknown error occurred");
        setError(error);
        
        if (showErrorToast) {
          toast({
            title: errorToastTitle,
            description: error.message || "Something went wrong. Please try again.",
            variant: "destructive",
          });
        }
        
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast, showErrorToast, errorToastTitle, successToastTitle, onError, onSuccess]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}