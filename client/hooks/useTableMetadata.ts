/**
 * Hooks React para usar o serviço de metadados
 */

import React from 'react';
import { ColumnMetadata, TableMetadata } from '@/lib/table-metadata';
import { metadataService } from '@/lib/metadata-service';

export function useColumnMetadata(schema: string, table: string, column: string) {
  const [metadata, setMetadata] = React.useState<ColumnMetadata | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);
        
        const meta = await metadataService.getColumnMetadata(schema, table, column);
        setMetadata(meta);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetadata();
  }, [schema, table, column]);
  
  const updateMetadata = React.useCallback(async (updates: Partial<ColumnMetadata>) => {
    if (!metadata) return;
    
    const updated = { ...metadata, ...updates };
    
    try {
      await metadataService.saveColumnMetadata(updated);
      setMetadata(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update metadata');
    }
  }, [metadata]);
  
  return { metadata, loading, error, updateMetadata };
}

export function useTableMetadata(schema: string, table: string) {
  const [metadata, setMetadata] = React.useState<TableMetadata | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);
        
        const meta = await metadataService.getTableMetadata(schema, table);
        setMetadata(meta);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetadata();
  }, [schema, table]);
  
  const applyAutoDetection = React.useCallback(async () => {
    try {
      setError(null);
      await metadataService.applyAutoDetection(schema, table, false);
      
      // Recarregar metadata
      const updatedMeta = await metadataService.getTableMetadata(schema, table);
      setMetadata(updatedMeta);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-detection failed');
    }
  }, [schema, table]);
  
  return { metadata, loading, error, applyAutoDetection };
}