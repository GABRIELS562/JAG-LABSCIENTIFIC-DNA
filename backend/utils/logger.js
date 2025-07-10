const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += ` | Meta: ${JSON.stringify(meta)}`;
  }
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  return log;
});

const createTransports = () => {
  const transports = [];

  if (process.env.NODE_ENV === 'development') {
    transports.push(
      new winston.transports.Console({
        format: combine(
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          customFormat
        )
      })
    );
  }

  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
      )
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
      )
    })
  );

  return transports;
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: createTransports(),
  exitOnError: false,
});

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

const databaseLogger = {
  query: (sql, params = []) => {
    logger.debug('Database Query', {
      sql: sql.substring(0, 500) + (sql.length > 500 ? '...' : ''),
      params: params.length > 0 ? params : undefined,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (error, sql = null, params = []) => {
    logger.error('Database Error', {
      error: error.message,
      sql: sql ? sql.substring(0, 500) + (sql.length > 500 ? '...' : '') : undefined,
      params: params.length > 0 ? params : undefined,
      stack: error.stack
    });
  },
  
  transaction: (action, details = {}) => {
    logger.info('Database Transaction', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
};

const auditLogger = {
  userAction: (userId, action, resource, details = {}) => {
    logger.info('User Action', {
      userId,
      action,
      resource,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  dataChange: (userId, table, recordId, operation, oldData = null, newData = null) => {
    logger.info('Data Change', {
      userId,
      table,
      recordId,
      operation,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      timestamp: new Date().toISOString()
    });
  },
  
  systemEvent: (event, details = {}) => {
    logger.info('System Event', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

const performanceLogger = {
  measureFunction: (fnName, fn) => {
    return async (...args) => {
      const start = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - start;
        
        logger.debug('Function Performance', {
          function: fnName,
          duration: `${duration}ms`,
          success: true
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        logger.warn('Function Performance', {
          function: fnName,
          duration: `${duration}ms`,
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };
  },
  
  measureQuery: (queryName, queryFn) => {
    return performanceLogger.measureFunction(`Query:${queryName}`, queryFn);
  }
};

const createContextLogger = (context) => {
  return {
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta })
  };
};

module.exports = {
  logger,
  requestLogger,
  databaseLogger,
  auditLogger,
  performanceLogger,
  createContextLogger
};