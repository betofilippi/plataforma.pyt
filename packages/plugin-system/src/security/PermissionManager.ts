import { EventEmitter } from 'eventemitter3';
import type { PluginManifest } from '../types';

/**
 * Permission Manager
 * Handles permission requests, validation, and enforcement for plugins
 */
export class PermissionManager extends EventEmitter {
  private permissions = new Map<string, PermissionDefinition>();
  private pluginPermissions = new Map<string, PluginPermissionState>();
  private permissionRequests = new Map<string, PermissionRequest>();
  private permissionPolicies: PermissionPolicy[] = [];

  constructor(private readonly options: PermissionManagerOptions = {}) {
    super();
    this.initializeBuiltInPermissions();
  }

  async initialize(): Promise<void> {
    // Load persisted permissions if available
    await this.loadPersistedPermissions();
  }

  /**
   * Define a new permission
   */
  definePermission(definition: PermissionDefinition): void {
    this.permissions.set(definition.id, definition);
    this.emit('permission:defined', { permission: definition });
  }

  /**
   * Grant permissions to a plugin
   */
  async grantPermissions(pluginId: string, permissionIds: string[]): Promise<void> {
    const pluginPerms = this.getOrCreatePluginPermissions(pluginId);

    for (const permissionId of permissionIds) {
      const permission = this.permissions.get(permissionId);
      if (!permission) {
        throw new Error(`Permission '${permissionId}' is not defined`);
      }

      // Check if permission can be granted
      if (permission.requiresUserApproval && !this.options.autoApprove) {
        await this.requestUserApproval(pluginId, permissionId);
      }

      pluginPerms.granted.add(permissionId);
      pluginPerms.requested.delete(permissionId);
      pluginPerms.denied.delete(permissionId);
    }

    pluginPerms.lastModified = new Date();
    await this.persistPluginPermissions(pluginId, pluginPerms);
    
    this.emit('permissions:granted', { pluginId, permissions: permissionIds });
  }

  /**
   * Revoke permissions from a plugin
   */
  async revokePermissions(pluginId: string, permissionIds: string[]): Promise<void> {
    const pluginPerms = this.pluginPermissions.get(pluginId);
    if (!pluginPerms) return;

    for (const permissionId of permissionIds) {
      pluginPerms.granted.delete(permissionId);
    }

    pluginPerms.lastModified = new Date();
    await this.persistPluginPermissions(pluginId, pluginPerms);
    
    this.emit('permissions:revoked', { pluginId, permissions: permissionIds });
  }

  /**
   * Request permission for a plugin
   */
  async requestPermission(pluginId: string, permissionId: string): Promise<boolean> {
    const permission = this.permissions.get(permissionId);
    if (!permission) {
      throw new Error(`Permission '${permissionId}' is not defined`);
    }

    const pluginPerms = this.getOrCreatePluginPermissions(pluginId);

    // Already granted
    if (pluginPerms.granted.has(permissionId)) {
      return true;
    }

    // Already denied
    if (pluginPerms.denied.has(permissionId)) {
      return false;
    }

    // Check policies
    const policyResult = this.checkPermissionPolicies(pluginId, permissionId);
    if (policyResult === 'deny') {
      pluginPerms.denied.add(permissionId);
      await this.persistPluginPermissions(pluginId, pluginPerms);
      return false;
    }

    if (policyResult === 'grant') {
      pluginPerms.granted.add(permissionId);
      await this.persistPluginPermissions(pluginId, pluginPerms);
      return true;
    }

    // Requires user approval
    if (permission.requiresUserApproval && !this.options.autoApprove) {
      pluginPerms.requested.add(permissionId);
      await this.persistPluginPermissions(pluginId, pluginPerms);
      
      const approved = await this.requestUserApproval(pluginId, permissionId);
      
      if (approved) {
        pluginPerms.granted.add(permissionId);
        pluginPerms.requested.delete(permissionId);
      } else {
        pluginPerms.denied.add(permissionId);
        pluginPerms.requested.delete(permissionId);
      }
      
      await this.persistPluginPermissions(pluginId, pluginPerms);
      return approved;
    }

    // Auto-grant if no user approval required
    pluginPerms.granted.add(permissionId);
    await this.persistPluginPermissions(pluginId, pluginPerms);
    
    this.emit('permissions:granted', { pluginId, permissions: [permissionId] });
    return true;
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: string, permissionId: string): boolean {
    const pluginPerms = this.pluginPermissions.get(pluginId);
    return pluginPerms ? pluginPerms.granted.has(permissionId) : false;
  }

