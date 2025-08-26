import { Pool, PoolClient } from 'pg';
import { z } from 'zod';

// ===== TYPES AND INTERFACES =====

export interface SettingCategory {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface SettingDefinition {
  id: string;
  categoryId: string;
  key: string;
  name: string;
  description: string | null;
  dataType: SettingDataType;
  defaultValue: string | null;
  validationRules: Record<string, any>;
  isRequired: boolean;
  isSensitive: boolean;
  sortOrder: number;
}

export interface OrganizationSetting {
  categoryName: string;
  categoryDisplayName: string;
  settingKey: string;
  settingName: string;
  settingDescription: string | null;
  dataType: SettingDataType;
  value: string | null;
  defaultValue: string | null;
  isRequired: boolean;
  validationRules: Record<string, any>;
  sortOrder: number;
}

export interface SettingAuditEntry {
  id: string;
  organizationId: string;
  settingId: string;
  action: 'created' | 'updated' | 'deleted' | 'viewed';
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  metadata: Record<string, any>;
}

export type SettingDataType = 
  | 'string' | 'number' | 'boolean' | 'json' | 'text' 
  | 'password' | 'email' | 'url' | 'color' | 'date' 
  | 'datetime' | 'file' | 'select' | 'multiselect' | 'cron';

// ===== VALIDATION SCHEMAS =====

const settingValueSchema = z.object({
  key: z.string().min(1),
  value: z.string().optional(),
  changedBy: z.string().uuid().optional(),
});

const bulkSettingsUpdateSchema = z.object({
  settings: z.array(settingValueSchema),
  changedBy: z.string().uuid().optional(),
});

const settingTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateData: z.record(z.any()),
  isPublic: z.boolean().default(false),
  createdBy: z.string().uuid().optional(),
});

// ===== SETTINGS SERVICE =====

export class SettingsService {
  constructor(private pool: Pool) {}

  // ===== ORGANIZATION METHODS =====

