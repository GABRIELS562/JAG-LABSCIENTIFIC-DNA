class ResponseHandler {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = {}) {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static updated(res, data = null, message = 'Resource updated successfully') {
    return this.success(res, data, message, 200);
  }

  static deleted(res, message = 'Resource deleted successfully') {
    return this.success(res, null, message, 200);
  }

  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    const meta = {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message,
      data,
      meta
    });
  }

  static error(res, message = 'An error occurred', statusCode = 500, errorCode = null, details = {}) {
    const response = {
      success: false,
      error: {
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(statusCode).json(response);
  }

  static badRequest(res, message = 'Bad request', details = {}) {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409, 'CONFLICT');
  }

  static validationError(res, errors = {}, message = 'Validation failed') {
    return this.error(res, message, 422, 'VALIDATION_ERROR', { errors });
  }

  static internalError(res, message = 'Internal server error') {
    return this.error(res, message, 500, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
  }

  static withCache(res, data, message = 'Success', cacheControl = 'public, max-age=300') {
    res.set('Cache-Control', cacheControl);
    return this.success(res, data, message);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

const sendResponse = (res, result, message = 'Operation completed successfully') => {
  if (result && result.success !== undefined) {
    return res.json(result);
  }
  
  return ResponseHandler.success(res, result, message);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ResponseHandler,
  sendResponse,
  asyncHandler
};