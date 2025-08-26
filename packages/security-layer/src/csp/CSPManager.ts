import { CSPConfig, CSPDirectives, SecurityError } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

export class CSPManager {
  private config: CSPConfig;
  private defaultDirectives: CSPDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'self'"],
    childSrc: ["'self'"],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"]
  };

  constructor(config: Partial<CSPConfig> = {}) {
    this.config = {
      enabled: true,
      reportOnly: false,
      directives: { ...this.defaultDirectives, ...config.directives },
      upgradeInsecureRequests: true,
      ...config
    };
  }

  /**
   * Generate CSP header value from directives
   */
  private generateCSPHeader(): string {
    const directives: string[] = [];

    Object.entries(this.config.directives).forEach(([directive, values]) => {
      if (values && values.length > 0) {
        const directiveName = this.camelToKebab(directive);
        directives.push(`${directiveName} ${values.join(' ')}`);
      }
    });

    if (this.config.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }

    if (this.config.reportUri) {
      directives.push(`report-uri ${this.config.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Convert camelCase to kebab-case for CSP directive names
   */
  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Add a source to a specific directive
   */
  public addSource(directive: keyof CSPDirectives, source: string): void {
    if (!this.config.directives[directive]) {
      this.config.directives[directive] = [];
    }
    
    if (!this.config.directives[directive].includes(source)) {
      this.config.directives[directive].push(source);
    }
  }

  /**
   * Remove a source from a specific directive
   */
  public removeSource(directive: keyof CSPDirectives, source: string): void {
    if (this.config.directives[directive]) {
      this.config.directives[directive] = this.config.directives[directive].filter(s => s !== source);
    }
  }

  /**
   * Add module-specific CSP sources
   */
  public addModuleCSP(moduleId: string, sources: Partial<CSPDirectives>): void {
    Object.entries(sources).forEach(([directive, values]) => {
      if (values && Array.isArray(values)) {
        values.forEach(source => {
          // Tag source with module ID for tracking
          const taggedSource = source.startsWith("'") ? source : `${source} /* module:${moduleId} */`;
          this.addSource(directive as keyof CSPDirectives, taggedSource);
        });
      }
    });
  }

  /**
   * Remove module-specific CSP sources
   */
  public removeModuleCSP(moduleId: string): void {
    Object.keys(this.config.directives).forEach(directive => {
      const dir = directive as keyof CSPDirectives;
      if (this.config.directives[dir]) {
        this.config.directives[dir] = this.config.directives[dir].filter(
          source => !source.includes(`/* module:${moduleId} */`)
        );
      }
    });
  }

  /**
   * Validate CSP configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unsafe directives
    const unsafePatterns = ["'unsafe-inline'", "'unsafe-eval'"];
    Object.entries(this.config.directives).forEach(([directive, values]) => {
      if (values) {
        unsafePatterns.forEach(pattern => {
          if (values.includes(pattern)) {
            errors.push(`Unsafe directive detected: ${pattern} in ${directive}`);
          }
        });
      }
    });

    // Check for missing critical directives
    const criticalDirectives = ['defaultSrc', 'scriptSrc', 'objectSrc'];
    criticalDirectives.forEach(directive => {
      if (!this.config.directives[directive as keyof CSPDirectives] || 
          this.config.directives[directive as keyof CSPDirectives].length === 0) {
        errors.push(`Critical directive missing: ${directive}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  public generateNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Express middleware for CSP
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      try {
        const cspHeader = this.generateCSPHeader();
        const headerName = this.config.reportOnly 
          ? 'Content-Security-Policy-Report-Only' 
          : 'Content-Security-Policy';

        res.setHeader(headerName, cspHeader);

        // Store nonce in res.locals for use in templates
        res.locals.nonce = this.generateNonce();

        next();
      } catch (error) {
        const securityError = new SecurityError(
          'Failed to apply CSP middleware',
          'CSP_MIDDLEWARE_ERROR',
          500,
          { originalError: error }
        );
        next(securityError);
      }
    };
  }

  /**
   * Handle CSP violation reports
   */
  public handleViolationReport() {
    return (req: Request, res: Response) => {
      try {
        const report = req.body;
        
        // Log the violation
        console.warn('CSP Violation Report:', JSON.stringify(report, null, 2));

        // Here you could send to monitoring service, store in database, etc.
        // Example: await this.auditLogger.log('csp.violation', report);

        res.status(204).send();
      } catch (error) {
        console.error('Error handling CSP violation report:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  /**
   * Get current CSP configuration
   */
  public getConfig(): CSPConfig {
    return { ...this.config };
  }

  /**
   * Update CSP configuration
   */
  public updateConfig(newConfig: Partial<CSPConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      directives: {
        ...this.config.directives,
        ...newConfig.directives
      }
    };
  }

  /**
   * Generate CSP for specific module
   */
  public generateModuleCSP(moduleConfig: {
    allowedDomains?: string[];
    allowedScripts?: string[];
    allowedStyles?: string[];
    allowedImages?: string[];
    allowWorkers?: boolean;
    allowInlineScripts?: boolean;
    allowInlineStyles?: boolean;
  }): Partial<CSPDirectives> {
    const moduleCSP: Partial<CSPDirectives> = {};

    if (moduleConfig.allowedDomains) {
      moduleCSP.connectSrc = moduleConfig.allowedDomains;
    }

    if (moduleConfig.allowedScripts) {
      moduleCSP.scriptSrc = [...moduleConfig.allowedScripts];
      if (moduleConfig.allowInlineScripts) {
        moduleCSP.scriptSrc.push("'unsafe-inline'");
      }
    }

    if (moduleConfig.allowedStyles) {
      moduleCSP.styleSrc = [...moduleConfig.allowedStyles];
      if (moduleConfig.allowInlineStyles) {
        moduleCSP.styleSrc.push("'unsafe-inline'");
      }
    }

    if (moduleConfig.allowedImages) {
      moduleCSP.imgSrc = moduleConfig.allowedImages;
    }

    if (moduleConfig.allowWorkers) {
      moduleCSP.workerSrc = ["'self'"];
      moduleCSP.childSrc = ["'self'"];
    }

    return moduleCSP;
  }

  /**
   * Test CSP against a URL
   */
  public async testCSP(url: string): Promise<{ allowed: boolean; violations: string[] }> {
    const violations: string[] = [];
    
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol;
      const host = urlObj.host;

      // Check against connect-src
      const connectSources = this.config.directives.connectSrc || [];
      let allowed = false;

      for (const source of connectSources) {
        if (source === "'self'" || 
            source === "*" || 
            source === url ||
            source === `${protocol}//${host}` ||
            url.startsWith(source)) {
          allowed = true;
          break;
        }
      }

      if (!allowed) {
        violations.push(`URL ${url} not allowed by connect-src directive`);
      }

      return { allowed, violations };
    } catch (error) {
      violations.push(`Invalid URL: ${url}`);
      return { allowed: false, violations };
    }
  }
}