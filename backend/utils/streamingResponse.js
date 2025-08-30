const { Transform, Readable } = require('stream');
const { logger } = require('./logger');

/**
 * Streaming Response Handler
 * Handles large dataset responses with streaming to prevent memory overload
 */
class StreamingResponse {
  constructor() {
    this.defaultChunkSize = 100;
    this.maxMemoryPerResponse = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Stream database results as JSON
   */
  streamDatabaseResults(res, query, params = [], options = {}) {
    const chunkSize = options.chunkSize || this.defaultChunkSize;
    const dbPool = options.dbPool;
    
    if (!dbPool) {
      logger.error('Database pool required for streaming');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    let totalCount = 0;
    let sentCount = 0;
    let isFirstChunk = true;

    try {
      // Get total count first
      const countQuery = query.replace(/SELECT.*?FROM/i, 'SELECT COUNT(*) as total FROM');
      const countResult = dbPool.executeRead(countQuery, params);
      totalCount = countResult[0]?.total || 0;

      // Set appropriate headers
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'X-Total-Count': totalCount,
        'Cache-Control': 'no-cache'
      });

      // Start JSON array
      res.write('{"data":[');

      // Create streaming query
      const limitQuery = query + ` LIMIT ${chunkSize} OFFSET ?`;
      let offset = 0;

      const streamChunk = () => {
        try {
          const results = dbPool.executeRead(limitQuery, [...params, offset]);
          
          if (results.length === 0) {
            // End of data
            res.write(`],"pagination":{"total":${totalCount},"sent":${sentCount}}}`);
            res.end();
            logger.info('Streaming response completed', {
              totalRecords: totalCount,
              sentRecords: sentCount
            });
            return;
          }

          // Write results
          results.forEach((row, index) => {
            if (!isFirstChunk || index > 0 || sentCount > 0) {
              res.write(',');
            }
            res.write(JSON.stringify(row));
            sentCount++;
          });

          isFirstChunk = false;
          offset += chunkSize;

          // Continue with next chunk
          setImmediate(streamChunk);

        } catch (error) {
          logger.error('Streaming chunk error', { error: error.message, offset });
          res.write(`],"error":"Streaming error: ${error.message}"}`);
          res.end();
        }
      };

      // Start streaming
      streamChunk();

    } catch (error) {
      logger.error('Streaming setup error', { error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to setup streaming response' });
      }
    }
  }

  /**
   * Stream JSON array with backpressure handling
   */
  streamJSONArray(res, dataArray, options = {}) {
    const chunkSize = options.chunkSize || this.defaultChunkSize;
    const transformFn = options.transform || ((item) => item);

    return new Promise((resolve, reject) => {
      let index = 0;
      let sentCount = 0;

      // Set headers
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'X-Total-Count': dataArray.length
      });

      // Start JSON
      res.write('{"data":[');

      const writeChunk = () => {
        try {
          let canContinue = true;
          let chunkCount = 0;

          while (canContinue && index < dataArray.length && chunkCount < chunkSize) {
            const item = transformFn(dataArray[index]);
            
            if (sentCount > 0) {
              res.write(',');
            }
            
            canContinue = res.write(JSON.stringify(item));
            sentCount++;
            index++;
            chunkCount++;
          }

          if (index >= dataArray.length) {
            // End of data
            res.write(`],"total":${dataArray.length}}`);
            res.end();
            resolve(sentCount);
            return;
          }

          if (!canContinue) {
            // Wait for drain event
            res.once('drain', writeChunk);
          } else {
            // Continue with next chunk
            setImmediate(writeChunk);
          }

        } catch (error) {
          logger.error('Streaming array error', { error: error.message });
          reject(error);
        }
      };

      writeChunk();
    });
  }

  /**
   * Create a readable stream from database query
   */
  createDatabaseStream(dbPool, query, params = [], options = {}) {
    const chunkSize = options.chunkSize || this.defaultChunkSize;
    let offset = 0;
    let ended = false;

    return new Readable({
      objectMode: true,
      read() {
        if (ended) return;

        try {
          const limitQuery = query + ` LIMIT ${chunkSize} OFFSET ${offset}`;
          const results = dbPool.executeRead(limitQuery, params);

          if (results.length === 0) {
            ended = true;
            this.push(null);
            return;
          }

          results.forEach(row => this.push(row));
          offset += chunkSize;

        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Transform stream for processing data chunks
   */
  createTransformStream(transformFn) {
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const transformed = transformFn(chunk);
          callback(null, transformed);
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Stream CSV data
   */
  streamCSV(res, data, columns, options = {}) {
    const chunkSize = options.chunkSize || this.defaultChunkSize;
    
    return new Promise((resolve, reject) => {
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export.csv"',
        'Transfer-Encoding': 'chunked'
      });

      // Write CSV header
      res.write(columns.join(',') + '\n');

      let index = 0;

      const writeCSVChunk = () => {
        try {
          let chunkCount = 0;
          let csvChunk = '';

          while (index < data.length && chunkCount < chunkSize) {
            const row = data[index];
            const csvRow = columns.map(col => {
              const value = row[col] || '';
              // Escape CSV values
              return typeof value === 'string' && value.includes(',') 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
            }).join(',');
            
            csvChunk += csvRow + '\n';
            index++;
            chunkCount++;
          }

          if (csvChunk) {
            res.write(csvChunk);
          }

          if (index >= data.length) {
            res.end();
            resolve(index);
            return;
          }

          setImmediate(writeCSVChunk);

        } catch (error) {
          logger.error('CSV streaming error', { error: error.message });
          reject(error);
        }
      };

      writeCSVChunk();
    });
  }

  /**
   * Handle large response with memory monitoring
   */
  handleLargeResponse(res, dataFn, options = {}) {
    const startMemory = process.memoryUsage();
    const maxMemoryIncrease = options.maxMemoryIncrease || this.maxMemoryPerResponse;

    return new Promise(async (resolve, reject) => {
      try {
        const memoryCheckInterval = setInterval(() => {
          const currentMemory = process.memoryUsage();
          const memoryIncrease = currentMemory.heapUsed - startMemory.heapUsed;

          if (memoryIncrease > maxMemoryIncrease) {
            clearInterval(memoryCheckInterval);
            logger.warn('Memory threshold exceeded during response', {
              increase: Math.round(memoryIncrease / 1024 / 1024),
              limit: Math.round(maxMemoryIncrease / 1024 / 1024)
            });
            
            if (!res.headersSent) {
              res.status(413).json({ 
                error: 'Response too large',
                memoryUsage: Math.round(memoryIncrease / 1024 / 1024) + 'MB'
              });
            }
            reject(new Error('Memory limit exceeded'));
            return;
          }
        }, 1000);

        const result = await dataFn();
        clearInterval(memoryCheckInterval);
        resolve(result);

      } catch (error) {
        logger.error('Large response handler error', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Stream paginated results
   */
  async streamPaginatedResults(res, query, totalCount, options = {}) {
    const pageSize = options.pageSize || 1000;
    const dbPool = options.dbPool;
    
    if (!dbPool) {
      throw new Error('Database pool required');
    }

    let offset = 0;
    let isFirstPage = true;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'X-Total-Count': totalCount
    });

    res.write('{"data":[');

    while (offset < totalCount) {
      const limitQuery = query + ` LIMIT ${pageSize} OFFSET ${offset}`;
      const results = dbPool.executeRead(limitQuery);

      if (results.length === 0) break;

      results.forEach((row, index) => {
        if (!isFirstPage || index > 0) {
          res.write(',');
        }
        res.write(JSON.stringify(row));
      });

      isFirstPage = false;
      offset += pageSize;

      // Allow other operations between chunks
      await new Promise(resolve => setImmediate(resolve));
    }

    res.write(`],"total":${totalCount}}`);
    res.end();
  }
}

module.exports = new StreamingResponse();