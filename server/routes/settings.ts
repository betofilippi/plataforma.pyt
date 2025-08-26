import express from 'express';
import { Pool } from 'pg';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../auth/middleware';
import { RequirePermission } from '../permissions/middleware';
import { SettingsService } from '../settings/settingsService';
import { z } from 'zod';

// ===== VALIDATION SCHEMAS =====

const organizationCreateSchema = z.object({
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
});

const settingUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.string().nullable(),
});

const bulkSettingsUpdateSchema = z.object({
  settings: z.array(settingUpdateSchema),
});

const templateSaveSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  settings: z.record(z.any()),
  isPublic: z.boolean().default(false),
});

const importSettingsSchema = z.object({
  templateData: z.record(z.any()),
});

// ===== MIDDLEWARE =====

// Rate limiting for settings API
const settingsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many settings requests from this IP, please try again later',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for sensitive operations
const sensitiveRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit to 10 sensitive operations per 5 minutes
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later',
    code: 'RATE_LIMITED_SENSITIVE'
  },
});

// ===== ROUTES FACTORY =====

export function createSettingsRoutes(pool: Pool): express.Router {
  const router = express.Router();
  const settingsService = new SettingsService(pool);

  // Apply rate limiting to all settings routes
  router.use(settingsRateLimit);

  // All settings routes require authentication
  router.use(requireAuth(pool));

  // Helper to get organization ID from request
  const getOrgId = (req: express.Request): string => {
    // For now, use a default organization ID
    // In a real multi-tenant app, this would come from user's organization
    return req.body.organizationId || 
           req.query.organizationId || 
           '00000000-0000-0000-0000-000000000001';
  };

  // Helper to get user ID from request
  const getUserId = (req: express.Request): string | undefined => {
    return (req as any).user?.id;
  };

  // ===== ORGANIZATION ROUTES =====

  // GET /api/settings/organization - Get organization info
  router.get('/organization', async (req, res) => {
    try {
      const organizationId = getOrgId(req);
      const organization = await settingsService.getOrganization(organizationId);

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: organization
      });
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization',
        code: 'FETCH_ERROR'
      });
    }
  });

  // POST /api/settings/organization - Create organization (admin only)
  router.post('/organization', 
    RequirePermission(['admin', 'system_admin']),
    async (req, res) => {
      try {
        const validatedData = organizationCreateSchema.parse(req.body);
        const organizationId = await settingsService.createOrganization(validatedData);

        res.status(201).json({
          success: true,
          data: { id: organizationId },
          message: 'Organization created successfully'
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors,
            code: 'VALIDATION_ERROR'
          });
        }

        console.error('Error creating organization:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create organization',
          code: 'CREATE_ERROR'
        });
      }
    }
  );

  // ===== SETTING CATEGORIES =====

  // GET /api/settings/categories - Get all setting categories
  router.get('/categories', async (req, res) => {
    try {
      const categories = await settingsService.getSettingCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      console.error('Error fetching setting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch setting categories',
        code: 'FETCH_ERROR'
      });
    }
  });

  // ===== SETTING DEFINITIONS =====

  // GET /api/settings/definitions - Get setting definitions
  router.get('/definitions', async (req, res) => {
    try {
      const categoryName = req.query.category as string;
      const definitions = await settingsService.getSettingDefinitions(categoryName);

      res.json({
        success: true,
        data: definitions
      });
    } catch (error: any) {
      console.error('Error fetching setting definitions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch setting definitions',
        code: 'FETCH_ERROR'
      });
    }
  });

  // ===== ORGANIZATION SETTINGS =====

  // GET /api/settings - Get all organization settings
  router.get('/', async (req, res) => {
    try {
      const organizationId = getOrgId(req);
      const settings = await settingsService.getOrganizationSettings(organizationId);

      // Group settings by category for easier frontend consumption
      const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.categoryName]) {
          acc[setting.categoryName] = {
            name: setting.categoryName,
            displayName: setting.categoryDisplayName,
            settings: []
          };
        }
        acc[setting.categoryName].settings.push(setting);
        return acc;
      }, {} as Record<string, any>);

      res.json({
        success: true,
        data: Object.values(groupedSettings)
      });
    } catch (error: any) {
      console.error('Error fetching organization settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization settings',
        code: 'FETCH_ERROR'
      });
    }
  });

  // GET /api/settings/:key - Get specific setting value
  router.get('/:key', async (req, res) => {
    try {
      const organizationId = getOrgId(req);
      const { key } = req.params;
      
      const value = await settingsService.getSettingValue(organizationId, key);

      res.json({
        success: true,
        data: {
          key,
          value
        }
      });
    } catch (error: any) {
      console.error('Error fetching setting value:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch setting value',
        code: 'FETCH_ERROR'
      });
    }
  });

  // PUT /api/settings/:key - Update specific setting
  router.put('/:key', 
    RequirePermission(['admin', 'settings_manage']),
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const { key } = req.params;
        const { value } = req.body;
        const changedBy = getUserId(req);

        // Validate the setting value
        const validation = await settingsService.validateSettingValue(key, value);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error || 'Invalid setting value',
            code: 'VALIDATION_ERROR'
          });
        }

        const success = await settingsService.setSettingValue(
          organizationId,
          key,
          value,
          changedBy
        );

        if (!success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update setting',
            code: 'UPDATE_ERROR'
          });
        }

        res.json({
          success: true,
          message: 'Setting updated successfully'
        });
      } catch (error: any) {
        console.error('Error updating setting:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to update setting',
          code: 'UPDATE_ERROR'
        });
      }
    }
  );

  // PUT /api/settings - Bulk update settings
  router.put('/',
    RequirePermission(['admin', 'settings_manage']),
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const validatedData = bulkSettingsUpdateSchema.parse(req.body);
        const changedBy = getUserId(req);

        // Validate all settings first
        const validationErrors: string[] = [];
        for (const setting of validatedData.settings) {
          const validation = await settingsService.validateSettingValue(
            setting.key, 
            setting.value || ''
          );
          if (!validation.valid) {
            validationErrors.push(`${setting.key}: ${validation.error}`);
          }
        }

        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Validation errors occurred',
            errors: validationErrors,
            code: 'VALIDATION_ERROR'
          });
        }

        const success = await settingsService.bulkUpdateSettings(
          organizationId,
          validatedData.settings,
          changedBy
        );

        if (!success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            code: 'UPDATE_ERROR'
          });
        }

        res.json({
          success: true,
          message: `Successfully updated ${validatedData.settings.length} settings`
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors,
            code: 'VALIDATION_ERROR'
          });
        }

        console.error('Error bulk updating settings:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update settings',
          code: 'UPDATE_ERROR'
        });
      }
    }
  );

  // ===== VALIDATION =====

  // POST /api/settings/validate - Validate setting value
  router.post('/validate', async (req, res) => {
    try {
      const { key, value } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Setting key is required',
          code: 'MISSING_KEY'
        });
      }

      const validation = await settingsService.validateSettingValue(key, value);

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          error: validation.error
        }
      });
    } catch (error: any) {
      console.error('Error validating setting:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate setting',
        code: 'VALIDATION_ERROR'
      });
    }
  });

  // ===== AUDIT LOG =====

  // GET /api/settings/audit - Get setting audit log
  router.get('/audit/log',
    RequirePermission(['admin', 'audit_view']),
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const settingKey = req.query.settingKey as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

        const auditLog = await settingsService.getSettingAuditLog(
          organizationId,
          settingKey,
          limit
        );

        res.json({
          success: true,
          data: auditLog
        });
      } catch (error: any) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch audit log',
          code: 'FETCH_ERROR'
        });
      }
    }
  );

  // ===== IMPORT/EXPORT =====

  // GET /api/settings/export - Export settings
  router.get('/export',
    RequirePermission(['admin', 'settings_export']),
    sensitiveRateLimit,
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const exportData = await settingsService.exportSettings(organizationId);

        res.json({
          success: true,
          data: exportData
        });
      } catch (error: any) {
        console.error('Error exporting settings:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to export settings',
          code: 'EXPORT_ERROR'
        });
      }
    }
  );

  // POST /api/settings/import - Import settings
  router.post('/import',
    RequirePermission(['admin', 'settings_import']),
    sensitiveRateLimit,
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const validatedData = importSettingsSchema.parse(req.body);
        const changedBy = getUserId(req);

        const result = await settingsService.importSettings(
          organizationId,
          validatedData.templateData,
          changedBy
        );

        res.json({
          success: result.success,
          data: {
            imported: result.imported,
            errors: result.errors
          },
          message: result.success 
            ? `Successfully imported ${result.imported} settings`
            : 'Import completed with errors'
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors,
            code: 'VALIDATION_ERROR'
          });
        }

        console.error('Error importing settings:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to import settings',
          code: 'IMPORT_ERROR'
        });
      }
    }
  );

  // POST /api/settings/templates - Save settings template
  router.post('/templates',
    RequirePermission(['admin', 'settings_template']),
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const validatedData = templateSaveSchema.parse(req.body);
        const createdBy = getUserId(req);

        const templateData = {
          version: '1.0',
          createdAt: new Date().toISOString(),
          organizationId,
          settings: validatedData.settings,
        };

        const templateId = await settingsService.saveTemplate({
          name: validatedData.name,
          description: validatedData.description,
          templateData,
          isPublic: validatedData.isPublic,
          createdBy,
        });

        res.status(201).json({
          success: true,
          data: { id: templateId },
          message: 'Template saved successfully'
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors,
            code: 'VALIDATION_ERROR'
          });
        }

        console.error('Error saving template:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to save template',
          code: 'SAVE_ERROR'
        });
      }
    }
  );

  // ===== RESET AND MAINTENANCE =====

  // POST /api/settings/reset - Reset settings to defaults
  router.post('/reset',
    RequirePermission(['admin']),
    sensitiveRateLimit,
    async (req, res) => {
      try {
        const organizationId = getOrgId(req);
        const { categoryName } = req.body;
        const changedBy = getUserId(req);

        const success = await settingsService.resetToDefaults(
          organizationId,
          categoryName,
          changedBy
        );

        if (!success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to reset settings',
            code: 'RESET_ERROR'
          });
        }

        res.json({
          success: true,
          message: categoryName 
            ? `Reset ${categoryName} settings to defaults`
            : 'Reset all settings to defaults'
        });
      } catch (error: any) {
        console.error('Error resetting settings:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to reset settings',
          code: 'RESET_ERROR'
        });
      }
    }
  );

  // POST /api/settings/cleanup - Cleanup old audit logs
  router.post('/cleanup',
    RequirePermission(['admin', 'system_admin']),
    sensitiveRateLimit,
    async (req, res) => {
      try {
        const { retentionDays = 90 } = req.body;
        const cleanedCount = await settingsService.cleanupExpiredAuditLogs(retentionDays);

        res.json({
          success: true,
          data: { cleanedCount },
          message: `Cleaned up ${cleanedCount} expired audit log entries`
        });
      } catch (error: any) {
        console.error('Error cleaning up audit logs:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to cleanup audit logs',
          code: 'CLEANUP_ERROR'
        });
      }
    }
  );

  return router;
}

export default createSettingsRoutes;