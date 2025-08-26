import React, { useState, useRef, useCallback } from 'react';
import { Folder, FileText as Description, Image, CircleHelp as VideoFile, CircleHelp as AudioFile, CircleHelp as PictureAsPdf, CircleHelp as Archive, Code, FileText as Article, Upload, FolderPlus as CreateNewFolder, Trash2 as Delete, Download, CircleHelp as GridView, CircleHelp as List, Search, ArrowUpDown as Sort, Filter as FilterList} from "lucide-react";
import { getModuleColor } from '@/lib/module-colors';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  extension?: string;
  mimeType?: string;
  path: string;
  thumbnail?: string;
}

interface DocumentExplorerProps {
  moduleId: string;
  initialPath?: string;
  onFileSelect?: (file: FileItem) => void;
  onFileUpload?: (files: File[]) => void;
  allowUpload?: boolean;
  allowDelete?: boolean;
  viewMode?: 'grid' | 'list';
}

// Função para obter ícone baseado no tipo de arquivo
const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') {
    return <Folder sx={{ fontSize: 48 }} />;
  }

  const ext = file.extension?.toLowerCase() || '';
  const mime = file.mimeType || '';

  // Imagens
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return <Image sx={{ fontSize: 48 }} />;
  }

  // PDFs
  if (mime === 'application/pdf' || ext === 'pdf') {
    return <PictureAsPdf sx={{ fontSize: 48 }} />;
  }

  // Vídeos
  if (mime.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
    return <VideoFile sx={{ fontSize: 48 }} />;
  }

  // Áudio
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return <AudioFile sx={{ fontSize: 48 }} />;
  }

  // Código
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml'].includes(ext)) {
    return <Code sx={{ fontSize: 48 }} />;
  }

  // Documentos
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return <Article sx={{ fontSize: 48 }} />;
  }

  // Arquivos compactados
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive sx={{ fontSize: 48 }} />;
  }

  // Padrão
  return <Description sx={{ fontSize: 48 }} />;
};

