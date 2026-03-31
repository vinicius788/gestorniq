import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/observability";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const errorMessage = error instanceof Error ? error.message : "Unexpected runtime error.";
    return {
      hasError: true,
      errorMessage,
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    reportError(error, {
      type: "react.error_boundary",
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-xl border border-destructive/30 bg-card p-6 space-y-4">
            <h1 className="text-xl font-semibold text-foreground">Application failed to load</h1>
            <p className="text-sm text-muted-foreground">
              A runtime error interrupted the initial render.
            </p>
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-foreground">
              <p className="break-words">
                <strong>Error:</strong> {this.state.errorMessage}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Open browser devtools for the full stack trace.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
