type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
};

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context !== undefined) {
    payload.context = context;
  }

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function info(message: string, context?: Record<string, unknown>): void {
  log("info", message, context);
}

export function warn(message: string, context?: Record<string, unknown>): void {
  log("warn", message, context);
}

export function error(message: string, context?: Record<string, unknown>): void {
  log("error", message, context);
}