  /**
   * Check if plugin has all required permissions
   */
  hasAllPermissions(pluginId: string, permissionIds: string[]): boolean {
    return permissionIds.every(permissionId => this.hasPermission(pluginId, permissionId));
  }

  /**
   * Get all permissions for a plugin
   */
  getPluginPermissions(pluginId: string): PluginPermissionSummary {
    const pluginPerms = this.pluginPermissions.get(pluginId);
    if (!pluginPerms) {
      return {
        granted: [],
        requested: [],
        denied: [],
        lastModified: null
      };
    }

    return {
      granted: Array.from(pluginPerms.granted),
      requested: Array.from(pluginPerms.requested),
      denied: Array.from(pluginPerms.denied),
      lastModified: pluginPerms.lastModified
    };
  }

  /**
   * Validate plugin permissions against manifest
   */
  async validatePermissions(pluginId: string, requestedPermissions: string[]): Promise<PermissionValidationResult> {
    const result: PermissionValidationResult = {
      valid: true,
      granted: [],
      missing: [],
      denied: [],
      errors: []
    };

    for (const permissionId of requestedPermissions) {
      const permission = this.permissions.get(permissionId);
      
      if (!permission) {
        result.valid = false;
        result.errors.push(`Unknown permission: ${permissionId}`);
        continue;
      }

      if (this.hasPermission(pluginId, permissionId)) {
        result.granted.push(permissionId);
      } else {
        const pluginPerms = this.pluginPermissions.get(pluginId);
        if (pluginPerms?.denied.has(permissionId)) {
          result.denied.push(permissionId);
          result.valid = false;
        } else {
          result.missing.push(permissionId);
        }
      }
    }

    return result;
  }

  /**
   * Add permission policy
   */
  addPermissionPolicy(policy: PermissionPolicy): void {
    this.permissionPolicies.push(policy);
    this.emit('policy:added', { policy });
  }

  /**
   * Remove permission policy
   */
  removePermissionPolicy(policyId: string): void {
    const index = this.permissionPolicies.findIndex(p => p.id === policyId);
    if (index !== -1) {
      const policy = this.permissionPolicies.splice(index, 1)[0];
      this.emit('policy:removed', { policy });
    }
  }

  /**
   * Get permission definition
   */
  getPermissionDefinition(permissionId: string): PermissionDefinition | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * Get all permission definitions
   */
  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get permissions by category
   */
  getPermissionsByCategory(category: string): PermissionDefinition[] {
    return this.getAllPermissions().filter(p => p.category === category);
  }

  /**
   * Get permission statistics
   */
  getPermissionStats(): PermissionStatistics {
    const stats: PermissionStatistics = {
      totalPermissions: this.permissions.size,
      totalPlugins: this.pluginPermissions.size,
      permissionsByCategory: {},
      pluginsByPermission: {},
      pendingRequests: 0
    };

    // Count by category
    for (const permission of this.permissions.values()) {
      stats.permissionsByCategory[permission.category] = 
        (stats.permissionsByCategory[permission.category] || 0) + 1;
    }

    // Count plugins by permission
    for (const [pluginId, pluginPerms] of this.pluginPermissions) {
      for (const permissionId of pluginPerms.granted) {
        stats.pluginsByPermission[permissionId] = 
          (stats.pluginsByPermission[permissionId] || 0) + 1;
      }
      
      stats.pendingRequests += pluginPerms.requested.size;
    }

    return stats;
  }

