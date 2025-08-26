import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  WindowCard, 
  WindowInput 
} from '@/components/ui';
import {
  Upload,
  Trash2 as Delete,  
  Search,
  Grid3X3 as GridView,
  List,
  RefreshCw as Refresh,
  Folder as FolderOutlined,
  FileText as DescriptionOutlined,
  FolderPlus as CreateNewFolder,
} from 'lucide-react';
import { getModuleColor } from '@/lib/module-colors';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: string;
  path: string;
  mimeType?: string;
  url?: string;
}

interface DocumentExplorerProps {
  moduleId: string;
  initialPath?: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
  viewMode?: 'grid' | 'list';
}

export default function DocumentExplorerReal({
  moduleId,
  initialPath = '',
  allowUpload = true,
  allowDelete = true,
  viewMode: initialViewMode = 'grid'
}: DocumentExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const moduleColor = getModuleColor(moduleId);

  // Load files from storage
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/storage/${moduleId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📁 Arquivos recebidos para ${moduleId}:`, data.files?.length || 0);
        setFiles(data.files || []);
      } else {
        console.error('Failed to load files:', response.status, response.statusText);
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [moduleId, currentPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // File upload
  const handleFileUpload = async (files: FileList) => {
    if (!allowUpload || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📤 Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);

        const response = await fetch(`/api/storage/${moduleId}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Upload successful:', data);
          setUploadProgress(((i + 1) / files.length) * 100);
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to upload ${file.name}:`, response.status, errorText);
        }
      }

      await loadFiles(); // Reload files after upload
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }
  };

  // File deletion
  const handleDeleteSelected = async () => {
    if (!allowDelete || selectedFiles.size === 0) return;

    try {
      // Delete each selected file
      for (const fileId of selectedFiles) {
        const file = files.find(f => f.id === fileId);
        if (file && file.type === 'file') {
          const response = await fetch(`/api/storage/${moduleId}/files/${encodeURIComponent(file.path)}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            console.error(`Failed to delete ${file.name}`);
          }
        }
      }

      setSelectedFiles(new Set());
      await loadFiles();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    const folderName = prompt('Nome da pasta:');
    if (!folderName) return;

    try {
      const response = await fetch(`/api/storage/${moduleId}/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: folderName,
          path: currentPath 
        })
      });

      if (response.ok) {
        await loadFiles();
      } else {
        console.error('Failed to create folder');
      }
    } catch (error) {
      console.error('Create folder error:', error);
    }
  };

  // Get file icon - SIMPLICIDADE: pasta e arquivo, só isso
  const getFileIcon = (file: FileItem, size: number = 48) => {
    const iconSize = size;
    
    if (file.type === 'folder') {
      return <FolderOutlined sx={{ fontSize: iconSize, color: '#fbbf24' }} />;
    }
    
    // TODOS os arquivos usam o MESMO ícone, diferenciando APENAS por cor
    // Para arquivos .xlsx.url, pegar a extensão REAL (xlsx)
    const parts = file.name.toLowerCase().split('.');
    let ext = parts.pop() || '';
    
    // Se for .url ou .lnk, pegar a extensão anterior
    if ((ext === 'url' || ext === 'lnk') && parts.length > 1) {
      ext = parts[parts.length - 1]; // Pega a extensão antes do .url
    }
    
    let color = '#9ca3af'; // Cinza padrão
    
    // Definir cores por tipo de arquivo
    if (ext === 'pdf') {
      color = '#ef4444'; // Vermelho
    } else if (['xls', 'xlsx', 'xlsm', 'csv', 'ods'].includes(ext)) {
      color = '#22c55e'; // Verde  
    } else if (['doc', 'docx', 'txt', 'md', 'rtf', 'odt'].includes(ext)) {
      color = '#3b82f6'; // Azul
    } else if (['ppt', 'pptx', 'odp'].includes(ext)) {
      color = '#f97316'; // Laranja
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      color = '#10b981'; // Verde claro
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
      color = '#f59e0b'; // Amarelo
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'].includes(ext)) {
      color = '#8b5cf6'; // Roxo
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      color = '#6b7280'; // Cinza escuro
    } else if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'py'].includes(ext)) {
      color = '#06b6d4'; // Ciano
    } else if (['url', 'lnk'].includes(ext)) {
      color = '#94a3b8'; // Cinza claro para atalhos
    }
    
    return <DescriptionOutlined sx={{ fontSize: iconSize, color }} />;
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Sort and filter files
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const filteredFiles = sortedFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className={`max-w-6xl mx-auto pt-2 px-6 pb-6 relative ${isDragging ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <Upload sx={{ fontSize: 64, color: '#a855f7' }} className="mb-4 mx-auto animate-bounce" />
            <p className="text-2xl font-bold text-white mb-2">Solte os arquivos aqui</p>
            <p className="text-gray-300">Os arquivos serão enviados para {moduleId}</p>
          </div>
        </div>
      )}

      {/* Header com ações - espaço superior reduzido em 70% */}
      <div className="flex items-center justify-between mb-2">
        {/* Espaço inferior reduzido em 75% */}
        <div className="flex items-center space-x-4">
          {allowUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title={isUploading ? `${uploadProgress.toFixed(0)}%` : 'Upload'}
            >
              <Upload sx={{ fontSize: 32, color: isUploading ? '#6b7280' : '#9ca3af' }} />
            </button>
          )}
          
          <button
            onClick={handleCreateFolder}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Nova Pasta"
          >
            <CreateNewFolder sx={{ fontSize: 32, color: '#9ca3af' }} />
          </button>
          
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={viewMode === 'grid' ? 'Lista' : 'Grade'}
          >
            {viewMode === 'grid' ? 
              <List sx={{ fontSize: 32, color: '#9ca3af' }} /> : 
              <GridView sx={{ fontSize: 32, color: '#9ca3af' }} />
            }
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          {allowDelete && selectedFiles.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={`Excluir (${selectedFiles.size})`}
            >
              <Delete sx={{ fontSize: 32, color: '#ef4444' }} />
            </button>
          )}
          
          <button
            onClick={loadFiles}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Atualizar"
          >
            <Refresh sx={{ fontSize: 32, color: '#9ca3af' }} />
          </button>
        </div>
      </div>

      {/* Conteúdo principal - espaço reduzido em 24% */}
      <div className="space-y-4">
        {/* Barra de busca */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <WindowInput
              placeholder="Buscar arquivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search />}
            />
          </div>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="name-asc" className="bg-gray-800">Nome (A-Z)</option>
            <option value="name-desc" className="bg-gray-800">Nome (Z-A)</option>
            <option value="date-desc" className="bg-gray-800">Mais recente</option>
            <option value="date-asc" className="bg-gray-800">Mais antigo</option>
            <option value="size-desc" className="bg-gray-800">Maior</option>
            <option value="size-asc" className="bg-gray-800">Menor</option>
          </select>
        </div>

        {/* Lista/Grade de arquivos */}
        <WindowCard title="Documentos">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">Carregando...</div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">
                {searchTerm ? 'Nenhum arquivo encontrado' : 'Pasta vazia'}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.type === 'folder') {
                      setCurrentPath(file.path);
                    } else {
                      // Open file in new tab
                      if (file.url) {
                        window.open(file.url, '_blank');
                      }
                    }
                  }}
                  className={`
                    p-4 rounded-xl cursor-pointer transition-all hover:bg-white/[0.12]
                    ${selectedFiles.has(file.id) ? 'bg-white/[0.15] ring-2 ring-purple-500' : ''}
                  `}
                >
                  <div className="flex flex-col items-center">
                    <div className="mb-3 flex items-center justify-center">
                      {getFileIcon(file, 106)} {/* 220% of 48px = 106px */}
                    </div>
                    <span className="text-slate-200 text-xs text-center break-all">
                      {file.name}
                    </span>
                    {file.type === 'file' && (
                      <span className="text-slate-400 text-xs mt-1">
                        {formatFileSize(file.size)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.type === 'folder') {
                      setCurrentPath(file.path);
                    } else {
                      // Open file in new tab
                      if (file.url) {
                        window.open(file.url, '_blank');
                      }
                    }
                  }}
                  className={`
                    flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-all hover:bg-white/[0.12]
                    ${selectedFiles.has(file.id) ? 'bg-white/[0.15] ring-2 ring-purple-500' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file, 52)} {/* 220% of 24px = 52px for list view */}
                    <span className="text-slate-200 text-sm">{file.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-slate-400 text-xs">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{new Date(file.modified).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WindowCard>
      </div>


      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files);
          }
        }}
      />
    </div>
  );
}