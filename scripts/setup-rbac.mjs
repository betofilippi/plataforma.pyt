#!/usr/bin/env node

/**
 * RBAC Setup Script for plataforma.app
 * 
 * This script initializes the Role-Based Access Control (RBAC) system by:
 * 1. Creating the RBAC database schema
 * 2. Setting up default roles and permissions  
 * 3. Assigning permissions to roles
 * 4. Creating the default admin user with super admin role
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PostgreSQL connection configuration
const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Bdebola2025@',
  host: process.env.DB_HOST || 'db.yhvtsbkotszxqndkhhhx.supabase.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function setupRBAC() {
  console.log('🔒 Setting up RBAC (Role-Based Access Control) system...\n');

  const pool = new Pool(DB_CONFIG);
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Read and execute the RBAC schema
    console.log('📜 Reading RBAC schema...');
    const rbacSchemaPath = join(__dirname, '../database/rbac-schema.sql');
    const rbacSchema = await readFile(rbacSchemaPath, 'utf8');
    console.log('✅ RBAC schema loaded\n');

    console.log('🏗️  Executing RBAC schema creation...');
    await pool.query(rbacSchema);
    console.log('✅ RBAC schema created successfully\n');

    // Verify the installation
    console.log('🔍 Verifying RBAC installation...');
    
    const [rolesResult, permissionsResult, userRolesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM plataforma_core.roles WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM plataforma_core.permissions WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM plataforma_core.user_roles WHERE is_active = true')
    ]);

    const stats = {
      roles: parseInt(rolesResult.rows[0].count),
      permissions: parseInt(permissionsResult.rows[0].count),
      userRoles: parseInt(userRolesResult.rows[0].count)
    };

    console.log('📊 RBAC System Statistics:');
    console.log(`   • Roles created: ${stats.roles}`);
    console.log(`   • Permissions created: ${stats.permissions}`);
    console.log(`   • User role assignments: ${stats.userRoles}\n`);

    // Show default roles
    const defaultRoles = await pool.query(`
      SELECT name, display_name, level, is_system
      FROM plataforma_core.roles 
      WHERE is_active = true 
      ORDER BY level DESC
    `);

    console.log('👥 Default Roles Created:');
    defaultRoles.rows.forEach(role => {
      const systemBadge = role.is_system ? ' [SYSTEM]' : '';
      console.log(`   • ${role.display_name} (${role.name}) - Level ${role.level}${systemBadge}`);
    });
    console.log();

    // Show permission modules
    const permissionModules = await pool.query(`
      SELECT 
        module_name, 
        COUNT(*) as permission_count
      FROM plataforma_core.permissions 
      WHERE is_active = true 
      GROUP BY module_name
      ORDER BY module_name NULLS FIRST
    `);

    console.log('📋 Permissions by Module:');
    permissionModules.rows.forEach(module => {
      const moduleName = module.module_name || 'Core System';
      console.log(`   • ${moduleName}: ${module.permission_count} permissions`);
    });
    console.log();

    // Check for admin user
    const adminUser = await pool.query(`
      SELECT u.email, u.name, u.is_active
      FROM plataforma_core.users u
      WHERE u.email = 'admin@plataforma.app'
    `);

    if (adminUser.rows.length > 0) {
      const user = adminUser.rows[0];
      console.log('👤 Default Admin User:');
      console.log(`   • Email: ${user.email}`);
      console.log(`   • Name: ${user.name}`);
      console.log(`   • Status: ${user.is_active ? 'Active' : 'Inactive'}`);
      
      // Check admin role assignment
      const adminRoleCheck = await pool.query(`
        SELECT r.name, r.display_name
        FROM plataforma_core.user_roles ur
        JOIN plataforma_core.roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT id FROM plataforma_core.users WHERE email = 'admin@plataforma.app')
          AND ur.is_active = true
      `);

      if (adminRoleCheck.rows.length > 0) {
        console.log('   • Roles:');
        adminRoleCheck.rows.forEach(role => {
          console.log(`     - ${role.display_name} (${role.name})`);
        });
      } else {
        console.log('   • ⚠️  No roles assigned');
      }
    } else {
      console.log('⚠️  Default admin user not found. You may need to create one manually.');
    }

    console.log('\n🎉 RBAC System Setup Complete!\n');

    console.log('📋 Next Steps:');
    console.log('1. Start your application server');
    console.log('2. Login as admin@plataforma.app (if created)');
    console.log('3. Visit /admin/permissions to manage the RBAC system');
    console.log('4. Create additional users and assign appropriate roles');
    console.log('5. Configure module-specific permissions as needed\n');

    console.log('🔧 Available API Endpoints:');
    console.log('• GET  /api/my-permissions          - Get current user permissions');
    console.log('• GET  /api/roles                   - List all roles');
    console.log('• GET  /api/permissions             - List all permissions');
    console.log('• POST /api/users/:id/roles         - Assign role to user');
    console.log('• GET  /api/permission-matrix       - View permission matrix');
    console.log('• GET  /api/permission-audit        - View audit log\n');

    console.log('📖 For detailed documentation, check the RBAC system files:');
    console.log('• server/permissions/               - Backend implementation');
    console.log('• client/components/rbac/           - Frontend components');
    console.log('• client/contexts/PermissionContext - Permission context');
    console.log('• database/rbac-schema.sql          - Database schema\n');

  } catch (error) {
    console.error('❌ Error setting up RBAC system:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupRBAC().catch(console.error);