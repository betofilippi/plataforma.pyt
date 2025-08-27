// =====================================================================
// SISTEMA DE BACKUP INCREMENTAL E RECOVERY POR MÓDULO
// Backup automático + Point-in-time recovery + Compressão + Verificação
// =====================================================================

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { createHash, createCipher, createDecipher } from 'crypto';
import { spawn } from 'child_process';

export interface BackupConfig {
  module_name: string;
  schema_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  schedule: string; // Cron expression
  retention_days: number;
  compression: boolean;
  encryption: boolean;
  storage_path: string;
  verify_after_backup: boolean;
  exclude_tables?: string[];
  include_only?: string[];
}

export interface BackupMetadata {
  id: string;
  module_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  file_path: string;
  file_size: number;
  compressed_size: number;
  checksum: string;
  encryption_key_id?: string;
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  status: 'running' | 'completed' | 'failed' | 'verified';
  error_message?: string;
  base_backup_id?: string; // Para incrementais
  lsn_start?: string;
  lsn_end?: string;
  table_count: number;
  row_count: number;
}

export interface RestorePoint {
  id: string;
  module_name: string;
  timestamp: Date;
  backup_chain: string[]; // IDs dos backups necessários
  description?: string;
}

export interface RecoveryPlan {
  target_time: Date;
  required_backups: BackupMetadata[];
  estimated_time: number;
  data_loss_warning?: string;
}

export class BackupManager {
  private pool: Pool;
  private backupsTable = 'plataforma_backups';
  private restorePointsTable = 'plataforma_restore_points';
  private runningBackups = new Map<string, AbortController>();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Inicializar sistema de backup
   */
  async initialize(): Promise<void> {
    console.log('💾 Inicializando sistema de backup...');
    
    await this.createBackupTables();
    await this.createBackupFunctions();
    
    console.log('✅ Sistema de backup inicializado');
  }

  /**
   * Registrar configuração de backup para módulo
   */
  async configureModuleBackup(config: BackupConfig): Promise<void> {
    console.log(`⚙️ Configurando backup para módulo: ${config.module_name}`);
    
    // Verificar se diretório de backup existe
    const backupDir = path.dirname(config.storage_path);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    await this.pool.query(`
      INSERT INTO plataforma_backup_configs (
        module_name, schema_name, backup_type, schedule, retention_days,
        compression, encryption, storage_path, verify_after_backup,
        exclude_tables, include_only, config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (module_name)
      DO UPDATE SET
        schema_name = EXCLUDED.schema_name,
        backup_type = EXCLUDED.backup_type,
        schedule = EXCLUDED.schedule,
        retention_days = EXCLUDED.retention_days,
        compression = EXCLUDED.compression,
        encryption = EXCLUDED.encryption,
        storage_path = EXCLUDED.storage_path,
        verify_after_backup = EXCLUDED.verify_after_backup,
        exclude_tables = EXCLUDED.exclude_tables,
        include_only = EXCLUDED.include_only,
        config = EXCLUDED.config,
        updated_at = NOW()
    `, [
      config.module_name,
      config.schema_name,
      config.backup_type,
      config.schedule,
      config.retention_days,
      config.compression,
      config.encryption,
      config.storage_path,
      config.verify_after_backup,
      JSON.stringify(config.exclude_tables || []),
      JSON.stringify(config.include_only || []),
      JSON.stringify(config)
    ]);
    
    console.log(`✅ Backup configurado: ${config.module_name}`);
  }