// Função para formatar tamanho de arquivo
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export default function DocumentExplorer({
  moduleId,
  initialPath = '/',
  onFileSelect,
  onFileUpload,
  allowUpload = true,
  allowDelete = true,
  viewMode: initialViewMode = 'grid'
}: DocumentExplorerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const moduleColor = getModuleColor(moduleId);

  // Mock data - substituir por API real
  React.useEffect(() => {
    // Simular carregamento de arquivos
    const mockFiles: FileItem[] = [
      {
        id: '1',
        name: 'Documentos',
        type: 'folder',
        path: currentPath + '/Documentos',
        modified: new Date('2024-01-15')
      },
      {
        id: '2',
        name: 'Imagens',
        type: 'folder',
        path: currentPath + '/Imagens',
        modified: new Date('2024-01-14')
      },
      {
        id: '3',
        name: 'Relatório.pdf',
        type: 'file',
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        path: currentPath + '/Relatório.pdf',
        modified: new Date('2024-01-13')
      },
      {
        id: '4',
        name: 'Planilha.xlsx',
        type: 'file',
        extension: 'xlsx',
        size: 512000,
        path: currentPath + '/Planilha.xlsx',
        modified: new Date('2024-01-12')
      },
      {
        id: '5',
        name: 'Apresentação.pptx',
        type: 'file',
        extension: 'pptx',
        size: 2048000,
        path: currentPath + '/Apresentação.pptx',
        modified: new Date('2024-01-11')
      }
    ];
    setFiles(mockFiles);
  }, [currentPath]);

  // Drag and Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && onFileUpload) {
      onFileUpload(droppedFiles);
      
      // Adicionar arquivos à lista local (simulação)
      const newFiles: FileItem[] = droppedFiles.map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        name: file.name,
        type: 'file' as const,
        extension: file.name.split('.').pop(),
        mimeType: file.type,
        size: file.size,
        path: currentPath + '/' + file.name,
        modified: new Date()
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [currentPath, onFileUpload]);

  // File selection
  const handleFileClick = (file: FileItem, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      const newSelection = new Set(selectedFiles);
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id);
      } else {
        newSelection.add(file.id);
      }
      setSelectedFiles(newSelection);
    } else {
      // Single select
      setSelectedFiles(new Set([file.id]));
    }

    if (file.type === 'folder') {
      setCurrentPath(file.path);
    } else if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // File upload via button
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length > 0 && onFileUpload) {
      onFileUpload(uploadedFiles);
      
      // Adicionar arquivos à lista local (simulação)
      const newFiles: FileItem[] = uploadedFiles.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        name: file.name,
        type: 'file' as const,
        extension: file.name.split('.').pop(),
        mimeType: file.type,
        size: file.size,
        path: currentPath + '/' + file.name,
        modified: new Date()
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Delete selected files
  const handleDelete = () => {
    if (selectedFiles.size > 0) {
      setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
    }
  };

  // Sort files
  const sortedFiles = [...files].sort((a, b) => {
    // Folders sempre primeiro
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;

    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
      case 'date':
        comparison = (a.modified?.getTime() || 0) - (b.modified?.getTime() || 0);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Filter files by search
  const filteredFiles = sortedFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="toolbar border-b border-white/10">
        <div className="px-3 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Upload button */}
          {allowUpload && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors text-slate-300"
                style={{ color: moduleColor.primary }}
                title="Upload arquivos"
              >
                <Upload />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
            </>
          )}

          {/* New folder button */}
          <button
            className="p-2 hover:bg-gray-800 rounded transition-colors"
            style={{ color: moduleColor.primary }}
            title="Nova pasta"
          >
            <CreateNewFolder />
          </button>

          {/* Delete button */}
          {allowDelete && selectedFiles.size > 0 && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-gray-800 rounded transition-colors text-red-500"
              title="Excluir selecionados"
            >
              <Delete />
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-700 mx-2" />

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 hover:bg-gray-800 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-gray-800' : ''
            }`}
            style={{ color: viewMode === 'grid' ? moduleColor.primary : '#9CA3AF' }}
            title="Visualização em grade"
          >
            <GridView />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 hover:bg-gray-800 rounded transition-colors ${
              viewMode === 'list' ? 'bg-gray-800' : ''
            }`}
            style={{ color: viewMode === 'list' ? moduleColor.primary : '#9CA3AF' }}
            title="Visualização em lista"
          >
            <List />
          </button>

          {/* Sort button */}
          <button
            className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-400"
            title="Ordenar"
          >
            <Sort />
          </button>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar arquivos..."
              className="w-full pl-10 pr-4 py-1.5 bg-transparent border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-400 hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 transition-all"
            />
          </div>
        </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 text-sm">
        <button 
          className="text-slate-400 hover:text-slate-200 transition-colors"
          onClick={() => setCurrentPath('/')}
        >
          Root
        </button>
        {currentPath.split('/').filter(Boolean).map((part, index, arr) => (
          <React.Fragment key={index}>
            <span className="text-slate-600">/</span>
            <button 
              className="text-slate-400 hover:text-slate-200 transition-colors"
              onClick={() => {
                const newPath = '/' + arr.slice(0, index + 1).join('/');
                setCurrentPath(newPath);
              }}
            >
              {part}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* File area with drag and drop */}
      <div
        ref={dropZoneRef}
        className={`flex-1 overflow-auto p-4 transition-colors ${
          isDragging ? 'bg-purple-900/20 border-2 border-dashed border-purple-500' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Upload sx={{ fontSize: 64, color: moduleColor.primary }} />
              <p className="mt-4 text-lg text-slate-200">Solte os arquivos aqui</p>
              <p className="text-sm text-slate-400">Os arquivos serão enviados para {currentPath}</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                onClick={(e) => handleFileClick(file, e)}
                className={`flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-800 ${
                  selectedFiles.has(file.id) ? 'bg-gray-800 ring-2' : ''
                }`}
                style={{
                  ringColor: selectedFiles.has(file.id) ? moduleColor.primary : undefined
                }}
              >
                <div style={{ color: file.type === 'folder' ? moduleColor.primary : '#9CA3AF' }}>
                  {getFileIcon(file)}
                </div>
                <span className="mt-2 text-xs text-center text-white truncate w-full" title={file.name}>
                  {file.name}
                </span>
                {file.size && (
                  <span className="text-xs text-slate-400 mt-1">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-1">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                onClick={(e) => handleFileClick(file, e)}
                className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-800 ${
                  selectedFiles.has(file.id) ? 'bg-gray-800 ring-2' : ''
                }`}
                style={{
                  ringColor: selectedFiles.has(file.id) ? moduleColor.primary : undefined
                }}
              >
                <div style={{ color: file.type === 'folder' ? moduleColor.primary : '#9CA3AF' }}>
                  {React.cloneElement(getFileIcon(file), { sx: { fontSize: 24 } })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {file.modified?.toLocaleDateString()} • {formatFileSize(file.size)}
                  </p>
                </div>
                {file.size && (
                  <span className="text-sm text-slate-400">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredFiles.length === 0 && !isDragging && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Folder sx={{ fontSize: 64, color: '#4B5563' }} />
              <p className="mt-4 text-slate-400">Nenhum arquivo encontrado</p>
              {allowUpload && (
                <p className="text-sm text-slate-500 mt-2">
                  Arraste arquivos aqui ou clique no botão de upload
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span>{filteredFiles.length} itens</span>
        {selectedFiles.size > 0 && (
          <span>{selectedFiles.size} selecionado(s)</span>
        )}
      </div>
    </div>
  );
}