  /**
   * Clean up permissions for a plugin
   */
  async cleanupPluginPermissions(pluginId: string): Promise<void> {
    this.pluginPermissions.delete(pluginId);
    
    // Remove any pending requests
    const requestsToRemove: string[] = [];
    for (const [requestId, request] of this.permissionRequests) {
      if (request.pluginId === pluginId) {
        requestsToRemove.push(requestId);
      }
    }
    
    for (const requestId of requestsToRemove) {
      this.permissionRequests.delete(requestId);
    }

    await this.removePersistedPermissions(pluginId);
    this.emit('permissions:cleanup', { pluginId });
  }

  // Private Methods

  private initializeBuiltInPermissions(): void {
    const builtInPermissions: PermissionDefinition[] = [
      // UI Permissions
      {
        id: 'ui',
        name: 'User Interface',
        description: 'Modify user interface and display content',
        category: 'ui',
        riskLevel: 'low',
        requiresUserApproval: false
      },
      {
        id: 'ui.notifications',
        name: 'Show Notifications',
        description: 'Display notifications to users',
        category: 'ui',
        riskLevel: 'low',
        requiresUserApproval: false
      },
      {
        id: 'ui.modals',
        name: 'Show Modal Dialogs',
        description: 'Display modal dialogs and popups',
        category: 'ui',
        riskLevel: 'medium',
        requiresUserApproval: false
      },

      // Data Permissions
      {
        id: 'database',
        name: 'Database Access',
        description: 'Read data from database',
        category: 'data',
        riskLevel: 'medium',
        requiresUserApproval: true
      },
      {
        id: 'database.write',
        name: 'Database Write',
        description: 'Modify data in database',
        category: 'data',
        riskLevel: 'high',
        requiresUserApproval: true
      },
      {
        id: 'database.schema',
        name: 'Database Schema',
        description: 'Modify database structure',
        category: 'data',
        riskLevel: 'critical',
        requiresUserApproval: true
      },

      // Network Permissions
      {
        id: 'network',
        name: 'Network Access',
        description: 'Make network requests to external services',
        category: 'network',
        riskLevel: 'medium',
        requiresUserApproval: true
      },
      {
        id: 'network.websocket',
        name: 'WebSocket Connections',
        description: 'Establish WebSocket connections',
        category: 'network',
        riskLevel: 'medium',
        requiresUserApproval: true
      },

      // Storage Permissions
      {
        id: 'storage',
        name: 'Local Storage',
        description: 'Store data locally in browser',
        category: 'storage',
        riskLevel: 'low',
        requiresUserApproval: false
      },
      {
        id: 'filesystem',
        name: 'File System',
        description: 'Read and write files',
        category: 'storage',
        riskLevel: 'high',
        requiresUserApproval: true
      },

      // System Permissions
      {
        id: 'system',
        name: 'System Access',
        description: 'Access system modules and functions',
        category: 'system',
        riskLevel: 'high',
        requiresUserApproval: true
      },
      {
        id: 'admin',
        name: 'Administrative',
        description: 'Perform administrative tasks',
        category: 'system',
        riskLevel: 'critical',
        requiresUserApproval: true
      },

      // AI Permissions
      {
        id: 'ai',
        name: 'AI Services',
        description: 'Access AI and machine learning services',
        category: 'ai',
        riskLevel: 'medium',
        requiresUserApproval: true
      },

      // Security Permissions
      {
        id: 'crypto',
        name: 'Cryptography',
        description: 'Use cryptographic functions',
        category: 'security',
        riskLevel: 'medium',
        requiresUserApproval: true
      },
      {
        id: 'extensions',
        name: 'Extensions',
        description: 'Register extension points',
        category: 'system',
        riskLevel: 'medium',
        requiresUserApproval: false
      }
    ];

    for (const permission of builtInPermissions) {
      this.definePermission(permission);
    }
  }

  private getOrCreatePluginPermissions(pluginId: string): PluginPermissionState {
    if (!this.pluginPermissions.has(pluginId)) {
      this.pluginPermissions.set(pluginId, {
        pluginId,
        granted: new Set(),
        requested: new Set(),
        denied: new Set(),
        lastModified: new Date()
      });
    }
    
    return this.pluginPermissions.get(pluginId)!;
  }