  /**
   * Executar backup de um módulo
   */
  async executeBackup(moduleName: string, backupType?: 'full' | 'incremental'): Promise<BackupMetadata> {
    console.log(`🚀 Iniciando backup: ${moduleName}`);
    
    // Obter configuração do módulo
    const config = await this.getModuleBackupConfig(moduleName);
    if (!config) {
      throw new Error(`No backup configuration found for module: ${moduleName}`);
    }
    
    const finalBackupType = backupType || config.backup_type;
    const backupId = this.generateBackupId(moduleName, finalBackupType);
    
    // Verificar se já existe backup em execução
    if (this.runningBackups.has(moduleName)) {
      throw new Error(`Backup already running for module: ${moduleName}`);
    }
    
    const abortController = new AbortController();
    this.runningBackups.set(moduleName, abortController);
    
    try {
      const startTime = new Date();
      
      // Registrar início do backup
      await this.pool.query(`
        INSERT INTO ${this.backupsTable} (
          id, module_name, backup_type, started_at, status
        ) VALUES ($1, $2, $3, $4, 'running')
      `, [backupId, moduleName, finalBackupType, startTime]);
      
      // Executar backup baseado no tipo
      let metadata: Partial<BackupMetadata>;
      
      switch (finalBackupType) {
        case 'full':
          metadata = await this.executeFullBackup(config, backupId, abortController.signal);
          break;
        case 'incremental':
          metadata = await this.executeIncrementalBackup(config, backupId, abortController.signal);
          break;
        case 'differential':
          metadata = await this.executeDifferentialBackup(config, backupId, abortController.signal);
          break;
        default:
          throw new Error(`Unsupported backup type: ${finalBackupType}`);
      }
      
      const completedAt = new Date();
      const duration = completedAt.getTime() - startTime.getTime();
      
      // Atualizar metadados do backup
      await this.pool.query(`
        UPDATE ${this.backupsTable} SET
          file_path = $1,
          file_size = $2,
          compressed_size = $3,
          checksum = $4,
          completed_at = $5,
          duration_ms = $6,
          status = 'completed',
          table_count = $7,
          row_count = $8
        WHERE id = $9
      `, [
        metadata.file_path,
        metadata.file_size,
        metadata.compressed_size,
        metadata.checksum,
        completedAt,
        duration,
        metadata.table_count,
        metadata.row_count,
        backupId
      ]);
      
      // Verificar backup se configurado
      if (config.verify_after_backup) {
        await this.verifyBackup(backupId);
      }
      
      // Limpar backups antigos
      await this.cleanupOldBackups(moduleName, config.retention_days);
      
      const finalMetadata: BackupMetadata = {
        id: backupId,
        module_name: moduleName,
        backup_type: finalBackupType,
        file_path: metadata.file_path!,
        file_size: metadata.file_size!,
        compressed_size: metadata.compressed_size!,
        checksum: metadata.checksum!,
        started_at: startTime,
        completed_at: completedAt,
        duration_ms: duration,
        status: 'completed',
        table_count: metadata.table_count!,
        row_count: metadata.row_count!
      };
      
      console.log(`✅ Backup concluído: ${moduleName} (${duration}ms, ${this.formatBytes(metadata.file_size!)})`);
      
      return finalMetadata;
      
    } catch (error) {
      // Marcar backup como falhado
      await this.pool.query(`
        UPDATE ${this.backupsTable} SET
          status = 'failed',
          error_message = $1,
          completed_at = NOW()
        WHERE id = $2
      `, [(error as Error).message, backupId]);
      
      console.error(`❌ Backup failed for ${moduleName}:`, error);
      throw error;
      
    } finally {
      this.runningBackups.delete(moduleName);
    }
  }

