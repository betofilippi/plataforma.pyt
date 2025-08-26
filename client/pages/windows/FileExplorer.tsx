import React, { useState, useEffect } from 'react';
import { 
  WindowCard, 
  WindowInput 
} from '@/components/ui';
import { 
  Folder, 
  File, 
  Search,
  Home as HomeIcon,
  RefreshCw as RefreshIcon,
  ArrowUp as ArrowUpIcon,
  Grid3X3 as GridIcon,
  List as ListIcon,
  ChevronRight
} from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

interface FileExplorerProps {
  initialPath?: string;
  title?: string;
}

export function FileExplorer({ initialPath = '/', title = 'Explorador de Arquivos' }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/files/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setCurrentPath(path);
      } else {
        console.error('Failed to load directory');
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      console.log('Open file:', item.path);
    }
  };

  const handleNavigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parentPath);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Filter files based on search term
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pt-2 px-6 pb-6">
      {/* Header com ações - espaço superior reduzido em 70% (de p-6 para pt-2) */}
      <div className="flex items-center justify-between mb-2">
        {/* Espaço inferior reduzido em 75% (de mb-8 para mb-2) */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => loadDirectory(initialPath)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Home"
          >
            <HomeIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
          </button>
          
          <button
            onClick={handleNavigateUp}
            disabled={currentPath === initialPath}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Voltar"
          >
            <ArrowUpIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
          </button>
          
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={viewMode === 'grid' ? 'Lista' : 'Grade'}
          >
            {viewMode === 'grid' ? 
              <ListIcon sx={{ fontSize: 32, color: '#9ca3af' }} /> : 
              <GridIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
            }
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
          </button>
        </div>
      </div>

      {/* Conteúdo principal - espaço reduzido em 24% (de space-y-6 para space-y-4.5) */}
      <div className="space-y-4">
        {/* Navegação e busca */}
        <div className="space-y-4">
          {/* Caminho atual */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-lg">
            <ChevronRight className="w-4 h-4 text-slate-500" />
            <span className="text-slate-200 text-sm flex-1">{currentPath}</span>
          </div>
          
          {/* Barra de busca */}
          <WindowInput
            placeholder="Buscar arquivos e pastas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search />}
          />
        </div>

        {/* Lista/Grade de arquivos */}
        <WindowCard title="Arquivos e Pastas">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshIcon className="animate-spin" sx={{ fontSize: 32, color: '#6b7280' }} />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">
                {searchTerm ? 'Nenhum arquivo encontrado' : 'Pasta vazia'}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-6 gap-4">
              {filteredFiles.map((file, index) => (
                <div
                  key={index}
                  onClick={() => handleItemClick(file)}
                  className="flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all hover:bg-white/[0.12]"
                >
                  {file.isDirectory ? (
                    <Folder className="w-12 h-12 text-yellow-500 mb-2" />
                  ) : (
                    <File className="w-12 h-12 text-slate-400 mb-2" />
                  )}
                  <span className="text-slate-200 text-xs text-center break-all">
                    {file.name}
                  </span>
                  {!file.isDirectory && file.size && (
                    <span className="text-slate-400 text-xs mt-1">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file, index) => (
                <div
                  key={index}
                  onClick={() => handleItemClick(file)}
                  className="flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-all hover:bg-white/[0.12]"
                >
                  <div className="flex items-center space-x-3">
                    {file.isDirectory ? (
                      <Folder className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <File className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-slate-200 text-sm">{file.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-slate-400 text-xs">
                    <span>{formatFileSize(file.size)}</span>
                    {file.modified && (
                      <span>{new Date(file.modified).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Estatísticas - movido para dentro do card, na parte inferior */}
          <div className="flex items-center justify-between text-xs text-slate-400 mt-4">
            <span>
              {filteredFiles.length} item(s) • {filteredFiles.filter(f => f.isDirectory).length} pasta(s) • {filteredFiles.filter(f => !f.isDirectory).length} arquivo(s)
            </span>
          </div>
        </WindowCard>
      </div>
    </div>
  );
}