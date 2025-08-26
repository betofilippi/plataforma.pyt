import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Log request
    logger.info('Incoming request', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - start;
      
      logger.info('Request completed', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: JSON.stringify(body).length,
        success: res.statusCode < 400
      });

      return originalJson.call(this, body);
    };

    // Override res.send to log response
    const originalSend = res.send;
    res.send = function(body: any) {
      const duration = Date.now() - start;
      
      logger.info('Request completed', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: typeof body === 'string' ? body.length : Buffer.byteLength(body),
        success: res.statusCode < 400
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

export function securityLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log security-relevant events
    const securityEvents: string[] = [];

    // Multiple failed login attempts
    if (req.path.includes('/auth/login') && req.method === 'POST') {
      securityEvents.push('login_attempt');
    }

    // Admin endpoint access
    if (req.path.includes('/admin')) {
      securityEvents.push('admin_access');
    }

    // File upload
    if (req.get('Content-Type')?.includes('multipart/form-data')) {
      securityEvents.push('file_upload');
    }

    if (securityEvents.length > 0) {
      logger.info('Security event', {
        events: securityEvents,
        requestId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}