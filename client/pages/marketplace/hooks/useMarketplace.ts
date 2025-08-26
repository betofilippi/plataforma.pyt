import { useState, useEffect, useCallback } from 'react';
import { MarketplaceModule, SearchFilters, SearchResult, ModuleCategory } from '../types';
import MarketplaceAPI from '../services/marketplace-api';

export function useMarketplace() {
  const [modules, setModules] = useState<MarketplaceModule[]>([]);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load initial data
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await MarketplaceAPI.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err.message || 'Failed to load categories');
    }
  };

  const searchModules = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await MarketplaceAPI.searchModules(filters);
      setModules(result.modules);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to search modules');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFeaturedModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await MarketplaceAPI.getFeaturedModules();
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to load featured modules');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTrendingModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await MarketplaceAPI.getTrendingModules();
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to load trending modules');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNewReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await MarketplaceAPI.getNewReleases();
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to load new releases');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    modules,
    categories,
    loading,
    error,
    searchModules,
    getFeaturedModules,
    getTrendingModules,
    getNewReleases,
    refreshCategories: loadCategories,
  };
}