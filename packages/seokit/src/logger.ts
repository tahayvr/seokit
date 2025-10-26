/**
 * Logging utility for SeoKit Image Engine
 * Provides structured logging with different log levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(
    level: string,
    message: string,
    meta?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix;
    let formatted = `[${timestamp}] [${prefix}] ${level}: ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      formatted += ` ${JSON.stringify(meta)}`;
    }

    return formatted;
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage("ERROR", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage("INFO", message, meta));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage("DEBUG", message, meta));
    }
  }

  // Convenience methods for specific use cases
  logRequest(method: string, path: string, params?: URLSearchParams): void {
    const meta: Record<string, unknown> = { method, path };
    if (params && params.toString()) {
      meta.params = params.toString();
    }
    this.info(`Incoming request`, meta);
  }

  logTemplateRequest(url: string, params?: URLSearchParams): void {
    const meta: Record<string, unknown> = { url };
    if (params && params.toString()) {
      meta.params = params.toString();
    }
    this.info(`Fetching template HTML`, meta);
  }

  logTemplateResponse(url: string, htmlLength: number, duration: number): void {
    this.info(`Template HTML received`, {
      url,
      htmlLength,
      durationMs: duration,
    });
  }

  logImageGeneration(stage: string, details: Record<string, unknown>): void {
    this.info(`Image generation: ${stage}`, details);
  }

  logImageComplete(totalDuration: number, size: number): void {
    this.info(`Image generated successfully`, {
      durationMs: totalDuration,
      sizeBytes: size,
    });
  }

  logImageError(
    error: string,
    duration: number,
    details?: Record<string, unknown>
  ): void {
    this.error(`Image generation failed`, {
      error,
      durationMs: duration,
      ...details,
    });
  }
}

// Create default logger instance
let defaultLogger: Logger;

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  const logLevel = process.env.LOG_LEVEL
    ? LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel] ??
      LogLevel.INFO
    : LogLevel.INFO;

  return new Logger({
    level: config?.level ?? logLevel,
    prefix: config?.prefix ?? "Image Engine",
  });
}

export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

export function setLogger(logger: Logger): void {
  defaultLogger = logger;
}
