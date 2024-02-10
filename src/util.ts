import { Logger } from './types';

const log_levels = {
  none: 100,
  error: 40,
  warn: 20,
  info: 10,
  debug: 0,
};

export function consoleLogger(log_level: keyof typeof log_levels = 'info') {
  const logger = {
    level: (process.env.LOG_LEVEL || log_level) as keyof typeof log_levels,
    log: function (level: keyof typeof log_levels, ...args: unknown[]) {
      if (log_levels[level] < log_levels[this.level]) return;

      console.log(`${new Date().toISOString()} [${level}]`, ...args);
    },
  };

  ['debug', 'info', 'warn', 'error'].forEach((level) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logger as any)[level] = logger.log.bind(
      logger,
      level as keyof typeof log_levels,
    );
  });

  return logger as unknown as Logger;
}
