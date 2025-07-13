"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-gray-600">
          We're sorry, but something unexpected happened. The application has encountered an error.
        </p>
        {error && process.env.NODE_ENV === "development" && (
          <div className="text-left bg-gray-100 p-4 rounded-md text-sm font-mono">
            <p className="font-bold text-red-600">{error.name}</p>
            <p className="text-gray-800">{error.message}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={retry} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => window.location.href = "/"} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ErrorBoundary, DefaultErrorFallback };