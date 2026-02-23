interface ErrorContext {
  [key: string]: unknown;
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || null;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

export function reportError(error: unknown, context: ErrorContext = {}) {
  const payload = {
    ts: new Date().toISOString(),
    source: "frontend",
    error: serializeError(error),
    context,
  };

  // Structured console output is the baseline signal when a dedicated error tracker is not configured.
  console.error("[OBSERVABILITY]", payload);

  // Stub integration hook: if Sentry DSN exists and SDK is added later, this is the single integration point.
  if (SENTRY_DSN) {
    console.warn("Sentry DSN detected but Sentry SDK is not installed. Add @sentry/browser to enable remote reporting.");
  }
}

export function initObservability() {
  window.addEventListener("error", (event) => {
    reportError(event.error || event.message, {
      type: "window.error",
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, {
      type: "window.unhandledrejection",
    });
  });
}