  /**
   * Restaurar módulo a partir de backup
   */
  async restoreFromBackup(
    moduleName: string,
    backupId: string,
    targetSchema?: string
  ): Promise<void> {
    console.log(`♻️ Iniciando restauração: ${moduleName} from ${backupId}`);
    
    const backup = await this.getBackupMetadata(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    if (backup.module_name !== moduleName) {
      throw new Error(`Backup ${backupId} does not belong to module ${moduleName}`);
    }
    
    // Verificar integridade do backup
    const isValid = await this.verifyBackupFile(backup);
    if (!isValid) {
      throw new Error(`Backup file is corrupted: ${backupId}`);
    }
    
    const restoreSchema = targetSchema || `${backup.module_name}_restore_${Date.now()}`;
    
    try {
      // Criar schema de restauração
      await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${restoreSchema}`);
      
      // Restaurar baseado no tipo de backup
      if (backup.backup_type === 'incremental') {
        await this.restoreIncrementalChain(backup, restoreSchema);
      } else {
        await this.restoreFullBackup(backup, restoreSchema);
      }
      
      console.log(`✅ Restauração concluída: ${moduleName} -> ${restoreSchema}`);
      
    } catch (error) {
      console.error(`❌ Restore failed for ${moduleName}:`, error);
      
      // Limpar schema de restauração em caso de erro
      try {
        await this.pool.query(`DROP SCHEMA IF EXISTS ${restoreSchema} CASCADE`);
      } catch (cleanupError) {
        console.error('Failed to cleanup restore schema:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Criar ponto de restauração
   */
  async createRestorePoint(moduleName: string, description?: string): Promise<RestorePoint> {
    console.log(`📍 Criando ponto de restauração: ${moduleName}`);
    
    const restorePointId = this.generateRestorePointId(moduleName);
    const timestamp = new Date();
    
    // Obter chain de backups necessários
    const backupChain = await this.getBackupChain(moduleName, timestamp);
    
    const restorePoint: RestorePoint = {
      id: restorePointId,
      module_name: moduleName,
      timestamp,
      backup_chain: backupChain.map(b => b.id),
      description
    };
    
    await this.pool.query(`
      INSERT INTO ${this.restorePointsTable} (
        id, module_name, timestamp, backup_chain, description
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      restorePoint.id,
      restorePoint.module_name,
      restorePoint.timestamp,
      JSON.stringify(restorePoint.backup_chain),
      restorePoint.description
    ]);
    
    console.log(`✅ Ponto de restauração criado: ${restorePointId}`);
    
    return restorePoint;
  }

  /**
   * Obter plano de recovery para um momento específico
   */
  async getRecoveryPlan(moduleName: string, targetTime: Date): Promise<RecoveryPlan> {
    console.log(`📋 Criando plano de recovery: ${moduleName} @ ${targetTime.toISOString()}`);
    
    const backupChain = await this.getBackupChain(moduleName, targetTime);
    
    if (backupChain.length === 0) {
      throw new Error(`No backups available for recovery at ${targetTime.toISOString()}`);
    }
    
    // Calcular tempo estimado baseado no tamanho dos backups
    const totalSize = backupChain.reduce((sum, backup) => sum + backup.file_size, 0);
    const estimatedTime = Math.ceil(totalSize / (50 * 1024 * 1024)) * 1000; // ~50MB/s
    
    // Verificar possível perda de dados
    let dataLossWarning: string | undefined;
    const latestBackup = backupChain[backupChain.length - 1];
    if (latestBackup.completed_at < targetTime) {
      const lossMinutes = Math.ceil((targetTime.getTime() - latestBackup.completed_at.getTime()) / 60000);
      dataLossWarning = `Possible data loss: ${lossMinutes} minutes of data after latest backup`;
    }
    
    return {
      target_time: targetTime,
      required_backups: backupChain,
      estimated_time: estimatedTime,
      data_loss_warning: dataLossWarning
    };
  }

  /**
   * Listar backups de um módulo
   */
  async listModuleBackups(moduleName: string, limit: number = 50): Promise<BackupMetadata[]> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.backupsTable}
      WHERE module_name = $1
      ORDER BY started_at DESC
      LIMIT $2
    `, [moduleName, limit]);
    
    return result.rows;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async createBackupTables(): Promise<void> {
    await this.pool.query(`
      -- Configurações de backup
      CREATE TABLE IF NOT EXISTS plataforma_backup_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_name VARCHAR(100) NOT NULL UNIQUE,
        schema_name VARCHAR(100) NOT NULL,
        backup_type VARCHAR(20) DEFAULT 'full',
        schedule VARCHAR(100), -- Cron expression
        retention_days INTEGER DEFAULT 30,
        compression BOOLEAN DEFAULT true,
        encryption BOOLEAN DEFAULT false,
        storage_path TEXT NOT NULL,
        verify_after_backup BOOLEAN DEFAULT true,
        exclude_tables JSONB DEFAULT '[]',
        include_only JSONB DEFAULT '[]',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Metadados dos backups
      CREATE TABLE IF NOT EXISTS ${this.backupsTable} (
        id VARCHAR(100) PRIMARY KEY,
        module_name VARCHAR(100) NOT NULL,
        backup_type VARCHAR(20) NOT NULL,
        file_path TEXT,
        file_size BIGINT,
        compressed_size BIGINT,
        checksum VARCHAR(64),
        encryption_key_id VARCHAR(100),
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER,
        status VARCHAR(20) DEFAULT 'running',
        error_message TEXT,
        base_backup_id VARCHAR(100), -- Para incrementais
        lsn_start TEXT,
        lsn_end TEXT,
        table_count INTEGER DEFAULT 0,
        row_count BIGINT DEFAULT 0
      );

