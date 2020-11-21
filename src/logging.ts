import _ from 'lodash';
import { Logger as winsLogger, createLogger, transports, format } from 'winston';

const toScreen = format.printf(({ level, message, timestamp }) => {
  return _.isObject(message)
    ? `[${timestamp}] ${level}: ${JSON.stringify(message)}`
    : `[${timestamp}] ${level}: ${message}`;
});
const myFormat = format.printf(({ level, message, timestamp }) => {
  return _.isObject(message)
    ? `{"timestamp":"${timestamp}"},{"level":"${level}"},${JSON.stringify(message)}`
    : `{"timestamp":"${timestamp}"},{"level":"${level}"},{"message":"${message}"}`;
});

class Log {
  private static instance: winsLogger;

  static getInstance(): winsLogger {
    if (!Log.instance) {
      Log.instance = createLogger({
        exitOnError: false,
        format: format.combine(format.timestamp(), format.splat(), myFormat),
        // transports: _.map(Config.logging, logEntry => {
        //   // return new DailyRotateFile(_.pick(logEntry,['filename','level']));
        //   return new DailyRotateFile(logEntry);
        // }),
        // transports: [
        //     //
        //     // - Write to all logs with level `info` and below to `combined.log`
        //     // - Write all logs error (and below) to `error.log`.
        //     //
        //     // new transports.Console(),
        //     new transports.File({ filename: 'logs/error.log', level: 'error' }),
        //     new transports.File({ filename: 'logs/audit-report.log', level: 'info' }),
        //     new transports.File({ filename: 'logs/audit-debug.log', level: 'debug' })
        //   ]
        
      });

      Log.instance.add(
        new transports.Console({
          level: 'debug',
          format: format.combine(format.colorize(), format.timestamp(), format.splat(), toScreen),
        }),
      );
    }

    return Log.instance;
  }
}

export const Logger = Log.getInstance();
