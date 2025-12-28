// lib/logger/logger.service.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  level?: LogLevel;
  tag?: string;
  data?: any;
}

class LoggerService {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private getCallerName(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const stackLines = stack.split('\n');

    // Start from index 1 to skip the Error line itself
    for (let i = 1; i < stackLines.length; i++) {
      const line = stackLines[i].trim();

      if (!line) continue;

      // Skip logger internal methods
      if (line.includes('getCallerName') ||
        line.includes('formatMessage') ||
        line.includes('logger.service') ||
        line.match(/at (log|debug|info|warn|error) \(/)) {
        continue;
      }

      // Skip framework/library code
      if (line.includes('node_modules') ||
        line.includes('InternalBytecode') ||
        line.includes('native') ||
        line.includes('asyncGeneratorStep') ||
        line.includes('_next') ||
        line.includes('tryCallOne') ||
        line.includes('tryCallTwo')) {
        continue;
      }

      // React Native Metro bundler format: "at functionName (http://.../{file}.bundle//...)"
      // Extract the bundle filename which tells us the source file
      const bundleMatch = line.match(/at\s+([^\s(]+)\s+\(http[^)]*\/([^/]+)\.bundle/);
      if (bundleMatch) {
        const fileName = bundleMatch[2];
        return fileName;
      }
    }

    return 'unknown';
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = this.formatTimestamp();
    const caller = this.getCallerName();
    const tag = options?.tag ? `.${options.tag}` : '';
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    return `${levelEmoji} [${timestamp}] ${caller}${tag}: ${message}`;
  }

  private log(level: LogLevel, message: string, options?: LogOptions): void {
    const formattedMessage = this.formatMessage(level, message, options);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, options?.data || '');
        break;
      case 'info':
        console.info(formattedMessage, options?.data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, options?.data || '');
        break;
      case 'error':
        console.error(formattedMessage, options?.data || '');
        break;
    }
  }

  debug(message: string, dataOrOptions?: any): void {
    const options = this.normalizeOptions(dataOrOptions);
    this.log('debug', message, { ...options, level: 'debug' });
  }

  info(message: string, dataOrOptions?: any): void {
    const options = this.normalizeOptions(dataOrOptions);
    this.log('info', message, { ...options, level: 'info' });
  }

  warn(message: string, dataOrOptions?: any): void {
    const options = this.normalizeOptions(dataOrOptions);
    this.log('warn', message, { ...options, level: 'warn' });
  }

  error(message: string, dataOrOptions?: any): void {
    const options = this.normalizeOptions(dataOrOptions);
    this.log('error', message, { ...options, level: 'error' });
  }

  private normalizeOptions(dataOrOptions?: any): Omit<LogOptions, 'level'> | undefined {
    // If it's already an options object with tag or data, use it as-is
    if (dataOrOptions && typeof dataOrOptions === 'object' && ('tag' in dataOrOptions || 'data' in dataOrOptions)) {
      return dataOrOptions;
    }
    // Otherwise treat it as data
    if (dataOrOptions !== undefined) {
      return { data: dataOrOptions };
    }
    return undefined;
  }
}

export const logger = new LoggerService();