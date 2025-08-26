import fs from 'fs-extra';
import path from 'path';
import { Client } from 'pg';
import { RegistryConfig } from '../types';

export interface Migration {
  id: string;
  name: string;
  sql: string;
  createdAt: Date;
}

export class DatabaseMigrator {
  private client: Client;
  private migrationsPath: string;

  constructor(config: RegistryConfig['database']) {
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl
    });

    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  /**
   * Initialize migration table
   */
  async initializeMigrationTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await this.client.query(sql);
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.client.query(
        'SELECT id FROM migrations ORDER BY executed_at'
      );
      return result.rows.map(row => row.id);
    } catch (error) {
      // Migration table doesn't exist yet
      return [];
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    const allMigrations = await this.loadMigrations();
    
    return allMigrations.filter(migration => !executed.includes(migration.id));
  }

  /**
   * Load all migration files
   */
  async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];

    // Load main schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (await fs.pathExists(schemaPath)) {
      const sql = await fs.readFile(schemaPath, 'utf-8');
      migrations.push({
        id: '001_initial_schema',
        name: 'Initial database schema',
        sql,
        createdAt: new Date('2024-01-01')
      });
    }

    // Load additional migrations
    if (await fs.pathExists(this.migrationsPath)) {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file);
        const sql = await fs.readFile(filePath, 'utf-8');
        const id = path.basename(file, '.sql');
        const name = id.replace(/^\d+_/, '').replace(/_/g, ' ');

        migrations.push({
          id,
          name,
          sql,
          createdAt: (await fs.stat(filePath)).mtime
        });
      }
    }

    return migrations.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Execute a migration
   */
  async executeMigration(migration: Migration): Promise<void> {
    console.log(`Executing migration: ${migration.name}`);
    
    try {
      await this.client.query('BEGIN');
      
      // Execute migration SQL
      await this.client.query(migration.sql);
      
      // Record migration as executed
      await this.client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      await this.client.query('COMMIT');
      console.log(`✓ Migration ${migration.name} completed`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw new Error(`Migration ${migration.name} failed: ${error.message}`);
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.initializeMigrationTable();
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      await this.executeMigration(migration);
    }

    console.log('All migrations completed successfully');
  }

  /**
   * Rollback last migration (dangerous - implement carefully)
   */
  async rollback(): Promise<void> {
    const executed = await this.getExecutedMigrations();
    const lastMigration = executed[executed.length - 1];

    if (!lastMigration) {
      console.log('No migrations to rollback');
      return;
    }

    console.warn(`Rolling back migration: ${lastMigration}`);
    console.warn('This operation is destructive and cannot be undone!');
    
    // This would require rollback scripts - implement as needed
    throw new Error('Rollback functionality not implemented yet');
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: Migration[];
    pending: Migration[];
  }> {
    const executedIds = await this.getExecutedMigrations();
    const allMigrations = await this.loadMigrations();
    
    const executed = allMigrations.filter(m => executedIds.includes(m.id));
    const pending = allMigrations.filter(m => !executedIds.includes(m.id));

    return { executed, pending };
  }

  /**
   * Seed database with initial data
   */
  async seed(): Promise<void> {
    console.log('Seeding database with initial data...');

    // Create admin user
    const adminUser = {
      username: 'admin',
      email: 'admin@plataforma.app',
      displayName: 'Administrator',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeL0YGCh0PFzZOEqa', // password: admin123
      role: 'admin',
      isVerified: true,
      permissions: JSON.stringify(['*'])
    };

    try {
      await this.client.query(`
        INSERT INTO users (username, email, display_name, password_hash, role, is_verified, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (username) DO NOTHING
      `, [
        adminUser.username,
        adminUser.email,
        adminUser.displayName,
        adminUser.passwordHash,
        adminUser.role,
        adminUser.isVerified,
        adminUser.permissions
      ]);

      console.log('✓ Admin user created (username: admin, password: admin123)');
    } catch (error) {
      console.warn('Could not create admin user:', error.message);
    }

    // Create sample packages would go here...
    console.log('Database seeding completed');
  }

  /**
   * Reset database (dangerous - drops all data)
   */
  async reset(): Promise<void> {
    console.warn('Resetting database - all data will be lost!');
    
    const tables = [
      'package_downloads',
      'package_ratings',
      'security_issues',
      'package_versions',
      'packages',
      'webhooks',
      'api_tokens',
      'tags',
      'categories',
      'users',
      'migrations'
    ];

    try {
      await this.client.query('BEGIN');
      
      // Drop materialized view
      await this.client.query('DROP MATERIALIZED VIEW IF EXISTS registry_stats');
      
      // Drop tables
      for (const table of tables) {
        await this.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
      
      await this.client.query('COMMIT');
      console.log('Database reset completed');
      
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw new Error(`Database reset failed: ${error.message}`);
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{
    connected: boolean;
    tablesCount: number;
    packagesCount: number;
    usersCount: number;
    lastMigration?: string;
  }> {
    try {
      // Test connection
      await this.client.query('SELECT 1');
      
      // Count tables
      const tablesResult = await this.client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      // Count packages
      const packagesResult = await this.client.query('SELECT COUNT(*) as count FROM packages');
      
      // Count users
      const usersResult = await this.client.query('SELECT COUNT(*) as count FROM users');
      
      // Last migration
      const migrationResult = await this.client.query(
        'SELECT id FROM migrations ORDER BY executed_at DESC LIMIT 1'
      );

      return {
        connected: true,
        tablesCount: parseInt(tablesResult.rows[0]?.count || '0'),
        packagesCount: parseInt(packagesResult.rows[0]?.count || '0'),
        usersCount: parseInt(usersResult.rows[0]?.count || '0'),
        lastMigration: migrationResult.rows[0]?.id
      };
    } catch (error) {
      return {
        connected: false,
        tablesCount: 0,
        packagesCount: 0,
        usersCount: 0
      };
    }
  }
}

// CLI interface
if (require.main === module) {
  const config: RegistryConfig['database'] = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'module_registry',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
  };

  const migrator = new DatabaseMigrator(config);
  const command = process.argv[2];

  (async () => {
    try {
      await migrator.connect();

      switch (command) {
        case 'migrate':
          await migrator.migrate();
          break;
        case 'seed':
          await migrator.seed();
          break;
        case 'status':
          const status = await migrator.getStatus();
          console.log(`Executed migrations: ${status.executed.length}`);
          console.log(`Pending migrations: ${status.pending.length}`);
          break;
        case 'reset':
          await migrator.reset();
          break;
        case 'health':
          const health = await migrator.healthCheck();
          console.log('Database health:', health);
          break;
        default:
          console.log('Usage: ts-node migrate.ts [migrate|seed|status|reset|health]');
      }
    } catch (error) {
      console.error('Migration error:', error.message);
      process.exit(1);
    } finally {
      await migrator.disconnect();
    }
  })();
}