import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { ApiResponse } from '../../types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(logger: Logger) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error('API Error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    // Default error response
    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (error instanceof ApiError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      message = error.message;
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      code = 'INVALID_TOKEN';
      message = 'Invalid authentication token';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      code = 'TOKEN_EXPIRED';
      message = 'Authentication token has expired';
    } else if (error.message.includes('duplicate key')) {
      statusCode = 409;
      code = 'DUPLICATE_ENTRY';
      message = 'Resource already exists';
    } else if (error.message.includes('foreign key')) {
      statusCode = 400;
      code = 'INVALID_REFERENCE';
      message = 'Referenced resource does not exist';
    } else if (error.name === 'MulterError') {
      statusCode = 400;
      code = 'FILE_UPLOAD_ERROR';
      message = error.message;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    // Don't expose stack traces in production
    if (process.env.NODE_ENV === 'development') {
      response.error!.details = {
        stack: error.stack,
        ...details
      };
    }

    res.status(statusCode).json(response);
  };
}

export function notFoundHandler() {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = new ApiError(
      404,
      'NOT_FOUND',
      `Route ${req.method} ${req.path} not found`
    );
    next(error);
  };
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}