interface LogEntry {
  ts: string;
  level: "info" | "error";
  function: string;
  request_id: string;
  event: string;
  user_id?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

const nowIso = () => new Date().toISOString();

export function createRequestLogger(functionName: string, req: Request) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();
  let userId: string | undefined;

  const emit = (level: LogEntry["level"], event: string, details: Record<string, unknown> = {}) => {
    const entry: LogEntry = {
      ts: nowIso(),
      level,
      function: functionName,
      request_id: requestId,
      event,
      ...details,
    };

    if (userId) {
      entry.user_id = userId;
    }

    if (level === "error") {
      console.error(JSON.stringify(entry));
      return;
    }

    console.log(JSON.stringify(entry));
  };

  return {
    requestId,
    setUserId: (value: string) => {
      userId = value;
    },
    info: (event: string, details?: Record<string, unknown>) => emit("info", event, details),
    error: (event: string, details?: Record<string, unknown>) => emit("error", event, details),
    done: (event = "request.completed", details: Record<string, unknown> = {}) =>
      emit("info", event, { duration_ms: Date.now() - startedAt, ...details }),
    fail: (event = "request.failed", details: Record<string, unknown> = {}) =>
      emit("error", event, { duration_ms: Date.now() - startedAt, ...details }),
  };
}
