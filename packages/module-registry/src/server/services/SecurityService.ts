import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import tar from 'tar';
import { Logger } from 'winston';
import { RegistryConfig, SecurityIssue, ModuleManifest } from '../../types';

export interface SecurityScanResult {
  passed: boolean;
  score: number; // 0-100
  issues: SecurityIssue[];
  warnings: string[];
}

export class SecurityService {
  private config: RegistryConfig;
  private logger: Logger;

  constructor(config: RegistryConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Scan package for security issues
   */
  async scanPackage(tarballPath: string, manifest: ModuleManifest): Promise<SecurityScanResult> {
    this.logger.info('Starting security scan', { package: manifest.name, version: manifest.version });

    const issues: SecurityIssue[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Extract and analyze package contents
      const extractPath = await this.extractPackage(tarballPath);
      
      try {
        // Run security checks
        await this.checkManifestSecurity(manifest, issues, warnings);
        await this.checkFileStructure(extractPath, manifest, issues, warnings);
        await this.scanForMaliciousCode(extractPath, issues, warnings);
        await this.checkDependencies(manifest, issues, warnings);
        await this.validatePermissions(manifest, issues, warnings);

        // Calculate score based on issues
        score = this.calculateSecurityScore(issues);

        const passed = score >= 60 && !issues.some(issue => issue.severity === 'critical');

        this.logger.info('Security scan completed', {
          package: manifest.name,
          version: manifest.version,
          passed,
          score,
          issuesCount: issues.length,
          warningsCount: warnings.length
        });

        return {
          passed,
          score,
          issues,
          warnings
        };

      } finally {
        // Clean up extracted files
        await fs.remove(extractPath);
      }

    } catch (error) {
      this.logger.error('Security scan failed', {
        package: manifest.name,
        version: manifest.version,
        error: error.message
      });

      return {
        passed: false,
        score: 0,
        issues: [{
          id: crypto.randomUUID(),
          severity: 'critical',
          type: 'malware',
          title: 'Security scan failed',
          description: `Could not complete security scan: ${error.message}`,
          affectedVersions: [manifest.version],
          references: [],
          detectedAt: new Date()
        }],
        warnings: [`Security scan failed: ${error.message}`]
      };
    }
  }

  private async extractPackage(tarballPath: string): Promise<string> {
    const extractPath = path.join(path.dirname(tarballPath), `extract-${Date.now()}`);
    
    await tar.extract({
      file: tarballPath,
      cwd: extractPath,
      strict: true
    });

    return extractPath;
  }

  private async checkManifestSecurity(
    manifest: ModuleManifest,
    issues: SecurityIssue[],
    warnings: string[]
  ): Promise<void> {
    // Check for suspicious package name
    if (this.isSuspiciousPackageName(manifest.name)) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'high',
        type: 'typosquatting',
        title: 'Suspicious package name',
        description: 'Package name appears to be typosquatting a popular package',
        affectedVersions: [manifest.version],
        references: [],
        detectedAt: new Date()
      });
    }

    // Check for missing required fields
    const requiredFields = ['name', 'version', 'description', 'author', 'license'];
    for (const field of requiredFields) {
      if (!manifest[field as keyof ModuleManifest]) {
        warnings.push(`Missing required field: ${field}`);
      }
    }

    // Check for suspicious scripts
    if (manifest.scripts) {
      const suspiciousScripts = ['preinstall', 'install', 'postinstall'];
      for (const script of suspiciousScripts) {
        if (manifest.scripts[script]) {
          const scriptContent = manifest.scripts[script];
          if (this.containsSuspiciousCode(scriptContent)) {
            issues.push({
              id: crypto.randomUUID(),
              severity: 'high',
              type: 'malware',
              title: `Suspicious ${script} script`,
              description: `The ${script} script contains potentially malicious code`,
              affectedVersions: [manifest.version],
              references: [],
              detectedAt: new Date()
            });
          } else {
            warnings.push(`Package contains ${script} script - review carefully`);
          }
        }
      }
    }

    // Check version format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push('Version does not follow semantic versioning');
    }
  }

  private async checkFileStructure(
    extractPath: string,
    manifest: ModuleManifest,
    issues: SecurityIssue[],
    warnings: string[]
  ): Promise<void> {
    // Check for suspicious files
    const suspiciousFiles = await this.findSuspiciousFiles(extractPath);
    
    for (const file of suspiciousFiles) {
      if (this.isMaliciousFile(file)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          type: 'malware',
          title: 'Malicious file detected',
          description: `File ${file} appears to be malicious`,
          affectedVersions: [manifest.version],
          references: [],
          detectedAt: new Date()
        });
      } else {
        warnings.push(`Suspicious file found: ${file}`);
      }
    }

    // Check package size
    const packageSize = await this.calculateDirectorySize(extractPath);
    if (packageSize > 100 * 1024 * 1024) { // 100MB
      warnings.push('Package is very large (>100MB)');
    }

    // Check for main entry point
    if (manifest.main && !await fs.pathExists(path.join(extractPath, manifest.main))) {
      warnings.push(`Main entry point ${manifest.main} not found`);
    }
  }

  private async scanForMaliciousCode(
    extractPath: string,
    issues: SecurityIssue[],
    warnings: string[]
  ): Promise<void> {
    const jsFiles = await this.findJavaScriptFiles(extractPath);
    
    for (const file of jsFiles) {
      const content = await fs.readFile(file, 'utf-8').catch(() => '');
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /eval\s*\(\s*['"]/i,
        /new\s+Function\s*\(/i,
        /process\.env\./i,
        /child_process/i,
        /fs\.writeFile|fs\.unlink/i,
        /require\s*\(\s*["']crypto["']\)/i,
        /bitcoin|cryptocurrency|mining/i,
        /keylogger|password.*steal/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          const severity = this.getSeverityForPattern(pattern);
          issues.push({
            id: crypto.randomUUID(),
            severity,
            type: 'malware',
            title: 'Suspicious code pattern detected',
            description: `File ${path.relative(extractPath, file)} contains potentially malicious code`,
            affectedVersions: ['*'],
            references: [],
            detectedAt: new Date()
          });
        }
      }

      // Check for obfuscated code
      if (this.isObfuscatedCode(content)) {
        warnings.push(`File ${path.relative(extractPath, file)} appears to be obfuscated`);
      }
    }
  }

  private async checkDependencies(
    manifest: ModuleManifest,
    issues: SecurityIssue[],
    warnings: string[]
  ): Promise<void> {
    const deps = { ...manifest.dependencies, ...manifest.peerDependencies };
    
    for (const [depName, depVersion] of Object.entries(deps)) {
      // Check for known malicious packages
      if (this.isKnownMaliciousPackage(depName)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          type: 'malware',
          title: 'Malicious dependency',
          description: `Dependency ${depName} is known to be malicious`,
          affectedVersions: [manifest.version],
          references: [],
          detectedAt: new Date()
        });
      }

      // Check for typosquatting
      if (this.isSuspiciousPackageName(depName)) {
        warnings.push(`Dependency ${depName} may be typosquatting`);
      }

      // Check for outdated versions
      if (this.isOutdatedVersion(depName, depVersion)) {
        warnings.push(`Dependency ${depName} uses outdated version ${depVersion}`);
      }
    }
  }

  private async validatePermissions(
    manifest: ModuleManifest,
    issues: SecurityIssue[],
    warnings: string[]
  ): Promise<void> {
    const permissions = manifest.plataforma?.permissions || [];
    
    // Check for excessive permissions
    const dangerousPermissions = ['filesystem:write', 'network:admin', 'system:execute'];
    
    for (const permission of permissions) {
      if (dangerousPermissions.includes(permission)) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'moderate',
          type: 'vulnerability',
          title: 'Dangerous permission requested',
          description: `Package requests dangerous permission: ${permission}`,
          affectedVersions: [manifest.version],
          references: [],
          detectedAt: new Date()
        });
      }
    }

    if (permissions.length > 10) {
      warnings.push('Package requests many permissions - review carefully');
    }
  }

  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 40;
          break;
        case 'high':
          score -= 20;
          break;
        case 'moderate':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private isSuspiciousPackageName(name: string): boolean {
    // Simple typosquatting detection
    const popularPackages = [
      'react', 'express', 'lodash', 'axios', 'moment', 'chalk',
      'commander', 'fs-extra', 'winston', 'joi', 'bcrypt'
    ];

    for (const popular of popularPackages) {
      if (this.isTyposquatting(name, popular)) {
        return true;
      }
    }

    return false;
  }

  private isTyposquatting(candidate: string, target: string): boolean {
    if (candidate === target) return false;
    
    // Check for common typosquatting patterns
    const distance = this.levenshteinDistance(candidate, target);
    return distance === 1 && candidate.length >= target.length - 1;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private containsSuspiciousCode(script: string): boolean {
    const suspiciousPatterns = [
      /curl.*sh/i,
      /wget.*sh/i,
      /rm\s+-rf/i,
      /chmod.*777/i,
      /\/etc\/passwd/i,
      /bitcoin|crypto.*mine/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(script));
  }

  private async findSuspiciousFiles(dir: string): Promise<string[]> {
    const suspicious: string[] = [];
    
    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = await fs.lstat(itemPath);
        
        if (stat.isDirectory()) {
          await scan(itemPath);
        } else if (stat.isFile()) {
          if (isSuspiciousFileName(item)) {
            suspicious.push(itemPath);
          }
        }
      }
    }

    await scan(dir);
    return suspicious;

    function isSuspiciousFileName(filename: string): boolean {
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1'];
      const suspiciousNames = ['bitcoin', 'miner', 'keylog', '.env'];
      
      return suspiciousExtensions.some(ext => filename.endsWith(ext)) ||
             suspiciousNames.some(name => filename.toLowerCase().includes(name));
    }
  }

  private isMaliciousFile(filePath: string): boolean {
    const filename = path.basename(filePath).toLowerCase();
    const maliciousPatterns = [
      'bitcoin', 'miner', 'keylogger', 'password', 'steal', 'hack'
    ];
    
    return maliciousPatterns.some(pattern => filename.includes(pattern));
  }

  private async calculateDirectorySize(dir: string): Promise<number> {
    let size = 0;
    
    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = await fs.lstat(itemPath);
        
        if (stat.isDirectory()) {
          await scan(itemPath);
        } else if (stat.isFile()) {
          size += stat.size;
        }
      }
    }

    await scan(dir);
    return size;
  }

  private async findJavaScriptFiles(dir: string): Promise<string[]> {
    const jsFiles: string[] = [];
    
    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = await fs.lstat(itemPath);
        
        if (stat.isDirectory()) {
          await scan(itemPath);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts'))) {
          jsFiles.push(itemPath);
        }
      }
    }

    await scan(dir);
    return jsFiles;
  }

  private getSeverityForPattern(pattern: RegExp): SecurityIssue['severity'] {
    const criticalPatterns = [/eval\s*\(\s*['"]/, /bitcoin|mining/i];
    const highPatterns = [/child_process/, /fs\.writeFile/];
    
    if (criticalPatterns.some(p => p.source === pattern.source)) {
      return 'critical';
    } else if (highPatterns.some(p => p.source === pattern.source)) {
      return 'high';
    }
    
    return 'moderate';
  }

  private isObfuscatedCode(content: string): boolean {
    // Simple obfuscation detection
    const lines = content.split('\n');
    let suspiciousLines = 0;
    
    for (const line of lines) {
      if (line.length > 200 || // Very long lines
          /[a-zA-Z]{50,}/.test(line) || // Long variable names
          /\\x[0-9a-f]{2}/i.test(line)) { // Hex encoding
        suspiciousLines++;
      }
    }
    
    return suspiciousLines > lines.length * 0.1; // >10% suspicious lines
  }

  private isKnownMaliciousPackage(name: string): boolean {
    // This would typically be loaded from a database of known malicious packages
    const knownMalicious = [
      'event-stream',
      'eslint-scope',
      'crossenv',
      'ffmepg'
    ];
    
    return knownMalicious.includes(name);
  }

  private isOutdatedVersion(depName: string, version: string): boolean {
    // This would typically query a vulnerability database
    // For now, just check for very old versions (>2 years)
    return version.startsWith('0.') || version.match(/^[12]\./);
  }
}