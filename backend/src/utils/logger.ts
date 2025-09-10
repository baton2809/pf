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
      
      const logMessage = this.formatMessage('ERROR', context, message, errorData) + '\n';
      process.stderr.write(logMessage);
    }
  }

  warn(context: string, message: string, data?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      const logMessage = this.formatMessage('WARN', context, message, data) + '\n';
      process.stdout.write(logMessage);
    }
  }

  info(context: string, message: string, data?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      const logMessage = this.formatMessage('INFO', context, message, data) + '\n';
      process.stdout.write(logMessage);
    }
  }

  debug(context: string, message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      const logMessage = this.formatMessage('DEBUG', context, message, data) + '\n';
      process.stdout.write(logMessage);
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