// frontend logger - reduce console noise in production

interface LogContext {
  sessionId?: string;
  component?: string;
  [key: string]: any;
}

class FrontendLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  // only log important events, not every SSE message
  info(component: string, message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[${component}] ${message}`, context || '');
    }
  }
  
  // always log errors
  error(component: string, message: string, error?: any) {
    console.error(`[${component}] ${message}`, error || '');
  }
  
  // only log warnings in development
  warn(component: string, message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`[${component}] ${message}`, context || '');
    }
  }
  
  // critical events - always log regardless of environment
  critical(component: string, message: string, context?: LogContext) {
    console.log(`[${component}] ${message}`, context || '');
  }
  
  // debug - only in development and very verbose
  debug(component: string, message: string, context?: LogContext) {
    if (this.isDevelopment && window.localStorage.getItem('debug') === 'true') {
      console.debug(`[${component}] ${message}`, context || '');
    }
  }
}

export const logger = new FrontendLogger();