  private checkPermissionPolicies(pluginId: string, permissionId: string): 'grant' | 'deny' | 'ask' {
    for (const policy of this.permissionPolicies) {
      const result = policy.evaluate(pluginId, permissionId);
      if (result !== 'ask') {
        return result;
      }
    }
    
    return 'ask';
  }

  private async requestUserApproval(pluginId: string, permissionId: string): Promise<boolean> {
    const requestId = `${pluginId}_${permissionId}_${Date.now()}`;
    const permission = this.permissions.get(permissionId)!;
    
    const request: PermissionRequest = {
      id: requestId,
      pluginId,
      permissionId,
      permission,
      requestedAt: new Date(),
      status: 'pending'
    };
    
    this.permissionRequests.set(requestId, request);
    this.emit('permission:requested', { request });
    
    // In a real implementation, this would show a UI dialog
    // For now, simulate user approval based on risk level
    return new Promise((resolve) => {
      setTimeout(() => {
        const approved = this.simulateUserApproval(permission);
        request.status = approved ? 'approved' : 'denied';
        request.resolvedAt = new Date();
        
        this.permissionRequests.delete(requestId);
        this.emit('permission:resolved', { request, approved });
        
        resolve(approved);
      }, 1000);
    });
  }

  private simulateUserApproval(permission: PermissionDefinition): boolean {
    // Simulate user approval based on risk level
    switch (permission.riskLevel) {
      case 'low': return true;
      case 'medium': return Math.random() > 0.3;
      case 'high': return Math.random() > 0.7;
      case 'critical': return Math.random() > 0.9;
      default: return false;
    }
  }

  private async loadPersistedPermissions(): Promise<void> {
    // Load from localStorage or other storage
    try {
      const stored = localStorage.getItem('plugin_permissions');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [pluginId, perms] of Object.entries(data)) {
          const pluginPerms = perms as any;
          this.pluginPermissions.set(pluginId, {
            pluginId,
            granted: new Set(pluginPerms.granted),
            requested: new Set(pluginPerms.requested),
            denied: new Set(pluginPerms.denied),
            lastModified: new Date(pluginPerms.lastModified)
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted permissions:', error);
    }
  }

  private async persistPluginPermissions(pluginId: string, permissions: PluginPermissionState): Promise<void> {
    try {
      const stored = JSON.parse(localStorage.getItem('plugin_permissions') || '{}');
      stored[pluginId] = {
        granted: Array.from(permissions.granted),
        requested: Array.from(permissions.requested),
        denied: Array.from(permissions.denied),
        lastModified: permissions.lastModified.toISOString()
      };
      localStorage.setItem('plugin_permissions', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to persist plugin permissions:', error);
    }
  }

  private async removePersistedPermissions(pluginId: string): Promise<void> {
    try {
      const stored = JSON.parse(localStorage.getItem('plugin_permissions') || '{}');
      delete stored[pluginId];
      localStorage.setItem('plugin_permissions', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to remove persisted permissions:', error);
    }
  }
}

// Types and Interfaces

export interface PermissionManagerOptions {
  strictMode?: boolean;
  autoApprove?: boolean;
}

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresUserApproval: boolean;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface PluginPermissionState {
  pluginId: string;
  granted: Set<string>;
  requested: Set<string>;
  denied: Set<string>;
  lastModified: Date;
}

export interface PluginPermissionSummary {
  granted: string[];
  requested: string[];
  denied: string[];
  lastModified: Date | null;
}

export interface PermissionValidationResult {
  valid: boolean;
  granted: string[];
  missing: string[];
  denied: string[];
  errors: string[];
}

export interface PermissionPolicy {
  id: string;
  name: string;
  evaluate(pluginId: string, permissionId: string): 'grant' | 'deny' | 'ask';
}

export interface PermissionRequest {
  id: string;
  pluginId: string;
  permissionId: string;
  permission: PermissionDefinition;
  requestedAt: Date;
  resolvedAt?: Date;
  status: 'pending' | 'approved' | 'denied';
}

export interface PermissionStatistics {
  totalPermissions: number;
  totalPlugins: number;
  permissionsByCategory: Record<string, number>;
  pluginsByPermission: Record<string, number>;
  pendingRequests: number;
}