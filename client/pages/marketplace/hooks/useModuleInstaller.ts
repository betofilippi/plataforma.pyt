import { useState, useEffect, useCallback } from 'react';
import { InstallationStatus } from '../types';
import MarketplaceAPI from '../services/marketplace-api';
import { toast } from '@/components/ui/use-toast';

export function useModuleInstaller() {
  const [installations, setInstallations] = useState<Map<string, InstallationStatus>>(new Map());
  const [installedModules, setInstalledModules] = useState<InstallationStatus[]>([]);

  // Load installed modules on mount
  useEffect(() => {
    loadInstalledModules();
  }, []);

  const loadInstalledModules = async () => {
    try {
      const installed = await MarketplaceAPI.getInstalledModules();
      setInstalledModules(installed);
      
      // Update installations map
      const newInstallations = new Map();
      installed.forEach(status => {
        newInstallations.set(status.moduleId, status);
      });
      setInstallations(newInstallations);
    } catch (error) {
      console.error('Failed to load installed modules:', error);
    }
  };

  const installModule = useCallback(async (moduleId: string, moduleName?: string) => {
    try {
      // Set installing status
      setInstallations(prev => new Map(prev).set(moduleId, {
        moduleId,
        status: 'installing',
        progress: 0,
      }));

      toast({
        title: "Instalando módulo",
        description: `Iniciando instalação de ${moduleName || moduleId}...`,
      });

      const status = await MarketplaceAPI.installModule(moduleId);
      
      // Update status
      setInstallations(prev => new Map(prev).set(moduleId, status));

      if (status.status === 'installed') {
        toast({
          title: "Módulo instalado",
          description: `${moduleName || moduleId} foi instalado com sucesso!`,
          variant: 'default',
        });
        
        // Reload installed modules
        await loadInstalledModules();
      } else if (status.status === 'failed') {
        toast({
          title: "Falha na instalação",
          description: status.error || `Falha ao instalar ${moduleName || moduleId}`,
          variant: 'destructive',
        });
      }

      return status;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      
      setInstallations(prev => new Map(prev).set(moduleId, {
        moduleId,
        status: 'failed',
        error: errorMessage,
      }));

      toast({
        title: "Erro na instalação",
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    }
  }, []);

  const uninstallModule = useCallback(async (moduleId: string, moduleName?: string) => {
    try {
      // Set uninstalling status
      setInstallations(prev => new Map(prev).set(moduleId, {
        moduleId,
        status: 'uninstalling',
      }));

      toast({
        title: "Desinstalando módulo",
        description: `Removendo ${moduleName || moduleId}...`,
      });

      await MarketplaceAPI.uninstallModule(moduleId);

      // Remove from installations
      setInstallations(prev => {
        const newMap = new Map(prev);
        newMap.delete(moduleId);
        return newMap;
      });

      toast({
        title: "Módulo removido",
        description: `${moduleName || moduleId} foi removido com sucesso!`,
        variant: 'default',
      });

      // Reload installed modules
      await loadInstalledModules();
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      
      setInstallations(prev => new Map(prev).set(moduleId, {
        moduleId,
        status: 'failed',
        error: errorMessage,
      }));

      toast({
        title: "Erro ao remover",
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    }
  }, []);

  const updateModule = useCallback(async (moduleId: string, moduleName?: string) => {
    try {
      // Set updating status
      setInstallations(prev => new Map(prev).set(moduleId, {
        moduleId,
        status: 'updating',
        progress: 0,
      }));

      toast({
        title: "Atualizando módulo",
        description: `Atualizando ${moduleName || moduleId}...`,
      });

      const status = await MarketplaceAPI.updateModule(moduleId);
      
      // Update status
      setInstallations(prev => new Map(prev).set(moduleId, status));

      if (status.status === 'installed') {
        toast({
          title: "Módulo atualizado",
          description: `${moduleName || moduleId} foi atualizado com sucesso!`,
          variant: 'default',
        });
        
        // Reload installed modules
        await loadInstalledModules();
      } else if (status.status === 'failed') {
        toast({
          title: "Falha na atualização",
          description: status.error || `Falha ao atualizar ${moduleName || moduleId}`,
          variant: 'destructive',
        });
      }

      return status;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      
      setInstallations(prev => new Map(prev).set(moduleId, {
        moduleId,
        status: 'failed',
        error: errorMessage,
      }));

      toast({
        title: "Erro na atualização",
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      const updates = await MarketplaceAPI.checkForUpdates();
      return updates;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return [];
    }
  }, []);

  const getInstallationStatus = useCallback((moduleId: string): InstallationStatus | null => {
    return installations.get(moduleId) || null;
  }, [installations]);

  const isModuleInstalled = useCallback((moduleId: string): boolean => {
    const status = installations.get(moduleId);
    return status?.status === 'installed';
  }, [installations]);

  const isModuleInstalling = useCallback((moduleId: string): boolean => {
    const status = installations.get(moduleId);
    return status?.status === 'installing' || status?.status === 'updating';
  }, [installations]);

  return {
    installations,
    installedModules,
    installModule,
    uninstallModule,
    updateModule,
    checkForUpdates,
    getInstallationStatus,
    isModuleInstalled,
    isModuleInstalling,
    refreshInstalledModules: loadInstalledModules,
  };
}