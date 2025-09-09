export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, context: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMsg = `[${timestamp}] [${level}] [${context}] ${message}`;
    
    if (data) {
      return `${baseMsg} ${JSON.stringify(data, null, 2)}`;
    }
    
    return baseMsg;
  }

  error(context: string, message: string, error?: Error | any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      const errorData = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error;
      
      console.error(this.formatMessage('ERROR', context, message, errorData));
    }
  }

  warn(context: string, message: string, data?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', context, message, data));
    }
  }

  info(context: string, message: string, data?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', context, message, data));
    }
  }

  debug(context: string, message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', context, message, data));
    }
  }

  // Performance logging
  startTimer(context: string, operation: string): () => void {
    const start = Date.now();
    this.debug(context, `Starting ${operation}`);
    
    return () => {
      const duration = Date.now() - start;
      this.info(context, `Completed ${operation}`, { duration: `${duration}ms` });
    };
  }
}

export const logger = Logger.getInstance();