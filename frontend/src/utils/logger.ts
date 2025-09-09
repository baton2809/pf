export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private context: string;

  private constructor(context = 'App') {
    this.context = context;
    // In production, only log errors and warnings
    const isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  static getInstance(context = 'App'): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(context);
    }
    return Logger.instance;
  }

  static create(context: string): Logger {
    return new Logger(context);
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    
    return `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevel >= level;
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), error || '');
      
      // In production, could send to error tracking service
      if (process.env.NODE_ENV === 'production' && error) {
        // Example: Sentry.captureException(error);
      }
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message), data || '');
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), data || '');
    }
  }

  // Group related logs
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(`[${this.context}] ${label}`);
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`[${this.context}] ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`[${this.context}] ${label}`);
    }
  }
}

// Create loggers for different modules
export const apiLogger = Logger.create('API');
export const sseLogger = Logger.create('SSE');
export const audioLogger = Logger.create('Audio');
export const authLogger = Logger.create('Auth');
export const appLogger = Logger.create('App');