  async getOrganization(organizationId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT id, name, display_name, domain, logo_url, favicon_url, 
               is_active, created_at, updated_at, metadata
        FROM organizations 
        WHERE id = $1
      `, [organizationId]);

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async createOrganization(data: {
    name: string;
    displayName: string;
    domain?: string;
    logoUrl?: string;
    faviconUrl?: string;
  }): Promise<string> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO organizations (name, display_name, domain, logo_url, favicon_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [data.name, data.displayName, data.domain, data.logoUrl, data.faviconUrl]);

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  // ===== SETTING CATEGORIES =====

  async getSettingCategories(): Promise<SettingCategory[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT id, name, display_name as "displayName", description, icon, sort_order as "sortOrder"
        FROM setting_categories
        WHERE is_active = true
        ORDER BY sort_order
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== SETTING DEFINITIONS =====

  async getSettingDefinitions(categoryName?: string): Promise<SettingDefinition[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT sd.id, sd.category_id as "categoryId", sd.key, sd.name, 
               sd.description, sd.data_type as "dataType", sd.default_value as "defaultValue",
               sd.validation_rules as "validationRules", sd.is_required as "isRequired",
               sd.is_sensitive as "isSensitive", sd.sort_order as "sortOrder"
        FROM setting_definitions sd
        JOIN setting_categories sc ON sd.category_id = sc.id
        WHERE sd.is_active = true AND sc.is_active = true
      `;
      
      const params: any[] = [];
      if (categoryName) {
        query += ' AND sc.name = $1';
        params.push(categoryName);
      }
      
      query += ' ORDER BY sc.sort_order, sd.sort_order';

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== ORGANIZATION SETTINGS =====

  async getOrganizationSettings(organizationId: string): Promise<OrganizationSetting[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM get_organization_settings($1)
      `, [organizationId]);

      return result.rows.map(row => ({
        categoryName: row.category_name,
        categoryDisplayName: row.category_display_name,
        settingKey: row.setting_key,
        settingName: row.setting_name,
        settingDescription: row.setting_description,
        dataType: row.data_type,
        value: row.value,
        defaultValue: row.default_value,
        isRequired: row.is_required,
        validationRules: row.validation_rules,
        sortOrder: row.sort_order,
      }));
    } finally {
      client.release();
    }
  }

  async getSettingValue(organizationId: string, settingKey: string): Promise<string | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT get_setting_value($1, $2) as value
      `, [organizationId, settingKey]);

      return result.rows[0]?.value || null;
    } finally {
      client.release();
    }
  }

  async setSettingValue(
    organizationId: string, 
    settingKey: string, 
    value: string | null,
    changedBy?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    // Validate input
    const validatedData = settingValueSchema.parse({
      key: settingKey,
      value: value || undefined,
      changedBy,
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set the setting value
      const result = await client.query(`
        SELECT set_setting_value($1, $2, $3, $4) as success
      `, [organizationId, settingKey, value, changedBy]);

      if (!result.rows[0]?.success) {
        throw new Error(`Failed to set setting value for key: ${settingKey}`);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bulkUpdateSettings(
    organizationId: string,
    settings: Array<{ key: string; value: string | null }>,
    changedBy?: string
  ): Promise<boolean> {
    // Validate input
    const validatedData = bulkSettingsUpdateSchema.parse({
      settings,
      changedBy,
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const setting of validatedData.settings) {
        await client.query(`
          SELECT set_setting_value($1, $2, $3, $4)
        `, [organizationId, setting.key, setting.value, changedBy]);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== SETTING VALIDATION =====

  async validateSettingValue(settingKey: string, value: string): Promise<{ valid: boolean; error?: string }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT data_type, validation_rules, is_required
        FROM setting_definitions
        WHERE key = $1
      `, [settingKey]);

      if (result.rows.length === 0) {
        return { valid: false, error: 'Setting not found' };
      }

      const definition = result.rows[0];
      const { data_type, validation_rules, is_required } = definition;

      // Check if required value is provided
      if (is_required && (!value || value.trim() === '')) {
        return { valid: false, error: 'This setting is required' };
      }

      // Validate based on data type
      const validation = this.validateByDataType(value, data_type, validation_rules);
      return validation;
    } finally {
      client.release();
    }
  }

  private validateByDataType(
    value: string, 
    dataType: SettingDataType, 
    rules: Record<string, any>
  ): { valid: boolean; error?: string } {
    if (!value || value.trim() === '') {
      return { valid: true }; // Empty values are handled by required check
    }

    try {
      switch (dataType) {
        case 'string':
        case 'text':
          if (rules.maxLength && value.length > rules.maxLength) {
            return { valid: false, error: `Maximum length is ${rules.maxLength}` };
          }
          if (rules.minLength && value.length < rules.minLength) {
            return { valid: false, error: `Minimum length is ${rules.minLength}` };
          }
          if (rules.pattern) {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
              return { valid: false, error: 'Invalid format' };
            }
          }
          break;

        case 'number':
          const num = parseFloat(value);
          if (isNaN(num)) {
            return { valid: false, error: 'Must be a valid number' };
          }
          if (rules.min !== undefined && num < rules.min) {
            return { valid: false, error: `Minimum value is ${rules.min}` };
          }
          if (rules.max !== undefined && num > rules.max) {
            return { valid: false, error: `Maximum value is ${rules.max}` };
          }
          break;

        case 'boolean':
          if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            return { valid: false, error: 'Must be a boolean value' };
          }
          break;

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return { valid: false, error: 'Must be a valid email address' };
          }
          break;

        case 'url':
          try {
            new URL(value);
          } catch {
            return { valid: false, error: 'Must be a valid URL' };
          }
          break;

        case 'color':
          const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!colorRegex.test(value)) {
            return { valid: false, error: 'Must be a valid hex color (e.g., #ff0000)' };
          }
          break;

        case 'date':
        case 'datetime':
          if (isNaN(Date.parse(value))) {
            return { valid: false, error: 'Must be a valid date' };
          }
          break;

        case 'json':
          try {
            JSON.parse(value);
          } catch {
            return { valid: false, error: 'Must be valid JSON' };
          }
          break;

        case 'select':
          if (rules.options && Array.isArray(rules.options)) {
            const validOptions = rules.options.map((opt: any) => 
              typeof opt === 'string' ? opt : opt.value
            );
            if (!validOptions.includes(value)) {
              return { valid: false, error: 'Invalid option selected' };
            }
          }
          break;

        case 'cron':
          // Basic cron validation (5 or 6 fields)
          const cronParts = value.trim().split(/\s+/);
          if (cronParts.length !== 5 && cronParts.length !== 6) {
            return { valid: false, error: 'Cron expression must have 5 or 6 fields' };
          }
          break;
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Validation error occurred' };
    }
  }

  // ===== AUDIT LOG =====

  async getSettingAuditLog(
    organizationId: string,
    settingKey?: string,
    limit: number = 100
  ): Promise<SettingAuditEntry[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT sal.id, sal.organization_id as "organizationId", sal.setting_id as "settingId",
               sal.action, sal.old_value as "oldValue", sal.new_value as "newValue",
               sal.changed_by as "changedBy", sal.ip_address as "ipAddress",
               sal.user_agent as "userAgent", sal.created_at as "createdAt", sal.metadata
        FROM setting_audit_log sal
        JOIN setting_definitions sd ON sal.setting_id = sd.id
        WHERE sal.organization_id = $1
      `;
      
      const params: any[] = [organizationId];
      if (settingKey) {
        query += ' AND sd.key = $2';
        params.push(settingKey);
      }
      
      query += ' ORDER BY sal.created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== TEMPLATES =====

  async exportSettings(organizationId: string): Promise<Record<string, any>> {
    const settings = await this.getOrganizationSettings(organizationId);
    
    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      if (setting.value !== null) {
        settingsMap[setting.settingKey] = setting.value;
      }
    });

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      organizationId,
      settings: settingsMap,
    };
  }

  async importSettings(
    organizationId: string,
    templateData: Record<string, any>,
    changedBy?: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    if (!templateData.settings || typeof templateData.settings !== 'object') {
      throw new Error('Invalid template data: missing settings object');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(templateData.settings)) {
        try {
          // Validate the setting exists and value is valid
          const validation = await this.validateSettingValue(key, String(value));
          if (!validation.valid) {
            errors.push(`${key}: ${validation.error}`);
            continue;
          }

          // Set the setting value
          await this.setSettingValue(organizationId, key, String(value), changedBy);
          imported++;
        } catch (error: any) {
          errors.push(`${key}: ${error.message}`);
        }
      }

      if (errors.length > 0 && imported === 0) {
        await client.query('ROLLBACK');
        return { success: false, imported: 0, errors };
      }

      await client.query('COMMIT');
      return { success: true, imported, errors };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveTemplate(templateData: {
    name: string;
    description?: string;
    templateData: Record<string, any>;
    isPublic?: boolean;
    createdBy?: string;
  }): Promise<string> {
    // Validate input
    const validatedData = settingTemplateSchema.parse(templateData);

    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO setting_templates (name, description, template_data, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        validatedData.name,
        validatedData.description,
        JSON.stringify(validatedData.templateData),
        validatedData.isPublic,
        validatedData.createdBy,
      ]);

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  // ===== CLEANUP AND MAINTENANCE =====

  async cleanupExpiredAuditLogs(retentionDays: number = 90): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM setting_audit_log 
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      `);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async resetToDefaults(
    organizationId: string,
    categoryName?: string,
    changedBy?: string
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let query = `
        DELETE FROM organization_settings 
        WHERE organization_id = $1
      `;
      
      const params: any[] = [organizationId];
      
      if (categoryName) {
        query += ` AND setting_id IN (
          SELECT sd.id FROM setting_definitions sd
          JOIN setting_categories sc ON sd.category_id = sc.id
          WHERE sc.name = $2
        )`;
        params.push(categoryName);
      }

      await client.query(query, params);

      // Log the reset action
      await client.query(`
        INSERT INTO setting_audit_log (organization_id, setting_id, action, changed_by, new_value)
        SELECT $1, sd.id, 'updated', $2, 'RESET_TO_DEFAULT'
        FROM setting_definitions sd
        ${categoryName ? 'JOIN setting_categories sc ON sd.category_id = sc.id WHERE sc.name = $3' : ''}
      `, categoryName ? [organizationId, changedBy, categoryName] : [organizationId, changedBy]);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}