import { 
  AuditConfig, 
  AuditEvent, 
  SecurityContext, 
  SecurityEventType,
  AuditDestination 
} from '../types/index.js';
import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export class AuditLogger {
  private config: AuditConfig;
  private logger: winston.Logger;
  private eventBuffer: AuditEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout;

  constructor(config: AuditConfig) {
    this.config = config;
    this.logger = this.createLogger();
    this.bufferFlushInterval = setInterval(() => this.flushBuffer(), 5000);
  }

  /**
   * Create Winston logger with configured transports
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    this.config.destinations.forEach(destination => {
      switch (destination.type) {
        case 'file':
          transports.push(new winston.transports.File({
            filename: destination.config.filename || 'audit.log',
            maxsize: destination.config.maxsize || 10 * 1024 * 1024, // 10MB
            maxFiles: destination.config.maxFiles || 5,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            )
          }));
          break;

        case 'database':
          // Custom database transport would be implemented here
          break;

        case 'elasticsearch':
          // Elasticsearch transport would be implemented here
          break;

        case 'syslog':
          transports.push(new winston.transports.Syslog({
            host: destination.config.host || 'localhost',
            port: destination.config.port || 514,
            protocol: destination.config.protocol || 'udp4'
          }));
          break;
      }
    });

    // Always add console transport for debugging
    if (process.env.NODE_ENV === 'development') {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    return winston.createLogger({
      level: this.config.logLevel,
      transports,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    });
  }

  /**
   * Log an audit event
   */
  public async logEvent(
    action: string,
    resource: string,
    context: SecurityContext,
    details: Record<string, any> = {},
    result: 'success' | 'failure' | 'error' = 'success',
    errorMessage?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    const event: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      userId: context.user?.id,
      sessionId: context.session?.id,
      action,
      resource,
      resourceId: details.resourceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: this.config.maskSensitiveData ? this.maskSensitiveData(details) : details,
      result,
      errorMessage,
      metadata: {
        requestId: context.requestId,
        roles: context.roles,
        permissions: context.permissions
      }
    };

    // Add to buffer for batch processing
    this.eventBuffer.push(event);

    // Log immediately for critical events
    if (result === 'error' || this.isCriticalAction(action)) {
      await this.flushEvent(event);
    }
  }

  /**
   * Log security event with structured data
   */
  public async logSecurityEvent(
    type: SecurityEventType,
    context: SecurityContext,
    details: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    const action = `security.${type}`;
    const result = severity === 'critical' ? 'error' : 'success';
    
    await this.logEvent(action, 'security', context, { 
      ...details, 
      severity,
      eventType: type 
    }, result);
  }

  /**
   * Express middleware for automatic request logging
   */
  public middleware(options: {
    excludePaths?: string[];
    includeBody?: boolean;
    includeQuery?: boolean;
    includeHeaders?: boolean;
  } = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip logging for excluded paths
      if (options.excludePaths?.some(path => req.path.startsWith(path))) {
        return next();
      }

      const startTime = Date.now();
      const originalSend = res.send;
      let responseBody: any;

      // Capture response body if configured
      res.send = function(body: any) {
        if (options.includeBody) {
          responseBody = body;
        }
        return originalSend.call(this, body);
      } as any;

      res.on('finish', async () => {
        try {
          const context: SecurityContext = {
            user: (req as any).user,
            session: (req as any).session,
            permissions: (req as any).permissions || [],
            roles: (req as any).roles || [],
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            requestId: uuidv4(),
            timestamp: new Date()
          };

          const details: Record<string, any> = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: Date.now() - startTime
          };

          if (options.includeQuery && Object.keys(req.query).length > 0) {
            details.query = req.query;
          }

          if (options.includeHeaders) {
            details.headers = req.headers;
          }

          if (options.includeBody && req.body) {
            details.requestBody = req.body;
          }

          if (responseBody && this.config.includeResponse) {
            details.responseBody = responseBody;
          }

          const result = res.statusCode >= 400 ? 'failure' : 'success';
          const action = `http.${req.method.toLowerCase()}`;

          await this.logEvent(action, req.path, context, details, result);
        } catch (error) {
          console.error('Audit logging middleware error:', error);
        }
      });

      next();
    };
  }

  /**
   * Log authentication events
   */
  public async logAuthentication(
    action: 'login' | 'logout' | 'register' | 'password_change',
    userId: string,
    context: Partial<SecurityContext>,
    success: boolean,
    details: Record<string, any> = {}
  ): Promise<void> {
    const fullContext: SecurityContext = {
      permissions: [],
      roles: [],
      ipAddress: 'unknown',
      userAgent: 'unknown',
      requestId: uuidv4(),
      timestamp: new Date(),
      ...context
    };

    await this.logEvent(
      `auth.${action}`,
      'authentication',
      fullContext,
      { userId, ...details },
      success ? 'success' : 'failure'
    );
  }

  /**
   * Log authorization events
   */
  public async logAuthorization(
    action: string,
    resource: string,
    context: SecurityContext,
    granted: boolean,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent(
      `authz.${action}`,
      resource,
      context,
      { granted, ...details },
      granted ? 'success' : 'failure'
    );
  }

  /**
   * Log data access events
   */
  public async logDataAccess(
    operation: 'read' | 'write' | 'delete',
    table: string,
    context: SecurityContext,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent(
      `data.${operation}`,
      `database.${table}`,
      context,
      details
    );
  }

  /**
   * Log module events
   */
  public async logModuleEvent(
    moduleId: string,
    action: 'load' | 'unload' | 'execute' | 'violation',
    context: SecurityContext,
    details: Record<string, any> = {}
  ): Promise<void> {
    const result = action === 'violation' ? 'error' : 'success';
    await this.logEvent(
      `module.${action}`,
      `module.${moduleId}`,
      context,
      { moduleId, ...details },
      result
    );
  }

  /**
   * Search audit logs
   */
  public async searchLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: string;
    resource?: string;
    result?: 'success' | 'failure' | 'error';
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    // This would typically query a database or search index
    // For now, return empty results
    return { events: [], total: 0 };
  }

  /**
   * Get audit statistics
   */
  public async getStatistics(period: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Record<string, number>;
    eventsByResult: Record<string, number>;
    securityEvents: number;
  }> {
    // This would typically query aggregated data
    return {
      totalEvents: 0,
      eventsByAction: {},
      eventsByUser: {},
      eventsByResult: {},
      securityEvents: 0
    };
  }

  /**
   * Flush buffered events
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const event of eventsToFlush) {
      await this.flushEvent(event);
    }
  }

  /**
   * Flush individual event to configured destinations
   */
  private async flushEvent(event: AuditEvent): Promise<void> {
    try {
      this.logger.log(this.config.logLevel, 'Audit Event', event);

      // Send to additional destinations if configured
      for (const destination of this.config.destinations) {
        await this.sendToDestination(event, destination);
      }
    } catch (error) {
      console.error('Failed to flush audit event:', error);
    }
  }

  /**
   * Send event to specific destination
   */
  private async sendToDestination(event: AuditEvent, destination: AuditDestination): Promise<void> {
    switch (destination.type) {
      case 'database':
        // Implementation for database storage
        break;
      case 'elasticsearch':
        // Implementation for Elasticsearch
        break;
      // Other destinations would be implemented here
    }
  }

  /**
   * Mask sensitive data in audit events
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    const sensitiveFields = this.config.sensitiveFields || [
      'password', 'token', 'secret', 'key', 'authorization', 'cookie'
    ];

    for (const field of sensitiveFields) {
      if (field in masked) {
        masked[field] = '***MASKED***';
      }
    }

    // Recursively mask nested objects
    for (const key in masked) {
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Check if action is considered critical
   */
  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'auth.login',
      'auth.logout',
      'security.',
      'data.delete',
      'module.violation',
      'admin.'
    ];

    return criticalActions.some(critical => action.startsWith(critical));
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    
    // Flush any remaining events
    this.flushBuffer();
    
    // Close logger
    this.logger.close();
  }

  /**
   * Update audit configuration
   */
  public updateConfig(newConfig: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate logger if destinations changed
    if (newConfig.destinations) {
      this.logger.close();
      this.logger = this.createLogger();
    }
  }

  /**
   * Export audit logs
   */
  public async exportLogs(
    format: 'json' | 'csv' | 'xml',
    filters: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      actions?: string[];
    } = {}
  ): Promise<string> {
    const { events } = await this.searchLogs(filters);
    
    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);
      case 'csv':
        return this.convertToCSV(events);
      case 'xml':
        return this.convertToXML(events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = Object.keys(events[0]).join(',');
    const rows = events.map(event => 
      Object.values(event).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  private convertToXML(events: AuditEvent[]): string {
    const xmlEvents = events.map(event => {
      const eventXml = Object.entries(event)
        .map(([key, value]) => {
          const xmlValue = typeof value === 'object' ? 
            JSON.stringify(value) : 
            String(value);
          return `  <${key}>${xmlValue}</${key}>`;
        })
        .join('\n');
      
      return `<event>\n${eventXml}\n</event>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<auditLogs>\n${xmlEvents}\n</auditLogs>`;
  }
}