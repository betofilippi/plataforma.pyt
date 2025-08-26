import { Pool, Client, PoolConfig } from 'pg';
import { RegistryConfig } from '../types';

export class DatabaseConnection {
  private pool: Pool;
  private config: RegistryConfig['database'];

  constructor(config: RegistryConfig['database']) {
    this.config = config;
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Execute a query with automatic client management
   */
  async query(text: string, params?: any[]) {
    return await this.pool.query(text, params);
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(queries: Array<{ text: string; params?: any[] }> | ((client: any) => Promise<T>)): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let result: T;
      
      if (typeof queries === 'function') {
        result = await queries(client);
      } else {
        for (const query of queries) {
          await client.query(query.text, query.params);
        }
        result = undefined as T;
      }
      
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export * from './migrate';