      -- Pontos de restauração
      CREATE TABLE IF NOT EXISTS ${this.restorePointsTable} (
        id VARCHAR(100) PRIMARY KEY,
        module_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        backup_chain JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Índices
      CREATE INDEX IF NOT EXISTS idx_backups_module ON ${this.backupsTable}(module_name, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_backups_status ON ${this.backupsTable}(status);
      CREATE INDEX IF NOT EXISTS idx_restore_points_module ON ${this.restorePointsTable}(module_name, timestamp DESC);
    `);
  }

  private async createBackupFunctions(): Promise<void> {
    await this.pool.query(`
      -- Função para limpar backups antigos
      CREATE OR REPLACE FUNCTION plataforma_core.cleanup_old_backups(
        p_module_name VARCHAR,
        p_retention_days INTEGER
      ) RETURNS INTEGER AS $$
      DECLARE
        cleanup_count INTEGER;
      BEGIN
        DELETE FROM ${this.backupsTable}
        WHERE module_name = p_module_name
          AND started_at < NOW() - (p_retention_days || ' days')::INTERVAL
          AND status IN ('completed', 'failed');
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        RETURN cleanup_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  private async executeFullBackup(
    config: BackupConfig,
    backupId: string,
    signal: AbortSignal
  ): Promise<Partial<BackupMetadata>> {
    
    const fileName = `${backupId}_full.sql`;
    const filePath = path.join(config.storage_path, fileName);
    
    // Executar pg_dump para o schema específico
    const dumpArgs = [
      '--host=localhost', // Ajustar conforme necessário
      '--schema=' + config.schema_name,
      '--verbose',
      '--no-password',
      '--format=custom',
      '--file=' + filePath
    ];
    
    // Adicionar tabelas específicas se configurado
    if (config.include_only && config.include_only.length > 0) {
      config.include_only.forEach(table => {
        dumpArgs.push('--table=' + config.schema_name + '.' + table);
      });
    }
    
    // Excluir tabelas se configurado
    if (config.exclude_tables && config.exclude_tables.length > 0) {
      config.exclude_tables.forEach(table => {
        dumpArgs.push('--exclude-table=' + config.schema_name + '.' + table);
      });
    }
    
    await this.executePgDump(dumpArgs, signal);
    
    // Calcular estatísticas
    const fileSize = fs.statSync(filePath).size;
    let compressedSize = fileSize;
    
    // Comprimir se configurado
    if (config.compression) {
      await this.compressFile(filePath);
      compressedSize = fs.statSync(filePath + '.gz').size;
    }
    
    // Calcular checksum
    const checksum = await this.calculateFileChecksum(config.compression ? filePath + '.gz' : filePath);
    
    // Obter contadores
    const stats = await this.getSchemaStats(config.schema_name);
    
    return {
      file_path: config.compression ? filePath + '.gz' : filePath,
      file_size: fileSize,
      compressed_size: compressedSize,
      checksum: checksum,
      table_count: stats.tableCount,
      row_count: stats.rowCount
    };
  }

  private async executeIncrementalBackup(
    config: BackupConfig,
    backupId: string,
    signal: AbortSignal
  ): Promise<Partial<BackupMetadata>> {
    
    // Para backup incremental, precisamos do último backup completo
    const baseBackup = await this.getLatestFullBackup(config.module_name);
    if (!baseBackup) {
      throw new Error('No base backup found for incremental backup');
    }
    
    // Implementar lógica específica de backup incremental
    // Por ora, fazer backup completo como fallback
    return this.executeFullBackup(config, backupId, signal);
  }

  private async executeDifferentialBackup(
    config: BackupConfig,
    backupId: string,
    signal: AbortSignal
  ): Promise<Partial<BackupMetadata>> {
    
    // Implementar backup diferencial
    return this.executeFullBackup(config, backupId, signal);
  }

  private async executePgDump(args: string[], signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const pgDump = spawn('pg_dump', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      signal.addEventListener('abort', () => {
        pgDump.kill('SIGTERM');
        reject(new Error('Backup aborted'));
      });
      
      let output = '';
      let errorOutput = '';
      
      pgDump.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      pgDump.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pgDump.on('error', (error) => {
        reject(new Error(`Failed to start pg_dump: ${error.message}`));
      });
    });
  }

  private async compressFile(filePath: string): Promise<void> {
    const readStream = fs.createReadStream(filePath);
    const writeStream = fs.createWriteStream(filePath + '.gz');
    const gzipStream = zlib.createGzip({ level: 9 });
    
    return new Promise((resolve, reject) => {
      readStream
        .pipe(gzipStream)
        .pipe(writeStream)
        .on('finish', () => {
          fs.unlinkSync(filePath); // Remove arquivo original
          resolve();
        })
        .on('error', reject);
    });
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async getSchemaStats(schemaName: string): Promise<{ tableCount: number; rowCount: number }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as table_count,
        COALESCE(SUM(n_tup_ins + n_tup_upd), 0) as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = $1
    `, [schemaName]);
    
    return {
      tableCount: parseInt(result.rows[0].table_count),
      rowCount: parseInt(result.rows[0].row_count)
    };
  }

  private generateBackupId(moduleName: string, backupType: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${moduleName}_${backupType}_${timestamp}`;
  }

  private generateRestorePointId(moduleName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `restore_${moduleName}_${timestamp}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Implementar outros métodos privados conforme necessário...
  private async getModuleBackupConfig(moduleName: string): Promise<BackupConfig | null> {
    // Implementar
    return null;
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    // Implementar
    return null;
  }

  private async verifyBackup(backupId: string): Promise<boolean> {
    // Implementar
    return true;
  }

  private async cleanupOldBackups(moduleName: string, retentionDays: number): Promise<void> {
    // Implementar
  }

  private async verifyBackupFile(backup: BackupMetadata): Promise<boolean> {
    // Implementar
    return true;
  }

  private async restoreIncrementalChain(backup: BackupMetadata, targetSchema: string): Promise<void> {
    // Implementar
  }

  private async restoreFullBackup(backup: BackupMetadata, targetSchema: string): Promise<void> {
    // Implementar
  }

  private async getBackupChain(moduleName: string, targetTime: Date): Promise<BackupMetadata[]> {
    // Implementar
    return [];
  }

  private async getLatestFullBackup(moduleName: string): Promise<BackupMetadata | null> {
    // Implementar
    return null;
  }
}

/**
 * Factory function
 */
export function createBackupManager(pool: Pool): BackupManager {
  return new BackupManager(pool);
}