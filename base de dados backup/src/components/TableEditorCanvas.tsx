/* @ts-nocheck */
import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import * as debounceModule from 'lodash.debounce';
const debounce = debounceModule.default || debounceModule;
import { toast } from 'sonner';
import { ColumnManager, type ColumnIdentifier } from '@/lib/table-editor/column-manager';
import VirtualizedTableBody from '@/components/TableEditor/VirtualizedTableBody';
import { CellRenderer } from '@/components/TableEditor/CellRenderer';
import PDFCellEditor from '@/components/TableEditor/PDFCellEditor';
import PDFViewer from '@/components/TableEditor/PDFViewer';
import { tablePersistence, createInitialTableState, type TableState } from '@/lib/table-state-persistence';

// Import extracted modules - Phase 1 Safe Modularization
import type { 
  TableColumn, 
  SchemaInfo, 
  TableInfo, 
  FileAttachment, 
  CellContent, 
  OpenTable, 
  TableEditorCanvasProps 
} from './table-editor/modules/constants/types';
import { 
  KNOWN_ENUM_VALUES, 
  CACHE_DURATION, 
  ICON_SIZE_CLASS, 
  FILE_EXTENSIONS 
} from './table-editor/modules/constants/constants';
import { 
  SCHEMA_ICON_MAP, 
  DEFAULT_SCHEMA_ICON, 
  DATA_TYPE_ICON_MAP, 
  DEFAULT_DATA_TYPE_ICON 
} from './table-editor/modules/constants/mappings';
import {
  hexToRgba,
  normalizeEmptyValue,
  getValidDefaultValue,
  getSchemaIcon,
  getTypeIcon,
  ensureValidFileId,
  getFileIcon,
  getFileIconStyled
} from './table-editor/modules/utils/helpers';
import { EXCEL_FORMULAS } from './table-editor/modules/config/formulas';
import { ColumnFilterControl, type ColumnFilter } from '@/components/TableEditor/ColumnFilterControl';
import {
  Database,
  Table,
  Grid,
  Save,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Minus,
  Undo,
  Redo,
  Palette,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Settings,
  Hash,
  Type,
  Calendar,
  Circle,
  DollarSign,
  FileText,
  Key,
  Link as LinkIcon,
  Calculator,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Layers,
  X,
  Edit2,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Paintbrush,
  Eye,
  EyeOff,
  Columns,
  Image as ImageIcon,
  Film,
  File,
  Play,
  FileImage,
  FileVideo,
  FileEdit,
  FilePlus,
  Info,
  FileSpreadsheet,
  FileType,
  Music,
  Archive,
  AlertCircle,
  Paperclip,
  FunctionSquare,
  Plus
} from 'lucide-react';

// Import Lucide React icons for modules
import {
  Package as EstoqueIcon,
  Wrench as MontagemIcon,
  TrendingUp as VendasIcon,
  FileText as FaturamentoIcon,
  Truck as ExpedicaoIcon,
  Users as RHIcon,
  Briefcase as AdministrativoIcon,
  Headphones as SuporteIcon,
  MessageCircle as ComunicacaoIcon,
  Scale as JuridicoIcon,
  Building2 as FinanceiroIcon,
  Receipt as TributarioIcon,
  Megaphone as MarketingIcon,
  Package2 as ProdutosIcon,
  Store as LojasIcon,
  UserPlus as CadastrosIcon,
  Brain as IAIcon,
  Database as DatabaseIcon,
  Settings as SistemaIcon
} from 'lucide-react';
import { supabase, useSchema } from '@/lib/supabase';
import { useTableSelection } from '@/hooks/useTableSelection';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useTableConstraints, getConstraintIcon, getConstraintTooltip, validateColumnValue } from '@/hooks/useTableConstraints';
import { CellFormat, Selection, TableRelationship, OpenTable as OpenTableType } from '@/lib/table-editor/types';
import { RelationshipCanvas } from '@/components/RelationshipCanvas';
import { uploadFile, deleteFile, initializeStorage, StoredFile } from '@/lib/supabase-storage';
import { FileViewer } from '@/components/FileViewer';
import { getModulePrimaryColor } from '@/lib/module-colors';







interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  is_primary?: boolean;
  is_foreign?: boolean;
  // Novos campos para tipos de mídia
  media_type?: 'image' | 'pdf' | 'video' | 'mixed' | null;
  allow_multiple?: boolean;
}

interface SchemaInfo {
  schema_name: string;
  table_count: number;
}

interface TableInfo {
  schema_name: string;
  table_name: string;
  column_count: number;
  row_count: number;
}


 // File attachment type
type FileAttachment = StoredFile & {
  uploading?: boolean;
  type?: string;
};


// Cell content can be text or files
interface CellContent {
  text?: string;
  files?: FileAttachment[];
}

// Using the OpenTable interface from types.ts, extending it with additional local properties
interface OpenTable extends Omit<OpenTableType, 'formats' | 'selection' | 'hasUnsavedChanges'> {
  formats?: Map<string, CellFormat>;
  selection?: Selection;
  hasUnsavedChanges?: boolean;
  originalData?: any[]; // Store original data for comparison
  cellContents?: Map<string, CellContent>; // Store rich content for cells
  columnWidths?: Map<string, number>; // Store custom column widths
  rowHeight?: number; // Store custom row height for all rows
  columnOrder?: string[]; // Ordem das colunas do banco
  columnMap?: Map<string, number>; // Mapa nome->índice
  constraints?: any; // Constraints da tabela (NOT NULL, CHECK, etc)
  metadata?: any; // Metadados de type hints para formatação
}





// Removed complex file upload components - using simple inline solution

// Removed duplicate complex functions and components

interface TableEditorCanvasProps {
  hideSchemaSelector?: boolean;
  fixedSchema?: string;
}

export default function TableEditorCanvas({ hideSchemaSelector = false, fixedSchema }: TableEditorCanvasProps = {}) {
  // Cache para evitar rate limiting
  const dataCache = useRef<{
    [key: string]: {
      data: any;
      timestamp: number;
    }
  }>({});
  
  
  // Função centralizada para obter todas as colunas (dados + vazias)
  const getTableColumns = useCallback((table: OpenTable) => {
    const dataColumns = table.columns || [];
    const emptyColumns = Array(50).fill(null).map((_, i) => ({ 
      column_name: `_empty_col_${i}`, 
      data_type: 'text',
      is_empty: true 
    }));
    
    
    return [...dataColumns, ...emptyColumns];
  }, []);
  
  // State
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>(fixedSchema || '');
  const [openTables, setOpenTables] = useState<OpenTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [showSchemaDropdown, setShowSchemaDropdown] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  // Função para calcular largura inicial da coluna baseada no tipo
  const getInitialColumnWidth = (dataType: string): number => {
    // Larguras baseadas no tipo de dados
    const typeWidths: Record<string, number> = {
      'uuid': 300,
      'text': 200,
      'varchar': 200,
      'character varying': 200,
      'integer': 100,
      'bigint': 120,
      'smallint': 80,
      'numeric': 120,
      'real': 100,
      'double precision': 120,
      'boolean': 80,
      'date': 120,
      'timestamp': 180,
      'timestamp with time zone': 200,
      'time': 100,
      'json': 250,
      'jsonb': 250,
    };
    
    return typeWidths[dataType?.toLowerCase()] || 150; // Default 150px
  };
  
  // Função para buscar metadados de tabelas (type hints)
  const getColumnMetadata = async (schema: string, table: string) => {
    try {
      const response = await fetch(`/api/postgres/table-metadata?schema=${schema}&table=${table}`);
      if (response.ok) {
        const metadata = await response.json();
        // Converter array em objeto mapeado por nome da coluna
        const metadataMap: any = {};
        metadata.forEach((col: any) => {
          metadataMap[col.column_name] = col;
        });
        return metadataMap;
      }
      return null;
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return null;
    }
  };
  
  const updateColumnMetadata = async (metadata: any) => {
    // Implementar se necessário
    console.log('updateColumnMetadata called with:', metadata);
  };
  
  // Estado de filtros por coluna (para cada tabela)
  const [columnFilters, setColumnFilters] = useState<Map<string, Map<string, ColumnFilter>>>(new Map());
  
  // Estado para mostrar dados puros do Supabase (raw data mode)
  const [rawDataMode, setRawDataMode] = useState<Map<string, boolean>>(new Map());
  
  // Funções para gerenciar filtros
  const updateColumnFilter = (tableId: string, columnName: string, filter: ColumnFilter) => {
    console.log('🎯 [UPDATE FILTER] Called:', { tableId, columnName, filter });
    
    setColumnFilters(prev => {
      const newFilters = new Map(prev);
      const tableFilters = newFilters.get(tableId) || new Map();
      
      if (!filter.formatting && !filter.dataFilter && !filter.sorting && !filter.validation) {
        // Remover filtro se estiver vazio
        console.log('🗑️ [UPDATE FILTER] Removing empty filter for:', columnName);
        tableFilters.delete(columnName);
      } else {
        console.log('✅ [UPDATE FILTER] Setting filter for:', columnName, filter);
        tableFilters.set(columnName, filter);
      }
      
      newFilters.set(tableId, tableFilters);
      console.log('📊 [UPDATE FILTER] Total filters for table:', tableFilters.size);
      return newFilters;
    });
  };
  
  const getColumnFilter = (tableId: string, columnName: string): ColumnFilter | undefined => {
    return columnFilters.get(tableId)?.get(columnName);
  };

  const clearAllFilters = (tableId: string) => {
    setColumnFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.delete(tableId);
      return newFilters;
    });
  };
  
  // Função para alternar entre dados formatados e dados puros do Supabase
  const toggleRawDataMode = (tableId: string) => {
    setRawDataMode(prev => {
      const newMode = new Map(prev);
      const currentMode = newMode.get(tableId) || false;
      newMode.set(tableId, !currentMode);
      return newMode;
    });
  };
  
  // Canvas controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Advanced features state
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [currentFormat, setCurrentFormat] = useState<Partial<CellFormat>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'background' | 'text' | null>(null);
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [showRelationshipBuilder, setShowRelationshipBuilder] = useState(false);
  const [showRelationships, setShowRelationships] = useState(true);
  const [isSchemaView, setIsSchemaView] = useState(false);
  
  // Border picker state
  const [showBorderPicker, setShowBorderPicker] = useState(false);
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState('#3B82F6');
  const [borderSides, setBorderSides] = useState({
    top: true,
    right: true,
    bottom: true,
    left: true
  });
  
  // Column widths are now fixed, no resizing allowed
  
  // Hidden columns state (Map of tableId -> Set of column names)
  const [hiddenColumns, setHiddenColumns] = useState<Map<string, Set<string>>>(new Map());
  const [showHiddenColumnsMenu, setShowHiddenColumnsMenu] = useState<{ tableId: string, x: number, y: number } | null>(null);
  
  // File upload and viewer state
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [activeFileCell, setActiveFileCell] = useState<{ tableId: string; row: number; col: string } | null>(null);
  const [viewingFile, setViewingFile] = useState<FileAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // PDF viewer state
  const [viewingPDF, setViewingPDF] = useState<{ url: string; fileName: string } | null>(null);
  
  // PDF viewer handler
  const handlePDFClick = (url: string) => {
    const fileName = url.split('/').pop()?.replace('.pdf', '') || 'documento';
    setViewingPDF({ url, fileName });
  };
  
  // =====================================================
  // FUNÇÕES DE PERSISTÊNCIA DE ESTADO
  // =====================================================
  
  // Atualizar estado de uma tabela
  const updateTableState = (tableId: string, updates: Partial<any>) => {
    setOpenTables(prev => prev.map(table => 
      table.id === tableId ? { ...table, ...updates } : table
    ));
  };
  
  // Atualizar filtros de colunas
  const updateTableColumnFilters = (tableId: string, filters: Map<string, ColumnFilter>) => {
    setColumnFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.set(tableId, filters);
      return newFilters;
    });
  };
  
  // Atualizar modo raw data
  const updateTableRawDataMode = (tableId: string, rawMode: boolean) => {
    setRawDataMode(prev => {
      const newMode = new Map(prev);
      newMode.set(tableId, rawMode);
      return newMode;
    });
  };
  
  
  // Formula mode states
  const [isFormulaMode, setIsFormulaMode] = useState(false);
  const [formulaText, setFormulaText] = useState('');
  const [formulaSelectedCells, setFormulaSelectedCells] = useState<string[]>([]);
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  const [formulaStep, setFormulaStep] = useState(0);
  const [formulaWindowPos, setFormulaWindowPos] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 450 : 100, 
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 300 : 100
  });
  const [isDraggingFormulaWindow, setIsDraggingFormulaWindow] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFormulaWindowMaximized, setIsFormulaWindowMaximized] = useState(false);

  const [formulaTargetCell, setFormulaTargetCell] = useState<{ tableId: string; row: number; col: string } | null>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  
  // Track last clicked cell for file uploads
  const [lastClickedCell, setLastClickedCell] = useState<{ tableId: string; row: number; col: string } | null>(null);
  
  // Undo/Redo hook
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    addAction,
    createCellEditAction,
    createFormatAction
  } = useUndoRedo();
  
  // Selection hooks for each table
  const [tableSelections, setTableSelections] = useState<Map<string, ReturnType<typeof useTableSelection>>>(new Map());
  
  // Clipboard state
  const [clipboard, setClipboard] = useState<{ data: any[], format: Map<string, CellFormat> } | null>(null);
  
  // Save status state
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | 'saving' } | null>(null);
  const [saveStatusTimeout, setSaveStatusTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Column and row resizing states
  const [isResizingColumn, setIsResizingColumn] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<{ tableId: string; columnName: string; startX: number; startWidth: number } | null>(null);
  const [isResizingRow, setIsResizingRow] = useState(false);
  const [resizingRow, setResizingRow] = useState<{ tableId: string; startY: number; startHeight: number } | null>(null);
  
  // Column editing states
  const [editingColumnName, setEditingColumnName] = useState<{ tableId: string; columnName: string } | null>(null);
  const [editingColumnType, setEditingColumnType] = useState<{ tableId: string; columnName: string } | null>(null);
  
  // Add column dialog state
  const [showAddColumnDialog, setShowAddColumnDialog] = useState<{ tableId: string } | null>(null);
  const [newColumnConfig, setNewColumnConfig] = useState({
    name: '',
    type: 'text',
    notNull: false,
    unique: false,
    isPrimary: false,
    defaultValue: ''
  });
  
  // Text formatting states  
  const [textAlignment, setTextAlignment] = useState<Map<string, 'left' | 'center' | 'right'>>(new Map());
  const [textStyles, setTextStyles] = useState<Map<string, {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontFamily?: string;
  }>>(new Map());
  
  // Selection states for formatting
  const [selectedTable, setSelectedTable] = useState<OpenTable | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [lastSelectedColumn, setLastSelectedColumn] = useState<string | null>(null);
  
  // Column selection dragging
  const [isDraggingColumnSelection, setIsDraggingColumnSelection] = useState(false);
  const [columnSelectionStart, setColumnSelectionStart] = useState<string | null>(null);
  
  // Cell/Row/Column selection state (Excel-like)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDraggingCellSelection, setIsDraggingCellSelection] = useState(false);
  const [cellSelectionStart, setCellSelectionStart] = useState<{tableId: string, row: number, col: string} | null>(null);
  const [cellSelectionEnd, setCellSelectionEnd] = useState<{tableId: string, row: number, col: string} | null>(null);
  
  // Column edit menu dropdown
  const [columnEditMenu, setColumnEditMenu] = useState<{
    x: number;
    y: number;
    tableId: string;
    columns: string[];
  } | null>(null);
  
  // Context menu for cell formatting
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tableId: string;
    rowIndex: number;
    columnName: string;
  } | null>(null);
  
  // Cell formatting styles (por célula individual)
  const [cellFormatting, setCellFormatting] = useState<Map<string, {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    fontFamily?: string;
    color?: string;
  }>>(new Map());
  
  // Contador simples para forçar re-render quando formatação muda
  const [formatUpdateCounter, setFormatUpdateCounter] = useState(0);
  
  // Modo View vs Edit para melhor performance
  const [editMode, setEditMode] = useState<'view' | 'edit'>('edit');
  
  // Relationship creation via drag
  const [isDraggingRelationship, setIsDraggingRelationship] = useState(false);
  const [dragRelationship, setDragRelationship] = useState<{
    fromTable: string;
    fromColumn: string;
    fromPos: { x: number; y: number };
    currentPos: { x: number; y: number };
  } | null>(null);
  const [showRelTypeMenu, setShowRelTypeMenu] = useState(false);
  const [relTypeMenuPos, setRelTypeMenuPos] = useState({ x: 0, y: 0 });
  const [pendingRelationship, setPendingRelationship] = useState<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  } | null>(null);
  
  // Drag state
  const dragState = useRef<{
    isDragging: boolean;
    tableId: string | null;
    offset: { x: number; y: number };
  }>({
    isDragging: false,
    tableId: null,
    offset: { x: 0, y: 0 }
  });

  // Resize state
  const resizeState = useRef<{
    isResizing: boolean;
    tableId: string | null;
    edge: string | null;
    startPos: { x: number; y: number };
    startSize: { width: number; height: number };
  }>({
    isResizing: false,
    tableId: null,
    edge: null,
    startPos: { x: 0, y: 0 },
    startSize: { width: 0, height: 0 }
  });

  // Pan state
  const panState = useRef<{
    isPanning: boolean;
    lastMousePos: { x: number; y: number };
  }>({
    isPanning: false,
    lastMousePos: { x: 0, y: 0 }
  });


  // Load schemas and relationships
  useEffect(() => {
    loadSchemas();
  }, []);

  // Load relationships when tables change - DISABLED (table doesn't exist)
  useEffect(() => {
    // Temporarily disabled - relationship_metadata table not set up
    // if (openTables.length > 0) {
    //   void loadRelationshipsFromDB();
    // }
  }, [openTables.filter(t => t && t.id).map(t => t.id).join(',')]); // Re-run when table IDs change

  // Load tables when schema changes
  useEffect(() => {
    if (selectedSchema) {
      loadTables(selectedSchema);
    }
  }, [selectedSchema]);

  // Initialize Supabase Storage on mount
  useEffect(() => {
    initializeStorage().catch(() => {});
  }, []);

  // Keyboard shortcuts for pan and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }
      if (e.altKey && !e.repeat) {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
      if (!e.altKey) {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Mouse wheel zoom with Alt key
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.altKey && containerRef.current && containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom * scaleFactor, 0.1), 5);
        
        // Get mouse position relative to container
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate new pan to zoom towards mouse position
        const dx = (x - pan.x) * (1 - scaleFactor);
        const dy = (y - pan.y) * (1 - scaleFactor);
        
        setZoom(newZoom);
        setPan(prev => ({
          x: prev.x + dx / newZoom,
          y: prev.y + dy / newZoom
        }));
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, pan]);

  const loadSchemas = async () => {
    try {
      // Force cache clear with timestamp
      const response = await fetch(`/api/postgres/schemas?_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const schemaList = data.map((s: any) => ({
          schema_name: s.schema_name,
          table_count: parseInt(s.table_count) || 0
        }));
        setSchemas(schemaList);
      }
    } catch (error) {
      setSchemas([
        { schema_name: 'public', table_count: 0 },
        { schema_name: 'plataforma_core', table_count: 0 }
      ]);
    }
  };
  

  const loadTables = async (schema: string) => {
    console.log('loadTables called with schema:', schema);
    try {
      setLoading(true);
      const response = await fetch(`/api/postgres/tables?schemas=${schema}`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Tables data received:', data);
        const tableList = data.map((t: any) => ({
          schema_name: t.schema || schema,
          table_name: t.name || t.table_name,
          column_count: 0,
          row_count: parseInt(t.live_rows_estimate) || 0
        }));
        console.log('Setting tables:', tableList);
        setTables(tableList);
      } else {
        console.error('Failed to load tables:', response.status);
        setTables([]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process file attachments from JSON data
  const processFileAttachments = (data: any[], columns: TableColumn[]): Map<string, CellContent> => {
    const cellContents = new Map<string, CellContent>();
    
    
    data.forEach((row: any, rowIndex: number) => {
      columns.forEach((col: TableColumn) => {
        const cellValue = row && col && col.column_name ? row[col.column_name] : undefined;
        
        // Check if this cell contains JSON file data
        if (cellValue && typeof cellValue === 'string' && (cellValue.startsWith('[') || (cellValue.length > 1 && cellValue[0] === '"' && cellValue[1] === '['))) {
          try {
            // Tratar caso de duplo escape (string JSON dentro de string)
            let fileData;
            if (cellValue.length > 1 && cellValue[0] === '"' && cellValue[1] === '[') {
              // Se começa com "[ é porque foi feito duplo stringify
              const unescaped = JSON.parse(cellValue); // Primeiro parse remove o escape
              fileData = JSON.parse(unescaped); // Segundo parse pega o array
            } else {
              fileData = JSON.parse(cellValue);
            }
            
            if (Array.isArray(fileData) && fileData.length > 0) {
              // This is file data, convert to FileAttachment objects
              const files: FileAttachment[] = [];
              
              for (let index = 0; index < fileData.length; index++) {
                const f = fileData[index];
                
                // Skip invalid entries
                if (!f || typeof f !== 'object' || !f.url) {
                  continue;
                }
                
                // Use helper function for guaranteed unique ID
                const fileId = ensureValidFileId(f, index);
                
                const fileAttachment: FileAttachment = {
                  id: fileId,
                  name: f.name || (f.id && f.id.includes('_') ? f.id.substring(f.id.indexOf('_') + 1) : 'unnamed_file'),
                  url: f.url || '',
                  mimeType: f.type || f.mimeType || 'application/octet-stream',
                  type: f.type || f.mimeType || 'application/octet-stream',
                  size: f.size || 0,
                  uploadedAt: f.uploadedAt || new Date().toISOString(),
                  publicUrl: f.publicUrl || f.url || '',
                  path: f.path || '',
                  thumbnailUrl: f.thumbnailUrl || null
                };
                
                // Only add valid files
                if (fileAttachment.id && fileAttachment.url) {
                  files.push(fileAttachment);
                } else {
                }
              }
              
              if (files.length > 0) {
                const cellKey = `${rowIndex}-${col.column_name}`;
                cellContents.set(cellKey, { files });
              }
              
              // IMPORTANT: Keep JSON in field for persistence - don't clear!
            }
          } catch (e) {
            // Not JSON or invalid JSON, keep as is
          }
        }
      });
    });
    
    
    return cellContents;
  };

  const loadTableData = async (schema: string, table: string): Promise<{ columns: TableColumn[], data: any[], cellContents?: Map<string, CellContent>, columnOrder?: string[] } | null> => {
    console.log('loadTableData called for:', schema, table);
    try {
      const cacheKey = `${schema}.${table}`;
      const cached = dataCache.current[cacheKey];
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached data for:', cacheKey);
        return cached.data;
      }
      
      // Get columns
      console.log('Fetching columns for:', table, 'in schema:', schema);
      const schemaResponse = await fetch(`/api/postgres/tables/${table}/schema?schema=${schema}`);
      console.log('Columns response status:', schemaResponse.status);
      if (!schemaResponse.ok) {
        console.error('Failed to load columns:', schemaResponse.status, schemaResponse.statusText);
        throw new Error('Failed to load columns');
      }
      const columnsData = await schemaResponse.json();
      console.log('Columns loaded:', columnsData);
      
      // Get data with columnOrder
      console.log('Fetching data for:', table);
      const dataResponse = await fetch(`/api/postgres/tables/${table}/data?schema=${schema}&limit=100`);
      console.log('Data response status:', dataResponse.status);
      if (!dataResponse.ok) {
        console.error('Failed to load data:', dataResponse.status, dataResponse.statusText);
        throw new Error('Failed to load data');
      }
      const tableData = await dataResponse.json();
      console.log('Table data loaded:', tableData);
      
      const data = tableData.rows || [];
      const columnOrder = tableData.columnOrder || columnsData.map((c: TableColumn) => c.column_name);
      
      
      // Process file attachments
      const cellContents = processFileAttachments(data, columnsData);
      
      const result = {
        columns: columnsData,
        data: data,
        cellContents: cellContents.size > 0 ? cellContents : undefined,
        columnOrder: columnOrder  // Adicionar ordem das colunas
      };
      
      
      // Cache the data
      dataCache.current[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.error('Error in loadTableData:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error details:', {
        schema: schema,
        table: table,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      // Log do erro no console
      console.error(`Erro ao carregar tabela ${schema}.${table}:`, errorMessage);
      return null;
    }
  };

  const openTable = async (tableInfo: TableInfo) => {
    console.log('openTable called with:', tableInfo);
    try {
      // Check if table is already open
      const existingTable = openTables.find(t => t.schema === tableInfo.schema_name && t.name === tableInfo.table_name);
      if (existingTable) {
        console.log('Table already open, focusing on it');
        // Focus on existing table
        setOpenTables(prev => prev.map(t => 
          t.id === existingTable.id 
            ? { ...t, isMinimized: false }
            : t
        ));
        return;
      }

      setLoading(true);
      console.log('Loading table data for:', tableInfo.schema_name, tableInfo.table_name);
      const tableData = await loadTableData(tableInfo.schema_name, tableInfo.table_name);
      console.log('Table data loaded:', tableData);
      
      if (!tableData) {
        console.error('No table data returned! Schema:', tableInfo.schema_name, 'Table:', tableInfo.table_name);
        alert(`Erro ao carregar tabela ${tableInfo.table_name}. Verifique o console para mais detalhes.`);
        setLoading(false);
        return;
      }
      
      // Buscar metadados da tabela para type hints
      const metadata = await getColumnMetadata(tableInfo.schema_name, tableInfo.table_name);
      
      setLoading(false);
      
      // FALLBACK: If no cellContents but data has JSON, reprocess it
      let finalCellContents = tableData.cellContents;
      if (!finalCellContents || finalCellContents.size === 0) {
        finalCellContents = processFileAttachments(tableData.data, tableData.columns);
      }
      
      // Criar mapa de colunas
      const columnMap = new Map<string, number>();
      if (tableData.columnOrder) {
        tableData.columnOrder.forEach((name: string, idx: number) => {
          columnMap.set(name, idx);
        });
      }
      // Tentar carregar estado persistido
      const savedState = tablePersistence.loadTableState(tableInfo.schema_name, tableInfo.table_name);
      console.log('💾 Estado salvo encontrado:', !!savedState);
      
      const newTable: OpenTable = {
        id: `${tableInfo.schema_name}.${tableInfo.table_name}`,
        schema: tableInfo.schema_name,
        name: tableInfo.table_name,
        columns: tableData.columns,
        data: tableData.data,
        cellContents: finalCellContents,
        columnOrder: tableData.columnOrder,
        columnMap: columnMap,
        metadata: metadata,
        // Usar posição salva ou padrão
        position: savedState?.position || {
          x: 50 + openTables.length * 50,
          y: 50 + openTables.length * 50
        },
        // Usar tamanho salvo ou padrão
        size: savedState?.size || { width: 800, height: 400 },
        isMinimized: false,
        isMaximized: savedState?.isMaximized || false,
        isEditing: false,
        isResizing: false,
        zIndex: nextZIndex,
        // Restaurar larguras das colunas se existir
        columnWidths: savedState?.columnWidths ? new Map(Object.entries(savedState.columnWidths)) : new Map()
      };
      setOpenTables(prev => [...prev, newTable]);
      setNextZIndex(prev => prev + 1);
      console.log('Table opened successfully:', newTable.id);
    } catch (error) {
    console.error('Error in openTable:', error);
    alert('Erro ao abrir tabela. Verifique o console para detalhes.');
    setLoading(false);
  }
  };

  const closeTable = (tableId: string) => {
    // Salvar estado antes de fechar
    const tableToClose = openTables.find(t => t.id === tableId);
    if (tableToClose) {
      console.log('💾 Salvando estado da tabela antes de fechar:', tableToClose.name);
      saveTableStatePersistence(tableToClose);
    }
    
    setOpenTables(prev => prev.filter(t => t.id !== tableId));
  };

  const minimizeTable = (tableId: string) => {
    setOpenTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, isMinimized: !t.isMinimized } : t
    ));
  };

  const maximizeTable = (tableId: string) => {
    setOpenTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, isMaximized: !t.isMaximized } : t
    ));
  };

  const bringToFront = (tableId: string) => {
    const newZ = nextZIndex;
    setOpenTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, zIndex: newZ } : t
    ));
    setNextZIndex(prev => prev + 1);
  };

  const sendToBack = (tableId: string) => {
    setOpenTables(prev => {
      const minZ = Math.min(...prev.map(t => t.zIndex));
      return prev.map(t =>
        t.id === tableId ? { ...t, zIndex: minZ - 1 } : t
      );
    });
  };

  // Mouse handlers for pan and drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed) {
      e.preventDefault();
      panState.current.isPanning = true;
      panState.current.lastMousePos = { x: e.clientX, y: e.clientY };
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
    } else if (isSelectingCells) {
      // Clear cell selection if clicking outside of tables
      e.preventDefault();
      setIsSelectingCells(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panState.current.isPanning) {
      const deltaX = e.clientX - panState.current.lastMousePos.x;
      const deltaY = e.clientY - panState.current.lastMousePos.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      panState.current.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (resizeState.current.isResizing && resizeState.current.tableId) {
      const deltaX = e.clientX - resizeState.current.startPos.x;
      const deltaY = e.clientY - resizeState.current.startPos.y;
      const edge = resizeState.current.edge;
      
      setOpenTables(prev => prev.map(table => {
        if (table.id === resizeState.current.tableId) {
          let newWidth = resizeState.current.startSize.width;
          let newHeight = resizeState.current.startSize.height;
          let newX = table.position.x;
          let newY = table.position.y;

          if (edge?.includes('right')) {
            newWidth = Math.max(400, resizeState.current.startSize.width + deltaX / zoom);
          }
          if (edge?.includes('left')) {
            newWidth = Math.max(400, resizeState.current.startSize.width - deltaX / zoom);
            newX = table.position.x + deltaX / zoom;
          }
          if (edge?.includes('bottom')) {
            newHeight = Math.max(200, resizeState.current.startSize.height + deltaY / zoom);
          }
          if (edge?.includes('top')) {
            newHeight = Math.max(200, resizeState.current.startSize.height - deltaY / zoom);
            newY = table.position.y + deltaY / zoom;
          }

          return {
            ...table,
            position: { x: newX, y: newY },
            size: { width: newWidth, height: newHeight }
          };
        }
        return table;
      }));
    } else if (dragState.current.isDragging && dragState.current.tableId) {
      const scale = zoom;
      const deltaX = (e.clientX - dragState.current.offset.x) / scale - pan.x;
      const deltaY = (e.clientY - dragState.current.offset.y) / scale - pan.y;
      
      setOpenTables(prev => prev.map(table =>
        table.id === dragState.current.tableId
          ? { ...table, position: { x: deltaX, y: deltaY } }
          : table
      ));
    }
  };

  const handleMouseUp = () => {
    panState.current.isPanning = false;
    dragState.current.isDragging = false;
    dragState.current.tableId = null;
    resizeState.current.isResizing = false;
    resizeState.current.tableId = null;
    resizeState.current.edge = null;
    
    // Stop cell selection
    if (isSelectingCells) {
      setIsSelectingCells(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    
    if (containerRef.current && isSpacePressed) {
      containerRef.current.style.cursor = 'grab';
    } else if (containerRef.current) {
      containerRef.current.style.cursor = 'default';
    }
  };


  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    if (!isSpacePressed) {
      e.stopPropagation();
      
      // Trazer para frente ao clicar
      bringToFront(tableId);
      
      dragState.current.isDragging = true;
      dragState.current.tableId = tableId;
      dragState.current.offset = { x: e.clientX, y: e.clientY };
      
      const table = openTables.find(t => t.id === tableId);
      if (table) {
        dragState.current.offset.x -= table.position.x * zoom + pan.x * zoom;
        dragState.current.offset.y -= table.position.y * zoom + pan.y * zoom;
      }
    }
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, tableId: string, edge: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const table = openTables.find(t => t.id === tableId);
    if (table) {
      resizeState.current.isResizing = true;
      resizeState.current.tableId = tableId;
      resizeState.current.edge = edge;
      resizeState.current.startPos = { x: e.clientX, y: e.clientY };
      resizeState.current.startSize = { ...table.size };
    }
  };

  // Get cursor for resize edge
  const getResizeCursor = (edge: string) => {
    if (edge === 'top' || edge === 'bottom') return 'ns-resize';
    if (edge === 'left' || edge === 'right') return 'ew-resize';
    if (edge === 'top-left' || edge === 'bottom-right') return 'nwse-resize';
    if (edge === 'top-right' || edge === 'bottom-left') return 'nesw-resize';
    return 'default';
  };

  // Cell selection state for drag selection
  const [isSelectingCells, setIsSelectingCells] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ tableId: string; row: number; col: string } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: string } | null>(null);

  // Handle cell mouse down (start selection)
  const handleCellMouseDown = (tableId: string, row: number, col: string, e: React.MouseEvent) => {
    // Não prevenir default para permitir duplo clique
    // e.preventDefault(); // REMOVIDO para permitir duplo clique
    setActiveTableId(tableId);
    
    // Focar no container da tabela para receber eventos de teclado
    const tableContainer = document.querySelector(`[data-table-id="${tableId}"]`);
    if (tableContainer && tableContainer instanceof HTMLElement) {
      tableContainer.focus();
    }
    
    // Save last clicked cell for file uploads
    setLastClickedCell({ tableId, row, col });
    
    // Start drag selection
    setIsSelectingCells(true);
    setSelectionStart({ tableId, row, col });
    setSelectionEnd({ row, col });
    
    // Update table with initial selection (SEM entrar em modo de edição)
    setOpenTables(prev => prev.map(t =>
      t.id === tableId
        ? { 
            ...t, 
            // REMOVIDO: editingCell: { row, col }, // Não entrar em edição automaticamente
            selection: {
              type: 'cells',
              tableId,
              cells: new Set([`${row}-${col}`]),
              startCell: { row, col },
              endCell: { row, col }
            }
          }
        : t
    ));
    
    // Limpar seleção de células e adicionar a célula clicada
    setSelectedCells(new Set([`${tableId}_${row}_${col}`]));
    setCellSelectionStart({ tableId, row, col });
  };

  // Handle cell mouse enter (during selection)
  const handleCellMouseEnter = (tableId: string, row: number, col: string) => {
    if (!isSelectingCells || !selectionStart || selectionStart.tableId !== tableId) return;
    
    setSelectionEnd({ row, col });
    
    // Update selection range
    const table = openTables.find(t => t.id === tableId);
    if (!table) return;
    
    const startRow = Math.min(selectionStart.row, row);
    const endRow = Math.max(selectionStart.row, row);
    const startColIndex = (table.columns || []).findIndex(c => c.column_name === selectionStart.col);
    const endColIndex = (table.columns || []).findIndex(c => c.column_name === col);
    const startCol = Math.min(startColIndex, endColIndex);
    const endCol = Math.max(startColIndex, endColIndex);
    
    // Build selection set
    const cells = new Set<string>();
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (table.columns[c]) {
          cells.add(`${r}-${table.columns[c].column_name}`);
        }
      }
    }
    
    setOpenTables(prev => prev.map(t =>
      t.id === tableId
        ? { 
            ...t,
            selection: {
              type: 'cells',
              tableId,
              cells,
              startCell: { row: selectionStart.row, col: selectionStart.col },
              endCell: { row, col }
            }
          }
        : t
    ));
  };

  // Handle cell mouse up (end selection)
  const handleCellMouseUp = (tableId: string, row: number, col: string) => {
    if (!isSelectingCells) return;
    
    // REMOVIDO: Não entrar em edição automaticamente ao clicar
    // Agora só entra em edição com duplo clique, F2 ou digitando
    
    setIsSelectingCells(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Handle keyboard navigation for Excel-like experience
  const handleKeyboardNavigation = (e: React.KeyboardEvent | KeyboardEvent, tableId: string, currentRow: number, currentCol: string) => {
    console.log('🔍 Navigation triggered:', e.key, 'Row:', currentRow, 'Col:', currentCol);
    const table = openTables.find(t => t.id === tableId);
    if (!table) {
      console.log('❌ Table not found:', tableId);
      return;
    }
    
    const columns = getVisibleColumns(table);
    const currentColIndex = columns.findIndex(c => c.column_name === currentCol);
    const maxRow = table.data?.length || 0;
    
    let newRow = currentRow;
    let newColIndex = currentColIndex;
    let handled = false;
    
    switch(e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentRow > 0) {
          newRow = currentRow - 1;
          handled = true;
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (currentRow < maxRow - 1) {
          newRow = currentRow + 1;
          handled = true;
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (currentColIndex > 0) {
          newColIndex = currentColIndex - 1;
          handled = true;
        } else if (currentRow > 0) {
          // Ir para última coluna da linha anterior
          newRow = currentRow - 1;
          newColIndex = columns.length - 1;
          handled = true;
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        if (currentColIndex < columns.length - 1) {
          newColIndex = currentColIndex + 1;
          handled = true;
        } else if (currentRow < maxRow - 1) {
          // Ir para primeira coluna da próxima linha
          newRow = currentRow + 1;
          newColIndex = 0;
          handled = true;
        }
        break;
        
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: move left
          if (currentColIndex > 0) {
            newColIndex = currentColIndex - 1;
          } else if (currentRow > 0) {
            // Move to end of previous row
            newRow = currentRow - 1;
            newColIndex = columns.length - 1;
          }
        } else {
          // Tab: move right
          if (currentColIndex < columns.length - 1) {
            newColIndex = currentColIndex + 1;
          } else if (currentRow < maxRow) {
            // Move to start of next row
            newRow = currentRow + 1;
            newColIndex = 0;
          }
        }
        handled = true;
        break;
        
      case 'Enter':
        if (!e.shiftKey) {
          // Enter: move down
          if (currentRow < maxRow) {
            newRow = currentRow + 1;
            handled = true;
          }
        } else {
          // Shift+Enter: move up
          if (currentRow > 0) {
            newRow = currentRow - 1;
            handled = true;
          }
        }
        break;
        
      case 'F2':
        // F2: Enter edit mode
        e.preventDefault();
        setOpenTables(prev => prev.map(t => 
          t.id === tableId 
            ? { ...t, editingCell: { row: currentRow, col: currentCol } }
            : t
        ));
        handled = true;
        break;
        
      case 'Home':
        if (e.ctrlKey) {
          // Ctrl+Home: go to first cell
          newRow = 0;
          newColIndex = 0;
        } else {
          // Home: go to first column in row
          newColIndex = 0;
        }
        handled = true;
        break;
        
      case 'End':
        if (e.ctrlKey) {
          // Ctrl+End: go to last cell with data
          newRow = Math.max(0, (table.data?.length || 1) - 1);
          newColIndex = columns.length - 1;
        } else {
          // End: go to last column in row
          newColIndex = columns.length - 1;
        }
        handled = true;
        break;
        
      case 'PageUp':
        newRow = Math.max(0, currentRow - 10);
        handled = true;
        break;
        
      case 'PageDown':
        newRow = Math.min(maxRow, currentRow + 10);
        handled = true;
        break;
        
      case 'F2':
        // F2: Edit current cell
        e.preventDefault();
        const editingTable = openTables.find(t => t.id === tableId);
        if (editingTable) {
          setOpenTables(prev => prev.map(t =>
            t.id === tableId
              ? { ...t, editingCell: { row: currentRow, col: currentCol } }
              : t
          ));
        }
        return;
        
      case 'Delete':
        // DELETE no Excel: apaga conteúdo sem entrar em modo de edição
        if (!table.editingCell) {
          e.preventDefault();
          if (selectedCells.size > 0) {
            // Apagar diretamente sem confirmação (comportamento Excel)
            selectedCells.forEach(cellKey => {
              const [tId, row, col] = cellKey.split('_');
              if (tId === tableId) {
                handleCellEdit(tableId, parseInt(row), col, null, true); // true = isDelete
              }
            });
          }
          handled = true;
        }
        break;
        
      case 'Backspace':
        // BACKSPACE no Excel: apaga conteúdo E entra em modo de edição
        if (!table.editingCell) {
          e.preventDefault();
          if (selectedCells.size > 0) {
            // Primeiro apagar o conteúdo
            selectedCells.forEach(cellKey => {
              const [tId, row, col] = cellKey.split('_');
              if (tId === tableId) {
                handleCellEdit(tableId, parseInt(row), col, null, true); // true = isDelete
              }
            });
            // Depois entrar em modo de edição (apenas se uma célula selecionada)
            if (selectedCells.size === 1) {
              setOpenTables(prev => prev.map(t =>
                t.id === tableId
                  ? { ...t, editingCell: { row: currentRow, col: currentCol } }
                  : t
              ));
            }
          }
          handled = true;
        }
        break;
        
      default:
        // Começar a digitar para entrar em modo de edição (caracteres imprimíveis)
        if (!table.editingCell && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          // Entrar em modo de edição e inserir o caractere digitado
          setOpenTables(prev => prev.map(t => 
            t.id === tableId 
              ? { ...t, editingCell: { row: currentRow, col: currentCol } }
              : t
          ));
          // Aguardar o input aparecer e inserir o caractere
          setTimeout(() => {
            const input = document.querySelector(`input[data-cell="${tableId}_${currentRow}_${currentCol}"]`) as HTMLInputElement;
            if (input) {
              input.value = e.key;
              input.focus();
              // Mover cursor para o final
              input.setSelectionRange(1, 1);
            }
          }, 0);
          handled = true;
        }
        // Ctrl+C - Copy
        else if (e.ctrlKey && e.key === 'c' && !table.editingCell) {
          e.preventDefault();
          if (selectedCells.size > 0) {
            const copiedData: any[] = [];
            selectedCells.forEach(cellKey => {
              const [tId, row, col] = cellKey.split('_');
              if (tId === tableId) {
                const rowData = table.data[parseInt(row)];
                const value = rowData ? rowData[col] : '';
                copiedData.push({ row: parseInt(row), col, value });
              }
            });
            // Store in clipboard (simplified - in production use Clipboard API)
            (window as any).clipboardData = copiedData;
            console.log('📋 Copiado:', copiedData.length, 'células');
          }
          handled = true;
        }
        // Ctrl+V - Paste
        else if (e.ctrlKey && e.key === 'v' && !table.editingCell) {
          e.preventDefault();
          const clipboardData = (window as any).clipboardData;
          if (clipboardData && clipboardData.length > 0 && selectedCells.size === 1) {
            const targetCellKey = Array.from(selectedCells)[0];
            const [tId, targetRow, targetCol] = targetCellKey.split('_');
            
            // Find min row/col from clipboard data
            const minRow = Math.min(...clipboardData.map((d: any) => d.row));
            const minCol = Math.min(...clipboardData.map((d: any) => d.col));
            
            // Paste relative to target cell
            clipboardData.forEach((item: any) => {
              const rowOffset = item.row - minRow;
              const colOffset = columns.findIndex(c => c.column_name === item.col) - columns.findIndex(c => c.column_name === minCol);
              const newRow = parseInt(targetRow) + rowOffset;
              const newColIndex = columns.findIndex(c => c.column_name === targetCol) + colOffset;
              
              if (newColIndex >= 0 && newColIndex < columns.length) {
                const newCol = columns[newColIndex].column_name;
                handleCellEdit(tableId, newRow, newCol, item.value);
              }
            });
            console.log('📋 Colado:', clipboardData.length, 'células');
          }
          handled = true;
        }
        // Ctrl+X - Cut
        else if (e.ctrlKey && e.key === 'x' && !table.editingCell) {
          e.preventDefault();
          if (selectedCells.size > 0) {
            const cutData: any[] = [];
            selectedCells.forEach(cellKey => {
              const [tId, row, col] = cellKey.split('_');
              if (tId === tableId) {
                const rowData = table.data[parseInt(row)];
                const value = rowData ? rowData[col] : '';
                cutData.push({ row: parseInt(row), col, value });
                // Clear the cell after cutting
                handleCellEdit(tableId, parseInt(row), col, null, true); // true = isDelete (cut = delete)
              }
            });
            (window as any).clipboardData = cutData;
            console.log('✂️ Recortado:', cutData.length, 'células');
          }
          handled = true;
        }
        break;
    }
    
    if (handled) {
      e.preventDefault();
      
      // Update selection
      const newCol = columns[newColIndex]?.column_name;
      if (newCol) {
        const cellKey = `${tableId}_${newRow}_${newCol}`;
        
        if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          // Extend selection
          if (cellSelectionStart) {
            const newSelection = new Set<string>();
            const startRow = cellSelectionStart.row;
            const endRow = newRow;
            const startColIndex = columns.findIndex(c => c.column_name === cellSelectionStart.col);
            const endColIndex = newColIndex;
            
            const minRow = Math.min(startRow, endRow);
            const maxRowSel = Math.max(startRow, endRow);
            const minCol = Math.min(startColIndex, endColIndex);
            const maxCol = Math.max(startColIndex, endColIndex);
            
            for (let r = minRow; r <= maxRowSel; r++) {
              for (let c = minCol; c <= maxCol; c++) {
                if (columns[c]) {
                  newSelection.add(`${tableId}_${r}_${columns[c].column_name}`);
                }
              }
            }
            setSelectedCells(newSelection);
          }
        } else {
          // Single cell selection
          setSelectedCells(new Set([cellKey]));
          setCellSelectionStart({ tableId, row: newRow, col: newCol });
          setCellSelectionEnd({ tableId, row: newRow, col: newCol });
        }
        
        // Focus on the new cell
        setTimeout(() => {
          const selector = `[data-table-id="${tableId}"][data-row="${newRow}"][data-col="${newCol}"]`;
          console.log('🔍 Looking for cell:', selector);
          const cellElement = document.querySelector(selector) as HTMLElement;
          if (cellElement) {
            console.log('✅ Found cell, focusing...');
            cellElement.focus();
            cellElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          } else {
            console.log('❌ Cell not found with selector:', selector);
          }
        }, 10);
      }
    }
  };

  const handleCellEdit = useCallback(async (tableId: string, row: number, col: string, value: any, isDelete: boolean = false) => {
    console.log('📦 handleCellEdit chamado:', { tableId, row, col, value, isDelete });
    
    // SOLUÇÃO DEFINITIVA - USAR SQL DIRETO VIA RPC!
    try {
      const [schema, tableName] = tableId.split('.');
      const tableData = openTables.find(t => t.id === tableId);
      
      if (!tableData) {
        throw new Error('Tabela não encontrada');
      }
      
      // Não permitir edição em colunas vazias - devem usar o botão +
      if (col.startsWith('_empty_col_')) {
        console.log('⚠️ Use o botão + para adicionar nova coluna');
        return;
      }
      
      // TRATAMENTO SQL-FIRST: Sempre preferir NULL sobre string vazia
      const column = tableData.columns.find(c => c.column_name === col);
      
      // VALIDAÇÃO - Aplicar regras antes de salvar
      const tableFilters = columnFilters.get(tableId);
      const columnFilter = tableFilters?.get(col);
      
      if (columnFilter?.validation && value !== null && value !== undefined) {
        const validation = columnFilter.validation;
        
        // Validação de campo obrigatório
        if (validation.required && (value === null || value === '' || value === undefined)) {
          toast.error(`Campo "${col}" é obrigatório!`);
          return;
        }
        
        // Validação de padrão (regex)
        if (validation.pattern && value !== null && value !== '') {
          try {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(String(value))) {
              toast.error(`Campo "${col}" não corresponde ao padrão esperado!`);
              return;
            }
          } catch (e) {
            console.error('Regex inválido:', validation.pattern);
          }
        }
        
        // Validação de valores mínimo e máximo
        if ((validation.min !== undefined || validation.max !== undefined) && value !== null && value !== '') {
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue)) {
            if (validation.min !== undefined && numValue < validation.min) {
              toast.error(`Valor do campo "${col}" deve ser maior ou igual a ${validation.min}!`);
              return;
            }
            if (validation.max !== undefined && numValue > validation.max) {
              toast.error(`Valor do campo "${col}" deve ser menor ou igual a ${validation.max}!`);
              return;
            }
          }
        }
      }
      
      // Regra principal: valor vazio = NULL (comportamento SQL padrão)
      if (value === '' || value === undefined) {
        value = null;
      }
      
      // Tratamento especial para DELETE ou valores vazios
      if ((value === null || isDelete) && column) {
        if (isDelete) {
          // DELETE sempre usa NULL quando possível
          if (column.is_nullable === 'YES' || column.is_nullable === true) {
            value = null; // SQL NULL é o correto
          } else if (column.column_default) {
            // Coluna NOT NULL com DEFAULT - deixar banco usar o default
            value = undefined; // undefined = omitir da query UPDATE
          } else {
            // Coluna NOT NULL sem default - não podemos usar NULL
            // IMPORTANTE: Em SQL real, isso deveria dar erro!
            // Mas para manter compatibilidade, usar valor mínimo
            const dataType = column.data_type?.toLowerCase();
            if (dataType?.includes('text') || dataType?.includes('varchar') || dataType?.includes('char')) {
              value = ''; // Única exceção: string vazia para NOT NULL text
            } else if (dataType?.includes('int') || dataType?.includes('numeric')) {
              value = 0;
            } else if (dataType?.includes('bool')) {
              value = false;
            } else if (dataType?.includes('json')) {
              value = '{}';
            } else if (dataType?.includes('date') || dataType?.includes('time')) {
              value = new Date().toISOString();
            } else {
              value = getValidDefaultValue(col, column.data_type || '');
            }
            console.log(`⚠️ Coluna ${col} é NOT NULL sem default - usando valor mínimo:`, value);
          }
        } else if (value === null) {
          // Edição normal com valor null
          if (column.is_nullable === 'NO' && !column.column_default) {
            // Não pode ser NULL e não tem default
            value = getValidDefaultValue(col, column.data_type || '');
            console.log(`🔄 Coluna ${col} NOT NULL - convertendo NULL para:`, value);
          }
          // Se permite NULL ou tem default, manter NULL
        }
      }
      
      // Encontrar chave primária
      const primaryKeyColumn = tableData.columns.find(c => 
        c.column_name === 'id' || 
        c.is_primary
      )?.column_name || 'id';
      
      // Verificar se a linha existe
      const existingRow = tableData.data[row];
      const primaryKeyValue = existingRow?.[primaryKeyColumn];
      
      // SE É DELETE E A LINHA NÃO EXISTE, NÃO FAZER NADA!
      if (isDelete && !existingRow) {
        console.log('⚩ DELETE em linha inexistente - ignorando');
        console.log('Dados da tabela:', tableData.data);
        console.log('Linha solicitada:', row);
        return; // Não criar linha nova só para apagar!
      }
      
      // SE É DELETE E A CÉLULA JÁ ESTÁ VAZIA, NÃO FAZER NADA!
      if (isDelete && existingRow && (existingRow[col] === null || existingRow[col] === '' || existingRow[col] === undefined)) {
        console.log('⚩ DELETE em célula já vazia - ignorando');
        console.log('Valor atual da célula:', existingRow[col]);
        return; // Não fazer nada se já está vazio
      }
      
      console.log('✅ Continuando com DELETE/UPDATE...');
      console.log('Linha existe:', !!existingRow);
      console.log('Valor da célula:', existingRow?.[col]);
      
      // USAR SQL DIRETO PARA EVITAR PROBLEMAS DE CACHE
      let result;
      
      if (!primaryKeyValue) {
        // INSERT - criar nova linha (mas NUNCA em DELETE!)
        
        // PROTEÇÃO: Nunca fazer INSERT em DELETE
        if (isDelete) {
          console.log('⛔ DELETE não pode criar nova linha!');
          return;
        }
        
        // Preparar valores para INSERT
        const columns = [];
        const values = [];
        let placeholderCount = 0;
        const placeholders = [];
        
        // Só adicionar a coluna se o valor não for undefined
        if (value !== undefined) {
          columns.push(col);
          values.push(value);
          placeholderCount++;
          placeholders.push(`$${placeholderCount}`);
        }
        
        // Adicionar valores padrão para colunas NOT NULL
        tableData.columns.forEach(column => {
          // Pular a coluna que já estamos editando
          if (column.column_name === col) return;
          
          // Pular colunas que têm DEFAULT (banco preenche automaticamente)
          if (column.column_default) return;
          
          // Pular colunas que permitem NULL
          if (column.is_nullable === 'YES') return;
          
          // Pular colunas auto-geradas (SERIAL, GENERATED)
          if (column.column_default?.includes('nextval') || 
              column.column_default?.includes('gen_random_uuid') ||
              column.data_type?.toLowerCase().includes('serial')) {
            return;
          }
          
          // Para colunas NOT NULL sem default, adicionar valor padrão
          columns.push(column.column_name);
          const defaultValue = getValidDefaultValue(column.column_name, column.data_type || '');
          values.push(defaultValue);
          placeholderCount++;
          placeholders.push(`$${placeholderCount}`);
          
          console.log(`➕ Adicionando valor padrão para ${column.column_name}:`, defaultValue);
        });
        
        // Não gerar ID manualmente - deixar o banco gerar (SERIAL ou UUID default)
        
        // Se não há colunas para inserir (todas têm DEFAULT), fazer INSERT vazio
        let query;
        if (columns.length === 0) {
          query = `
            INSERT INTO ${schema}.${tableName} DEFAULT VALUES
            RETURNING *
          `;
        } else {
          query = `
            INSERT INTO ${schema}.${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
          `;
        }
        
        console.log('📝 INSERT Query:', query);
        console.log('📝 INSERT Values:', values);
        
        const response = await fetch('/api/postgres/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, params: values })
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
        
        result = await response.json();
        
      } else {
        // UPDATE - atualizar linha existente
        
        // Se value é undefined, significa que devemos deixar o banco usar o DEFAULT
        // Nesse caso, não fazemos UPDATE dessa coluna
        if (value === undefined) {
          console.log(`⚩ Pulando UPDATE da coluna ${col} - deixar valor atual/default`);
          return;
        }
        
        const query = `
          UPDATE ${schema}.${tableName}
          SET ${col} = $1
          WHERE ${primaryKeyColumn} = $2
          RETURNING *
        `;
        
        console.log('📝 UPDATE Query:', query);
        console.log('📝 UPDATE Values:', [value, primaryKeyValue]);
        
        const response = await fetch('/api/postgres/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query, 
            params: [value, primaryKeyValue] 
          })
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
        
        result = await response.json();
      }
      
      if (result.error) {
        throw new Error(result.error.message || result.error);
      }
      
      // O resultado do SQL direto vem em result.data ou result.rows
      const savedData = result.data || result.rows;
      
      if (savedData && savedData.length > 0) {
        // Atualizar dados locais com o retorno do banco
        setOpenTables(prev => prev.map(table => {
          if (table.id === tableId) {
            const newData = [...table.data];
            // IMPORTANTE: Usar o retorno do banco que já tem a ordem correta das colunas
            // O banco retorna null como null, não como string
            newData[row] = savedData[0];
            return { ...table, data: newData, hasUnsavedChanges: false };
          }
          return table;
        }));
        
        // Limpar cache
        dataCache.current = {};
        
        // Feedback visual
        setSaveStatus({ message: '✅ Salvo no banco!', type: 'success' });
        setTimeout(() => setSaveStatus(null), 3000);
        
      } else {
        throw new Error('Nenhum dado retornado do banco');
      }
      
    } catch (error: any) {
      alert(`ERRO: ${error.message || error}`);
      setSaveStatus({ message: `❌ ${error.message || error}`, type: 'error' });
      setTimeout(() => setSaveStatus(null), 5000);
    }
    
    return; // PARAR AQUI - não executar o código antigo abaixo
    
    // Check if this cell has files - if so, don't overwrite with text
    const table = openTables.find(t => t.id === tableId);
    if (table) {
      const cellKey = `${row}-${col}`;
      const cellContent = table.cellContents?.get(cellKey);
      
      // If cell has files and we're trying to set empty/null value, preserve the files JSON
      if (cellContent?.files && cellContent.files.length > 0 && (!value || value === '')) {
        return; // Don't overwrite files with empty text
      }
    }
    
    // Update local state immediately for responsive UI
    setOpenTables(prev => prev.map(table => {
      if (table.id === tableId) {
        const newData = [...table.data];
        
        // Ensure the row exists
        while (newData.length <= row) {
          newData.push({});
        }
        
        // Ensure the row object exists
        if (!newData[row]) {
          newData[row] = {};
        }
        
        // Check if current value is a JSON string with files
        const currentValue = newData[row][col];
        const isFileJson = currentValue && typeof currentValue === 'string' && currentValue.startsWith('[');
        
        // If it's file JSON and new value is empty, preserve the JSON
        if (isFileJson && (!value || value === '')) {
          return table; // Don't update
        }
        
        // Update the cell value (preserve spaces and handle null/empty)
        newData[row] = { ...newData[row], [col]: value };
        
        
        return {
          ...table,
          data: newData,
          editingCell: undefined
        };
      }
      return table;
    }));

    // Persist to database using Supabase SDK with INSERT/UPDATE logic
    try {
      const [schema, tableName] = tableId.split('.');
      const tableData = openTables.find(t => t.id === tableId);
      
      if (tableData) {
        
        // GARANTIR que a linha existe no array de dados
        if (!tableData.data[row]) {
          // Preencher com objetos vazios até chegar na linha desejada
          while (tableData.data.length <= row) {
            tableData.data.push({});
          }
        }
        
        // Tentar encontrar a chave primária da linha
        const primaryKeyColumn = tableData.columns.find(c => 
          c.column_name === 'id' || 
          c.column_name.includes('_id') ||
          c.is_primary
        )?.column_name || 'id';
        
        const primaryKeyValue = tableData.data[row][primaryKeyColumn];
        
        // Usar diretamente o schema e tabela sem transformação
        const realSchema = schema || 'public';
        const realTableName = tableName;
        
        // Lista de schemas válidos do Supabase
        const validSupabaseSchemas = ['public', 'vault', 'graphql_public', 'graphql', 'storage', 'realtime', 'plataforma_core', 'cron', 'supabase_migrations'];
        
        // Se o schema não for válido para Supabase, usar API REST
        const useRestAPI = !validSupabaseSchemas.includes(realSchema);
        
        // Escolher cliente baseado no schema
        const dbClient = realSchema === 'public' ? supabase : (useRestAPI ? null : useSchema(realSchema));
        
        let result;
        
        // Determinar se é INSERT ou UPDATE
        const isNewRow = !primaryKeyValue || primaryKeyValue === '' || primaryKeyValue === null;
        
        if (isNewRow) {
          // INSERT: Nova linha
          setSaveStatus({ message: '🔄 Criando nova linha...', type: 'saving' });
          
          // Criar objeto com todos os valores da linha
          const rowData: any = {};
          tableData.columns.forEach(column => {
            const colName = column.column_name;
            const cellValue = tableData.data[row][colName];
            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
              rowData[colName] = cellValue;
            }
          });
          
          // Adicionar o valor atual
          if (value !== null && value !== '') {
            rowData[col] = value;
          }
          
          // Gerar ID se necessário e a coluna existir
          if (primaryKeyColumn === 'id' && !rowData.id) {
            // Verificar o tipo da coluna ID
            const idColumn = tableData.columns.find(c => c.column_name === 'id');
            if (idColumn?.data_type?.toLowerCase().includes('int')) {
              // Se for INTEGER, deixar o banco gerar (SERIAL)
              delete rowData.id; // Remover para deixar o banco gerar
            } else {
              // Se for TEXT/VARCHAR, gerar ID string
              rowData.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
          }
          
          if (useRestAPI || !dbClient) {
            // Usar REST API para schemas customizados ou quando não há cliente Supabase
            
            // Filtrar colunas vazias ou undefined
            const filteredData: any = {};
            Object.keys(rowData).forEach(key => {
              if (rowData[key] !== undefined && rowData[key] !== null && rowData[key] !== '') {
                filteredData[key] = rowData[key];
              }
            });
            
            const columns = Object.keys(filteredData);
            const values = Object.values(filteredData);
            
            
            const response = await fetch('/api/postgres/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `INSERT INTO ${realSchema}.${realTableName} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i+1}`).join(', ')}) RETURNING *`,
                params: values
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            result = await response.json();
            if (!result.error && result.rows && result.rows[0]) {
              result.data = result.rows;
            }
          } else {
            result = await dbClient
              .from(realTableName)
              .insert(rowData)
              .select(); // IMPORTANTE: retornar dados inseridos
            
            // Verificar se realmente inseriu
            if (!result.error && (!result.data || result.data.length === 0)) {
              console.warn('⚠️ Nenhuma linha foi inserida');
              result.error = { message: 'Falha ao inserir registro.' };
            }
          }
          
          if (!result.error && result.data && result.data[0]) {
            // Atualizar dados locais com o novo ID retornado
            const newRowData = result.data[0];
            setOpenTables(prev => prev.map(table => {
              if (table.id === tableId) {
                const updatedData = [...table.data];
                updatedData[row] = { ...updatedData[row], ...newRowData };
                return { ...table, data: updatedData };
              }
              return table;
            }));
          }
        } else {
          // UPDATE: Linha existente
          setSaveStatus({ message: '🔄 Salvando...', type: 'saving' });
          
          if (useRestAPI || !dbClient) {
            // Usar REST API para schemas customizados ou quando não há cliente Supabase
            
            const response = await fetch('/api/postgres/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `UPDATE ${realSchema}.${realTableName} SET ${col} = $1 WHERE ${primaryKeyColumn} = $2`,
                params: [value, primaryKeyValue]
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            result = await response.json();
          } else {
            
            result = await dbClient
              .from(realTableName)
              .update({ [col]: value })
              .eq(primaryKeyColumn, primaryKeyValue)
              .select(); // IMPORTANTE: retornar dados atualizados
            
            // Verificar se realmente atualizou
            if (!result.error && (!result.data || result.data.length === 0)) {
              console.warn('⚠️ Nenhuma linha foi atualizada - verificar primaryKey:', primaryKeyColumn, '=', primaryKeyValue);
              result.error = { message: 'Nenhuma linha foi atualizada. Verifique se o registro existe.' };
            }
          }
          
          if (!result.error) {
          }
        }
        
        
        if (result?.error) {
          
          // Mostrar feedback de erro
          setSaveStatus({ message: `❌ Erro: ${result.error.message || result.error}`, type: 'error' });
          if (saveStatusTimeout) clearTimeout(saveStatusTimeout);
          const timeout = setTimeout(() => setSaveStatus(null), 5000);
          setSaveStatusTimeout(timeout);
          
          // Reverter mudança local em caso de erro
          setOpenTables(prev => prev.map(table => {
            if (table.id === tableId) {
              // TODO: Implementar rollback real com valor original
              return table;
            }
            return table;
          }));
        } else {
          // Limpar cache para forçar reload dos dados
          dataCache.current = {};
          
          // Mostrar feedback de sucesso
          setSaveStatus({ message: '✅ Salvo com sucesso!', type: 'success' });
          if (saveStatusTimeout) clearTimeout(saveStatusTimeout);
          const timeout = setTimeout(() => setSaveStatus(null), 3000);
          setSaveStatusTimeout(timeout);
        }
      } else {
        alert('Erro: Tabela não encontrada. Reabra a tabela e tente novamente.');
      }
    } catch (error) {
      
      // Mostrar erro detalhado ao usuário
      alert(`ERRO DETALHADO:\n\n${error.message || error}\n\nVerifique o console para mais detalhes.`);
      
      // Mostrar no status
      setSaveStatus({ message: `❌ ERRO: ${error.message || error}`, type: 'error' });
      if (saveStatusTimeout) clearTimeout(saveStatusTimeout);
      const timeout = setTimeout(() => setSaveStatus(null), 10000);
      setSaveStatusTimeout(timeout);
    }
  }, [openTables, saveStatusTimeout]);
  
  // Versão debounced do handleCellEdit para otimização
  const debouncedCellEdit = useMemo(
    () => debounce((tableId: string, row: number, col: string, value: any) => {
      handleCellEdit(tableId, row, col, value, false);
    }, 500), // Aguarda 500ms após parar de digitar
    [handleCellEdit]
  );
  
  // Cleanup do debounce ao desmontar componente
  useEffect(() => {
    return () => {
      debouncedCellEdit.cancel();
    };
  }, [debouncedCellEdit]);
  
  // Zoom functions
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  // Column resize handlers
  const handleColumnResizeStart = (e: React.MouseEvent, tableId: string, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Debug: verificar qual coluna está sendo redimensionada
    const targetElement = e.currentTarget.parentElement;
    const dataIndex = targetElement?.getAttribute('data-data-index');
    const visualIndex = targetElement?.getAttribute('data-visual-index');
    
    const table = openTables.find(t => t.id === tableId);
    if (!table) {
      return;
    }
    
    // Ensure columnWidths Map exists
    if (!table.columnWidths) {
      table.columnWidths = new Map();
    }
    
    const currentWidth = table.columnWidths.get(columnName) || 200; // Get current width or default
    
    setIsResizingColumn(true);
    setResizingColumn({
      tableId,
      columnName,
      startX: e.clientX,
      startWidth: currentWidth
    });
  };
  
  const handleColumnResizeMove = (e: MouseEvent) => {
    if (!isResizingColumn || !resizingColumn) return;
    
    const delta = e.clientX - resizingColumn.startX;
    const newWidth = Math.max(60, resizingColumn.startWidth + delta); // Minimum 60px width
    
    setOpenTables(prev => prev.map(table => {
      if (table.id === resizingColumn.tableId) {
        const widths = new Map(table.columnWidths || new Map());
        widths.set(resizingColumn.columnName, newWidth);
        return { ...table, columnWidths: widths };
      }
      return table;
    }));
  };
  
  const handleColumnResizeEnd = () => {
    setIsResizingColumn(false);
    setResizingColumn(null);
  };
  
  // Row resize handlers
  const handleRowResizeStart = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const table = openTables.find(t => t.id === tableId);
    const currentHeight = table?.rowHeight || 32; // Get current height or default
    
    setIsResizingRow(true);
    setResizingRow({
      tableId,
      startY: e.clientY,
      startHeight: currentHeight
    });
  };
  
  const handleRowResizeMove = (e: MouseEvent) => {
    if (!isResizingRow || !resizingRow) return;
    
    const delta = e.clientY - resizingRow.startY;
    const newHeight = Math.max(25, resizingRow.startHeight + delta); // Minimum 25px height
    
    setOpenTables(prev => prev.map(table => {
      if (table.id === resizingRow.tableId) {
        return { ...table, rowHeight: newHeight };
      }
      return table;
    }));
  };
  
  const handleRowResizeEnd = () => {
    setIsResizingRow(false);
    setResizingRow(null);
  };
  
  // Add mouse event listeners for resizing
  useEffect(() => {
    if (isResizingColumn) {
      const handleMouseMove = (e: MouseEvent) => handleColumnResizeMove(e);
      const handleMouseUp = () => handleColumnResizeEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingColumn, resizingColumn]);
  
  useEffect(() => {
    if (isResizingRow) {
      const handleMouseMove = (e: MouseEvent) => handleRowResizeMove(e);
      const handleMouseUp = () => handleRowResizeEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingRow, resizingRow]);
  
  // Handle column selection dragging
  useEffect(() => {
    if (isDraggingColumnSelection) {
      const handleMouseUp = () => {
        setIsDraggingColumnSelection(false);
        setColumnSelectionStart(null);
      };
      
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingColumnSelection]);
  
  // Handle cell selection dragging
  useEffect(() => {
    if (isDraggingCellSelection) {
      const handleMouseUp = () => {
        setIsDraggingCellSelection(false);
      };
      
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingCellSelection]);
  
  // Refs are no longer needed for keyboard handling since it's done directly in cells
  
  // Global keyboard handler for copy/paste and other shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Handle Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        const activeTable = openTables.find(t => t.id === activeTableId);
        
        switch(e.key.toLowerCase()) {
          case 'c': // Copy
            if (selectedCells.size > 0 && activeTable) {
              e.preventDefault();
              const values: string[] = [];
              const cellsArray = Array.from(selectedCells);
              
              // Organizar células por linha e coluna para copiar na ordem correta
              const cellData = cellsArray.map(cellKey => {
                const match = cellKey.match(/^(.+)_(\d+)_(.+)$/);
                if (match) {
                  const [, , rowStr, colName] = match;
                  const row = parseInt(rowStr);
                  const colIndex = activeTable.columns.findIndex(c => c.column_name === colName);
                  return { row, colIndex, colName, cellKey };
                }
                return null;
              }).filter(Boolean);
              
              // Ordenar por linha e depois por coluna
              cellData.sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                return a.colIndex - b.colIndex;
              });
              
              // Construir texto para clipboard (formato TSV - Tab Separated Values)
              let currentRow = -1;
              let rowValues: string[] = [];
              
              cellData.forEach(cell => {
                if (cell.row !== currentRow) {
                  if (rowValues.length > 0) {
                    values.push(rowValues.join('\t'));
                  }
                  currentRow = cell.row;
                  rowValues = [];
                }
                
                const value = activeTable.data[cell.row]?.[cell.colName] || '';
                rowValues.push(String(value));
              });
              
              if (rowValues.length > 0) {
                values.push(rowValues.join('\t'));
              }
              
              const textToCopy = values.join('\n');
              await navigator.clipboard.writeText(textToCopy);
              console.log('📋 Copied to clipboard:', textToCopy);
              
              // Feedback visual
              setSaveStatus({ message: '📋 Copiado!', type: 'success' });
              setTimeout(() => setSaveStatus(null), 2000);
            }
            break;
            
          case 'v': // Paste
            if (selectedCells.size > 0 && activeTable && !activeTable.editingCell) {
              e.preventDefault();
              
              try {
                const text = await navigator.clipboard.readText();
                console.log('📋 Pasting from clipboard:', text);
                
                // Pegar primeira célula selecionada como ponto de partida
                const firstCell = Array.from(selectedCells)[0];
                const match = firstCell.match(/^(.+)_(\d+)_(.+)$/);
                
                if (match) {
                  const [, tableId, rowStr, colName] = match;
                  const startRow = parseInt(rowStr);
                  const startColIndex = activeTable.columns.findIndex(c => c.column_name === colName);
                  
                  // Parse do texto colado (TSV format)
                  const rows = text.split('\n').map(row => row.split('\t'));
                  
                  // Colunas protegidas
                  
                  // Colar dados
                  rows.forEach((rowData, rowOffset) => {
                    rowData.forEach((value, colOffset) => {
                      const targetRow = startRow + rowOffset;
                      const targetColIndex = startColIndex + colOffset;
                      
                      if (targetColIndex < activeTable.columns.length && targetRow < activeTable.data.length) {
                        const targetCol = activeTable.columns[targetColIndex];
                        
                        // Colar valor na célula - sem restrições!
                        handleCellEdit(tableId, targetRow, targetCol.column_name, value || null);
                      }
                    });
                  });
                  
                  // Feedback visual
                  setSaveStatus({ message: '📋 Colado!', type: 'success' });
                  setTimeout(() => setSaveStatus(null), 2000);
                }
              } catch (err) {
                console.error('Failed to paste:', err);
                setSaveStatus({ message: '❌ Erro ao colar', type: 'error' });
                setTimeout(() => setSaveStatus(null), 3000);
              }
            }
            break;
            
          case 'x': // Cut
            if (selectedCells.size > 0 && activeTable) {
              e.preventDefault();
              
              // Primeiro copiar (mesma lógica do Ctrl+C)
              const values: string[] = [];
              const cellsArray = Array.from(selectedCells);
              
              const cellData = cellsArray.map(cellKey => {
                const match = cellKey.match(/^(.+)_(\d+)_(.+)$/);
                if (match) {
                  const [, tableId, rowStr, colName] = match;
                  const row = parseInt(rowStr);
                  const colIndex = activeTable.columns.findIndex(c => c.column_name === colName);
                  return { tableId, row, colIndex, colName, cellKey };
                }
                return null;
              }).filter(Boolean);
              
              cellData.sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                return a.colIndex - b.colIndex;
              });
              
              let currentRow = -1;
              let rowValues: string[] = [];
              
              cellData.forEach(cell => {
                if (cell.row !== currentRow) {
                  if (rowValues.length > 0) {
                    values.push(rowValues.join('\t'));
                  }
                  currentRow = cell.row;
                  rowValues = [];
                }
                
                const value = activeTable.data[cell.row]?.[cell.colName] || '';
                rowValues.push(String(value));
              });
              
              if (rowValues.length > 0) {
                values.push(rowValues.join('\t'));
              }
              
              const textToCopy = values.join('\n');
              await navigator.clipboard.writeText(textToCopy);
              
              // Depois limpar as células (exceto colunas de sistema)
              const SYSTEM_COLUMNS = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];
              
              cellData.forEach(cell => {
                // Limpar célula - sem restrições!
                handleCellEdit(cell.tableId, cell.row, cell.colName, null, true); // true = isDelete
              });
              
              console.log('✂️ Cut to clipboard:', textToCopy);
              
              // Feedback visual
              setSaveStatus({ message: '✂️ Recortado!', type: 'success' });
              setTimeout(() => setSaveStatus(null), 2000);
            }
            break;
            
          case 'a': // Select All
            if (activeTable) {
              e.preventDefault();
              const allCells = new Set<string>();
              
              activeTable.data.forEach((_, rowIndex) => {
                activeTable.columns.forEach(col => {
                  // Não selecionar colunas ocultas
                  const hiddenCols = hiddenColumns.get(activeTable.id);
                  if (!hiddenCols?.has(col.column_name)) {
                    allCells.add(`${activeTable.id}_${rowIndex}_${col.column_name}`);
                  }
                });
              });
              
              setSelectedCells(allCells);
              console.log('🔲 Selected all cells:', allCells.size);
            }
            break;
            
          case 'z': // Undo (placeholder for future implementation)
            if (!activeTable?.editingCell) {
              e.preventDefault();
              console.log('↩️ Undo - Not implemented yet');
              // TODO: Implement undo functionality
            }
            break;
            
          case 'y': // Redo (placeholder for future implementation)
            if (!activeTable?.editingCell) {
              e.preventDefault();
              console.log('↪️ Redo - Not implemented yet');
              // TODO: Implement redo functionality
            }
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCells, openTables, activeTableId, hiddenColumns]);
  
  // Helper function to determine cell border styles for selection
  const getCellSelectionBorder = (tableId: string, rowIndex: number, colName: string, columns: any[]) => {
    const cellKey = `${tableId}_${rowIndex}_${colName}`;
    if (!selectedCells.has(cellKey)) {
      return {
        borderRight: '1px solid #c0c0c0',
        borderBottom: '1px solid #c0c0c0'
      };
    }
    
    const colIndex = columns.findIndex(c => c.column_name === colName);
    
    // Check neighbors
    const hasTopNeighbor = rowIndex > 0 && selectedCells.has(`${tableId}_${rowIndex - 1}_${colName}`);
    const hasBottomNeighbor = selectedCells.has(`${tableId}_${rowIndex + 1}_${colName}`);
    const hasLeftNeighbor = colIndex > 0 && selectedCells.has(`${tableId}_${rowIndex}_${columns[colIndex - 1]?.column_name}`);
    const hasRightNeighbor = colIndex < columns.length - 1 && selectedCells.has(`${tableId}_${rowIndex}_${columns[colIndex + 1]?.column_name}`);
    
    // Apply border only on the edges of selection - cinza em vez de azul
    return {
      borderTop: !hasTopNeighbor ? '2px solid #808080' : 'none',
      borderRight: !hasRightNeighbor ? '2px solid #808080' : '1px solid #c0c0c0',
      borderBottom: !hasBottomNeighbor ? '2px solid #808080' : '1px solid #c0c0c0',
      borderLeft: !hasLeftNeighbor ? '2px solid #808080' : 'none'
    };
  };
  
  // Hide/Show column functions
  const hideColumn = (tableId: string, columnName: string) => {
    setHiddenColumns(prev => {
      const newMap = new Map(prev);
      const tableHidden = newMap.get(tableId) || new Set();
      tableHidden.add(columnName);
      newMap.set(tableId, tableHidden);
      return newMap;
    });
  };
  
  const showColumn = (tableId: string, columnName: string) => {
    setHiddenColumns(prev => {
      const newMap = new Map(prev);
      const tableHidden = newMap.get(tableId);
      if (tableHidden) {
        tableHidden.delete(columnName);
        if (tableHidden.size === 0) {
          newMap.delete(tableId);
        } else {
          newMap.set(tableId, tableHidden);
        }
      }
      return newMap;
    });
  };
  
  const getVisibleColumns = useCallback((table: OpenTable) => {
    const allColumns = getTableColumns(table);
    const tableHidden = hiddenColumns.get(table.id) || new Set();
    return allColumns.filter(col => !tableHidden.has(col.column_name));
  }, [getTableColumns, hiddenColumns]);
  
  // Save function - salvar mudanças no banco
  const handleSave = async () => {
    const tablesWithChanges = openTables.filter(t => t.hasUnsavedChanges);
    if (tablesWithChanges.length === 0) {
      alert('Nenhuma mudança para salvar');
      return;
    }
    
    try {
      for (const table of tablesWithChanges) {
        // Aqui você implementaria a lógica real de salvar no banco
        // await fetch(`/api/database/tables/${table.name}/update`, { ... })
      }
      
      // Marcar como salvo
      setOpenTables(prev => prev.map(t => ({ ...t, hasUnsavedChanges: false })));
      alert('Dados salvos com sucesso!');
    } catch (error) {
      alert('Erro ao salvar dados');
    }
  };
  
  // Refresh function - recarregar dados do banco
  
  // Copy/Paste functions
  const handleCopy = () => {
    if (!activeTableId) return;
    
    const activeTable = openTables.find(t => t.id === activeTableId);
    if (!activeTable || !activeTable.selection) return;
    
    const selection = tableSelections.get(activeTableId);
    if (!selection) return;
    
    const editingCells = selection.getSelectedCells(
      activeTable.columns.map(c => c.column_name),
      activeTable.data.length
    );
    
    const copiedData: any[] = [];
    const copiedFormats = new Map<string, CellFormat>();
    
    editingCells.forEach(({ row, col }) => {
      copiedData.push({
        row,
        col,
        value: activeTable.data[row]?.[col]
      });
      
      const formatKey = `${row}-${col}`;
      if (activeTable.formats?.has(formatKey)) {
        copiedFormats.set(formatKey, activeTable.formats.get(formatKey)!);
      }
    });
    
    setClipboard({ data: copiedData, format: copiedFormats });
  };
  
  const handlePaste = () => {
    if (!activeTableId || !clipboard) return;
    
    const activeTable = openTables.find(t => t.id === activeTableId);
    if (!activeTable || !activeTable.editingCell) return;
    
    const startRow = activeTable.editingCell.row;
    const startCol = activeTable.columns.findIndex(c => c.column_name === activeTable.editingCell!.col);
    
    // Aplicar dados copiados
    const newData = [...activeTable.data];
    clipboard.data.forEach(item => {
      const targetRow = startRow + item.row;
      if (targetRow < newData.length) {
        const targetCol = activeTable.columns[startCol + activeTable.columns.findIndex(c => c.column_name === item.col)]?.column_name;
        if (targetCol) {
          newData[targetRow][targetCol] = item.value;
        }
      }
    });
    
    setOpenTables(prev => prev.map(t =>
      t.id === activeTableId
        ? { ...t, data: newData, hasUnsavedChanges: true }
        : t
    ));
  };
  
  // Format functions
  const applyFormat = (formatType: keyof CellFormat, value: any) => {
    if (!activeTableId) return;
    
    const activeTable = openTables.find(t => t.id === activeTableId);
    if (!activeTable) return;
    
    const newFormats = new Map(activeTable.formats || new Map());
    const cellsToFormat: Array<{ row: number; col: string }> = [];
    
    // Get cells to format based on selection type
    if (activeTable.selection?.cells) {
      // Multi-selection
      activeTable.selection.cells.forEach(cellKey => {
        const [rowStr, col] = cellKey.split('-');
        const row = parseInt(rowStr);
        cellsToFormat.push({ row, col });
      });
    } else if (activeTable.editingCell) {
      // Single cell selection
      cellsToFormat.push(activeTable.editingCell);
    }
    
    // Apply format to all selected cells
    cellsToFormat.forEach(({ row, col }) => {
      const key = `${row}-${col}`;
      const currentFormat = newFormats.get(key) || {};
      newFormats.set(key, {
        ...currentFormat,
        [formatType]: value
      });
    });
    
    // Create undo action
    const oldFormats = new Map(activeTable.formats || new Map());
    const action = createFormatAction(
      activeTableId,
      cellsToFormat,
      oldFormats,
      newFormats,
      (formats) => {
        setOpenTables(prev => prev.map(t =>
          t.id === activeTableId
            ? { ...t, formats, hasUnsavedChanges: true }
            : t
        ));
      }
    );
    
    addAction(action);
    action.redo();
  };
  
  const handleBold = () => applyFormat('fontWeight', 'bold');
  const handleItalic = () => applyFormat('fontStyle', 'italic');
  const handleUnderline = () => applyFormat('textDecoration', 'underline');
  
  const handleColorPicker = (target: 'background' | 'text') => {
    setColorPickerTarget(target);
    setShowColorPicker(true);
  };
  
  const applyBorders = () => {
    if (!activeTableId) return;
    
    const activeTable = openTables.find(t => t.id === activeTableId);
    if (!activeTable) return;
    
    const newFormats = new Map(activeTable.formats || new Map());
    const cellsToFormat: Array<{ row: number; col: string; colIndex: number }> = [];
    
    // Get cells to format based on selection type
    if (activeTable.selection?.cells) {
      activeTable.selection.cells.forEach(cellKey => {
        const [rowStr, col] = cellKey.split('-');
        const row = parseInt(rowStr);
        const colIndex = activeTable.columns.findIndex(c => c.column_name === col);
        cellsToFormat.push({ row, col, colIndex });
      });
    } else if (activeTable.editingCell) {
      const colIndex = activeTable.columns.findIndex(c => c.column_name === activeTable.editingCell!.col);
      cellsToFormat.push({ ...activeTable.editingCell, colIndex });
    }
    
    // Find boundaries of selection
    const minRow = Math.min(...cellsToFormat.map(c => c.row));
    const maxRow = Math.max(...cellsToFormat.map(c => c.row));
    const minCol = Math.min(...cellsToFormat.map(c => c.colIndex));
    const maxCol = Math.max(...cellsToFormat.map(c => c.colIndex));
    
    // Apply borders only to edge cells
    cellsToFormat.forEach(({ row, col, colIndex }) => {
      const key = `${row}-${col}`;
      const currentFormat = newFormats.get(key) || {};
      const border: any = currentFormat.border || {};
      
      // Apply top border only to cells in the top row of selection
      if (row === minRow && borderSides.top) {
        border.top = { width: borderWidth, style: borderStyle, color: borderColor };
      }
      
      // Apply right border only to cells in the rightmost column of selection
      if (colIndex === maxCol && borderSides.right) {
        border.right = { width: borderWidth, style: borderStyle, color: borderColor };
      }
      
      // Apply bottom border only to cells in the bottom row of selection
      if (row === maxRow && borderSides.bottom) {
        border.bottom = { width: borderWidth, style: borderStyle, color: borderColor };
      }
      
      // Apply left border only to cells in the leftmost column of selection
      if (colIndex === minCol && borderSides.left) {
        border.left = { width: borderWidth, style: borderStyle, color: borderColor };
      }
      
      // Only update if there are borders to apply
      if (Object.keys(border).length > 0) {
        newFormats.set(key, {
          ...currentFormat,
          border
        });
      }
    });
    
    setOpenTables(prev => prev.map(t =>
      t.id === activeTableId
        ? { ...t, formats: newFormats, hasUnsavedChanges: true }
        : t
    ));
    
    setShowBorderPicker(false);
  };
  
  const applyColor = (color: string) => {
    if (colorPickerTarget === 'background') {
      applyFormat('backgroundColor', color);
    } else if (colorPickerTarget === 'text') {
      applyFormat('color', color);
    }
    setShowColorPicker(false);
    setColorPickerTarget(null);
  };
  
  // Helper function to validate file types based on column media_type
  const validateFileTypes = (files: FileList, column: TableColumn): { valid: FileList; invalid: string[] } => {
    if (!column.media_type || column.media_type === 'mixed') {
      // No restrictions for mixed or undefined media type
      return { valid: files, invalid: [] };
    }

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    const getAcceptedTypes = (mediaType: string): string[] => {
      switch (mediaType) {
        case 'image':
          return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        case 'pdf':
          return ['application/pdf'];
        case 'video':
          return ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
        case 'excel':
          return ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
        case 'word':
          return ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        default:
          return [];
      }
    };

    const acceptedTypes = getAcceptedTypes(column.media_type);
    
    Array.from(files).forEach(file => {
      const isValid = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type || file.name.toLowerCase().endsWith(type.split('/')[1]);
      });

      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    // Convert valid files array back to FileList-like object
    const dt = new DataTransfer();
    validFiles.forEach(file => dt.items.add(file));
    
    return { valid: dt.files, invalid: invalidFiles };
  };

  // Simplified PDF upload handler for drag-and-drop
  const handlePDFDrop = async (files: FileList, tableId: string, row: number, col: string) => {
    try {
      console.log('📄 [PDF Drop] Starting PDF upload:', { files: files.length, tableId, row, col });
      
      const file = files[0]; // Take only the first PDF
      const table = openTables.find(t => t.id === tableId);
      
      if (!table) {
        console.error('Table not found:', tableId);
        return;
      }
      
      // Show loading indicator in cell
      const loadingValue = '⏳ Carregando PDF...';
      await handleCellEdit(tableId, row, col, loadingValue);
      
      // Upload PDF to Supabase Storage
      const storedFile = await uploadFile(
        file,
        `${table.schema}_${table.name}`,
        col,
        row
      );
      
      if (storedFile && storedFile.url) {
        console.log('✅ [PDF Drop] PDF uploaded successfully:', storedFile.url);
        
        // Insert PDF URL directly into the cell
        await handleCellEdit(tableId, row, col, storedFile.url);
        
        console.log('✅ [PDF Drop] PDF URL inserted into cell');
      } else {
        console.error('❌ [PDF Drop] Failed to upload PDF');
        await handleCellEdit(tableId, row, col, '❌ Erro no upload');
        setTimeout(() => {
          handleCellEdit(tableId, row, col, null); // Clear error after 3 seconds
        }, 3000);
      }
    } catch (error) {
      console.error('❌ [PDF Drop] Error uploading PDF:', error);
      await handleCellEdit(tableId, row, col, '❌ Erro no upload');
      setTimeout(() => {
        handleCellEdit(tableId, row, col, null); // Clear error after 3 seconds
      }, 3000);
    }
  };

  // File management functions
  const handleFileUpload = async (files: FileList) => {
    try {
      // Process file upload
      
      // Use activeFileCell or fallback to lastClickedCell
      const cellToUse = activeFileCell || lastClickedCell;
      
      if (!cellToUse) {
        alert('Por favor, selecione uma célula primeiro.');
        return;
      }
      
      let { tableId, row, col } = cellToUse;
      const table = openTables.find(t => t.id === tableId);
      
      if (!table) {
          alert('Tabela não encontrada.');
        return;
      }

      // Find the target column and validate file types
      const columnForValidation = table.columns.find(c => c.column_name === col);
      if (columnForValidation && columnForValidation.media_type && columnForValidation.media_type !== 'mixed') {
        const validation = validateFileTypes(files, columnForValidation);
        
        if (validation.invalid.length > 0) {
          const mediaTypeNames = {
            'image': 'imagens (JPG, PNG, GIF, WebP, SVG)',
            'pdf': 'arquivos PDF',
            'video': 'vídeos (MP4, AVI, MOV, WMV, WebM, MKV)',
            'excel': 'planilhas (Excel, CSV)',
            'word': 'documentos (Word, TXT)'
          };
          
          alert(`Esta coluna aceita apenas ${mediaTypeNames[columnForValidation.media_type]}.\n\nArquivos rejeitados:\n${validation.invalid.join('\n')}`);
          
          if (validation.valid.length === 0) {
            return; // No valid files, abort upload
          }
        }
        
        files = validation.valid; // Use only valid files
      }
      
      // USAR COLUNA 'metadata' QUE JÁ EXISTE OU CRIAR 'arquivos'
      let targetColumn = table.columns.find(c => 
        c.column_name === 'metadata' && c.data_type?.toLowerCase().includes('json')
      );
      
      if (targetColumn) {
        col = 'metadata';
      } else {
        // Procurar qualquer coluna TEXT ou JSONB disponível
        targetColumn = table.columns.find(c => 
          (c.data_type?.toLowerCase().includes('text') || 
           c.data_type?.toLowerCase().includes('json')) &&
          !c.is_primary
        );
        
        if (targetColumn) {
          col = targetColumn.column_name;
        } else {
          // Só criar se não houver nenhuma coluna adequada
          const arquivosColumn = table.columns.find(c => c.column_name === 'arquivos');
          if (!arquivosColumn) {
            const [schema, tableName] = tableId.split('.');
            
            try {
              const response = await fetch('/api/postgres/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `ALTER TABLE ${schema}.${tableName} ADD COLUMN IF NOT EXISTS arquivos TEXT`,
                  params: []
                })
              });
              
              if (!response.ok) {
                const error = await response.text();
                alert(`Erro ao criar coluna 'arquivos': ${error}`);
                return;
              }
              
              
              // IMPORTANTE: Recarregar a página para atualizar o cache do Supabase
              alert('Coluna "arquivos" criada com sucesso!\n\nA página será recarregada para atualizar o cache.\n\nPor favor, faça o upload novamente após o reload.');
              window.location.reload();
              return; // Parar aqui, página será recarregada
            } catch (error) {
              alert(`Erro ao criar coluna 'arquivos': ${error}`);
              return;
            }
          } else {
            // Coluna 'arquivos' já existe
            col = 'arquivos';
          }
        }
      }
      
      // Continuar com o upload usando a coluna 'arquivos'
      const table2 = openTables.find(t => t.id === tableId);
      
      // Table found, proceed with upload
      
      if (!table2) {
        console.error('Table not found after column creation:', tableId);
        alert('Erro ao recarregar tabela.');
        return;
      }
      
      // Get existing files in this cell - usando sempre coluna 'arquivos'
      const cellKey = `${row}-arquivos`;
      
      const existingContent = table2?.cellContents?.get(cellKey) || {};
      const existingFiles = existingContent.files || [];
      
      // IMEDIATO: Adicionar placeholders para feedback visual instantâneo
      const placeholderFiles: FileAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        placeholderFiles.push({
          id: `uploading_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          url: '', // Vazio enquanto carrega
          thumbnailUrl: undefined,
          publicUrl: '',
          path: '',
          uploadedAt: new Date().toISOString(),
          uploading: true // Flag para mostrar que está carregando
        });
      }
      
      // Atualizar célula IMEDIATAMENTE com placeholders
      const placeholderContent: CellContent = {
        ...existingContent,
        files: [...existingFiles, ...placeholderFiles]
      };
      
      const newCellContents = new Map(table2.cellContents || new Map());
      newCellContents.set(cellKey, placeholderContent);
      
      // Atualizar visual IMEDIATAMENTE
      setOpenTables(prev => prev.map(t =>
        t.id === tableId
          ? { 
              ...t, 
              cellContents: newCellContents,
              hasUnsavedChanges: true 
            }
          : t
      ));
      
      // Agora fazer upload em background
      const newFiles: FileAttachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const placeholderId = placeholderFiles[i].id;
        
        try {
          // Validate and fix row ID before upload
          let validRowId: string | number = row;
          const rowIndex = row; // Store the original row index
          
          // Check if row is a valid number or index
          if (typeof row === 'string' && (row === 'id' || row === 'url_id' || isNaN(Number(row)))) {
            console.warn(`[handleFileUpload] Invalid row ID: "${row}", using index instead`);
            validRowId = rowIndex; // Use the actual row index
          } else if (typeof row === 'number') {
            validRowId = row;
          } else {
            validRowId = String(row);
          }
          
          
          // Upload to Supabase Storage - SEMPRE usar coluna 'arquivos'
          const storedFile = await uploadFile(
            file,
            `${table2.schema}_${table2.name}`, // Table name
            'arquivos', // SEMPRE usar coluna 'arquivos'
            validRowId // Valid Row ID
          );
          
          if (!storedFile || !storedFile.id) {
            console.error(`Failed to upload file or get file ID: ${file.name}`);
            // Remover placeholder em caso de erro
            setOpenTables(prev => prev.map(t => {
              if (t.id === tableId) {
                const content = t.cellContents?.get(cellKey) || {};
                const updatedFiles = (content.files || []).filter(f => f.id !== placeholderId);
                const updatedContent = { ...content, files: updatedFiles };
                const updatedContents = new Map(t.cellContents || new Map());
                updatedContents.set(cellKey, updatedContent);
                return { ...t, cellContents: updatedContents };
              }
              return t;
            }));
            alert(`Falha ao enviar arquivo: ${file.name}`);
            continue;
          }
          
          // File uploaded successfully
          
          // Validate stored file has all required properties
          if (!storedFile.id || !storedFile.url) {
            console.error('[handleFileUpload] StoredFile missing critical properties:', storedFile);
            // Remover placeholder em caso de erro
            setOpenTables(prev => prev.map(t => {
              if (t.id === tableId) {
                const content = t.cellContents?.get(cellKey) || {};
                const updatedFiles = (content.files || []).filter(f => f.id !== placeholderId);
                const updatedContent = { ...content, files: updatedFiles };
                const updatedContents = new Map(t.cellContents || new Map());
                updatedContents.set(cellKey, updatedContent);
                return { ...t, cellContents: updatedContents };
              }
              return t;
            }));
            alert(`Arquivo ${file.name} foi enviado mas dados incompletos foram retornados`);
            continue;
          }
          
          // Create file attachment object with Supabase Storage data - with validation
          const attachment: FileAttachment = {
            id: storedFile.id,
            name: storedFile.name || file.name,
            size: storedFile.size || file.size,
            mimeType: storedFile.mimeType || file.type || 'application/octet-stream',
            url: storedFile.url || storedFile.publicUrl,
            thumbnailUrl: storedFile.thumbnailUrl || null,
            publicUrl: storedFile.publicUrl || storedFile.url,
            path: storedFile.path || '',
            uploadedAt: storedFile.uploadedAt || new Date().toISOString()
          };
          
          // Final validation before adding
          if (!attachment.id || !attachment.url) {
            console.error('[handleFileUpload] Attachment validation failed:', attachment);
            // Remover placeholder em caso de erro
            setOpenTables(prev => prev.map(t => {
              if (t.id === tableId) {
                const content = t.cellContents?.get(cellKey) || {};
                const updatedFiles = (content.files || []).filter(f => f.id !== placeholderId);
                const updatedContent = { ...content, files: updatedFiles };
                const updatedContents = new Map(t.cellContents || new Map());
                updatedContents.set(cellKey, updatedContent);
                return { ...t, cellContents: updatedContents };
              }
              return t;
            }));
            continue;
          }
          
          // SUBSTITUIR placeholder pelo arquivo real
          setOpenTables(prev => prev.map(t => {
            if (t.id === tableId) {
              const content = t.cellContents?.get(cellKey) || {};
              // Substituir o placeholder pelo arquivo real
              const updatedFiles = (content.files || []).map(f => 
                f.id === placeholderId ? attachment : f
              );
              const updatedContent = { ...content, files: updatedFiles };
              const updatedContents = new Map(t.cellContents || new Map());
              updatedContents.set(cellKey, updatedContent);
              return { ...t, cellContents: updatedContents };
            }
            return t;
          }));
          
          newFiles.push(attachment);
        } catch (uploadError) {
          console.error(`Error uploading file ${file.name}:`, uploadError);
          // Remover placeholder em caso de erro
          setOpenTables(prev => prev.map(t => {
            if (t.id === tableId) {
              const content = t.cellContents?.get(cellKey) || {};
              const updatedFiles = (content.files || []).filter(f => f.id !== placeholderId);
              const updatedContent = { ...content, files: updatedFiles };
              const updatedContents = new Map(t.cellContents || new Map());
              updatedContents.set(cellKey, updatedContent);
              return { ...t, cellContents: updatedContents };
            }
            return t;
          }));
          alert(`Erro ao enviar arquivo ${file.name}: ${uploadError.message}`);
        }
      }
    
    // Atualizar dados da tabela para persistência
    // CORREÇÃO: Usar newFiles (arquivos reais) ao invés de finalFiles (placeholders antigos)
    const updatedContent: CellContent = {
      ...existingContent,
      files: [...existingFiles, ...newFiles] // Usar arquivos REAIS que foram enviados
    };
    
    
    const updatedCellContents = new Map(table2.cellContents || new Map());
    updatedCellContents.set(cellKey, updatedContent);
    
    // Also update the actual data with JSON string of file info
    // This is what will be saved to the database - include full structure
    const fileUrls = updatedContent.files?.map(f => ({
      id: f.id, // Include proper ID
      url: f.url,
      publicUrl: f.publicUrl,
      name: f.name,
      type: f.mimeType,
      mimeType: f.mimeType,
      size: f.size,
      path: f.path,
      thumbnailUrl: f.thumbnailUrl,
      uploadedAt: f.uploadedAt
    }));
    
    const newData = [...table2.data];
    newData[row] = { 
      ...newData[row], 
      arquivos: fileUrls && fileUrls.length > 0 ? JSON.stringify(fileUrls) : null // SEMPRE usar coluna 'arquivos'
    };
    
    setOpenTables(prev => prev.map(t =>
      t.id === tableId
        ? { 
            ...t, 
            cellContents: updatedCellContents, 
            data: newData,
            hasUnsavedChanges: true 
          }
        : t
    ));
    
    // AUTOSAVE IMEDIATO DOS ARQUIVOS!
    // SEMPRE usar coluna 'arquivos'
    const fileUrlsJson = newData[row]['arquivos']; // Sempre coluna 'arquivos'
    
    if (fileUrlsJson) {
      
      // Salvar imediatamente no banco - SEMPRE na coluna 'arquivos'
      await handleCellEdit(tableId, row, 'arquivos', fileUrlsJson);
      
      // IMPORTANTE: NÃO recarregar dados imediatamente!
      // Os dados locais já estão corretos em cellContents
      // O reload estava apagando os arquivos!
      
      // Apenas marcar como salvo
      setOpenTables(prev => prev.map(t =>
        t.id === tableId
          ? { ...t, hasUnsavedChanges: false }
          : t
      ));
      
      
      // LIMPAR CACHE para forçar reload com dados novos ao reabrir!
      dataCache.current = {};
    }
    
    setShowFileUploader(false);
    setActiveFileCell(null);
    
  } catch (error) {
    console.error('Error in handleFileUpload:', error);
    alert(`Erro ao processar arquivos: ${error.message}`);
  }
};
  
  const handleRemoveFile = async (tableId: string, row: number, col: string, fileId: string) => {
    const table = openTables.find(t => t.id === tableId);
    if (!table) return;
    
    const cellKey = `${row}-${col}`;
    const content = table.cellContents?.get(cellKey);
    if (!content?.files) return;
    
    // Find the file to delete
    const fileToDelete = content.files.find(f => f.id === fileId);
    if (fileToDelete && fileToDelete.path) {
      // Delete from Supabase Storage and database
      await deleteFile(fileToDelete.path, fileToDelete.id);
      // Also delete thumbnail if it exists
      if (fileToDelete.thumbnailUrl && fileToDelete.thumbnailUrl !== fileToDelete.publicUrl) {
        const thumbPath = fileToDelete.path.replace(fileToDelete.name, `thumb_${fileToDelete.name}`);
        await deleteFile(thumbPath); // Thumbnail doesn't need database deletion
      }
    }
    
    const updatedFiles = content.files.filter(f => f.id !== fileId);
    const updatedContent: CellContent = {
      ...content,
      files: updatedFiles
    };
    
    const deleteCellContents = new Map(table.cellContents || new Map());
    if (updatedFiles.length === 0 && !updatedContent.text) {
      deleteCellContents.delete(cellKey);
    } else {
      deleteCellContents.set(cellKey, updatedContent);
    }
    
    setOpenTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, cellContents: deleteCellContents, hasUnsavedChanges: true }
        : t
    ));
  };
  
  const handleViewFile = (file: FileAttachment) => {
    setViewingFile(file);
  };
  
  // Relationship drag handlers
  const handleColumnDragStart = (e: React.MouseEvent, tableId: string, columnName: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setIsDraggingRelationship(true);
    setDragRelationship({
      fromTable: tableId,
      fromColumn: columnName,
      fromPos: { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      },
      currentPos: { x: e.clientX, y: e.clientY }
    });
  };
  
  const handleColumnDragEnd = (e: React.MouseEvent, tableId: string, columnName: string) => {
    if (!isDraggingRelationship || !dragRelationship) return;
    
    // Se estamos soltando em uma coluna diferente
    if (dragRelationship.fromTable !== tableId || dragRelationship.fromColumn !== columnName) {
      setPendingRelationship({
        fromTable: dragRelationship.fromTable,
        fromColumn: dragRelationship.fromColumn,
        toTable: tableId,
        toColumn: columnName
      });
      
      // Mostrar menu de tipo de relacionamento
      setRelTypeMenuPos({ x: e.clientX, y: e.clientY });
      setShowRelTypeMenu(true);
    }
    
    setIsDraggingRelationship(false);
    setDragRelationship(null);
  };
  
  const createRelationshipFromDrag = (type: '1:1' | '1:N' | 'N:N') => {
    if (!pendingRelationship) return;
    
    const color = getModulePrimaryColor(openTables.find(t => t.id === pendingRelationship.fromTable)?.schema || 'public');
    
    const newRel: TableRelationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID mais único
      fromTable: pendingRelationship.fromTable,
      fromColumn: pendingRelationship.fromColumn,
      toTable: pendingRelationship.toTable,
      toColumn: pendingRelationship.toColumn,
      type,
      color,
      isActive: true
    };
    
    // Garantir que não há relacionamentos sem ID
    setRelationships(prev => [...prev.filter(r => r && r.id), newRel]);
    setShowRelTypeMenu(false);
    setPendingRelationship(null);
    
    // Save to database
    saveRelationshipToDB(newRel);
  };

  // Column resize handlers removed - fixed column widths
  
  // Save relationship to database
  const saveRelationshipToDB = async (relationship: TableRelationship) => {
    try {
      const [fromSchema, fromTable] = relationship.fromTable.split('.');
      const [toSchema, toTable] = relationship.toTable.split('.');
      
      const response = await fetch('/api/postgres/relationships/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromSchema,
          fromTable,
          fromColumn: relationship.fromColumn,
          toSchema,
          toTable,
          toColumn: relationship.toColumn,
          relationshipType: relationship.type,
          color: relationship.color
        })
      });

      if (!response.ok) {
        console.error('Failed to save relationship:', await response.text());
      } else {
      }
    } catch (error) {
      console.error('Error saving relationship:', error);
    }
  };

  // Load relationships from database
  const loadRelationshipsFromDB = async () => {
    try {
      const tableNames = openTables.filter(t => t && t.id).map(t => t.id);
      const schemas = [...new Set(openTables.filter(t => t && t.schema).map(t => t.schema))];
      
      const params = new URLSearchParams();
      tableNames.forEach(table => params.append('tables', table));
      schemas.forEach(schema => params.append('schemas', schema));
      
      const response = await fetch(`/api/postgres/relationships/load?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.relationships) {
          setRelationships(prev => {
            // Merge with existing relationships, avoiding duplicates
            const existingIds = new Set(prev.map(r => r.id));
            const newRels = data.relationships.filter((r: any) => !existingIds.has(r.id));
            return [...prev.filter(r => r && r.id), ...newRels];
          });
        }
      }
    } catch (error) {
      console.error('Error loading relationships:', error);
    }
  };

  // Delete relationship from database
  const deleteRelationshipFromDB = async (relationshipId: string) => {
    try {
      const response = await fetch(`/api/postgres/relationships/${relationshipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        console.error('Failed to delete relationship:', await response.text());
      } else {
      }
    } catch (error) {
      console.error('Error deleting relationship:', error);
    }
  };
  
  // Formula mode functions
  const handleFormulaMode = () => {
    if (!openTables.length) {
      alert('Abra uma tabela primeiro para usar fórmulas');
      return;
    }
    
    setIsFormulaMode(true);
    setFormulaText('');
    setFormulaSelectedCells([]);
    setShowFormulaHelper(true);
    setSelectedFormula('');
    setFormulaStep(0);
    
    // Set first selected cell as target
    if (openTables.length > 0) {
      const firstTable = openTables[0];
      const selectionObj = tableSelections.get(firstTable.id);
      if (selectionObj) {
        const selected = selectionObj.getSelectedCells(
          firstTable.columns.map(c => c.column_name),
          firstTable.data.length
        );
        if (selected.length > 0) {
          const { row, col } = selected[0];
          setFormulaTargetCell({
            tableId: firstTable.id,
            row,
            col
          });
        }
      }
    }
  };
  
  const closeFormulaHelper = () => {
    setShowFormulaHelper(false);
    setIsFormulaMode(false);
    setFormulaTargetCell(null);
    setSelectedFormula('');
    setFormulaStep(0);
    setFormulaText('');
    setFormulaSelectedCells([]);
  };
  
  // Formula window drag handlers
  const handleFormulaWindowMouseDown = (e: React.MouseEvent) => {
    if (isFormulaWindowMaximized) return;
    
    const windowElement = e.currentTarget.parentElement?.parentElement as HTMLElement;
    if (windowElement) {
      const rect = windowElement.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDraggingFormulaWindow(true);
      e.preventDefault();
    }
  };
  
  // Handle formula window maximization
  const toggleFormulaWindowMaximize = () => {
    setIsFormulaWindowMaximized(!isFormulaWindowMaximized);
    if (!isFormulaWindowMaximized) {
      setFormulaWindowPos({ x: 0, y: 0 });
    } else {
      setFormulaWindowPos({ 
        x: window.innerWidth / 2 - 450, 
        y: window.innerHeight / 2 - 300 
      });
    }
  };
  
  // Mouse move and mouse up handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingFormulaWindow && !isFormulaWindowMaximized) {
        requestAnimationFrame(() => {
          setFormulaWindowPos({
            x: Math.max(0, Math.min(window.innerWidth - 900, e.clientX - dragOffset.x)),
            y: Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y))
          });
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingFormulaWindow(false);
    };
    
    if (isDraggingFormulaWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Adicionar cursor grabbing no body
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isDraggingFormulaWindow, dragOffset, isFormulaWindowMaximized]);

  const selectFormulaType = (formulaName: string) => {
    setSelectedFormula(formulaName);
    
    // Aplicar fórmula completa com parênteses
    let formulaTemplate = '';
    switch(formulaName) {
      case 'SOMA':
      case 'MÉDIA':
      case 'MÁXIMO':
      case 'MÍNIMO':
      case 'CONT.NÚM':
      case 'CONT.VALORES':
        formulaTemplate = `=${formulaName}()`;
        break;
      case 'SE':
        formulaTemplate = `=${formulaName}(;"";"")`; 
        break;
      case 'PROCV':
        formulaTemplate = `=${formulaName}(;;2;FALSO)`;
        break;
      case 'CONCATENAR':
        formulaTemplate = `=${formulaName}(;)`;
        break;
      case 'HOJE':
        formulaTemplate = `=${formulaName}()`;
        break;
      default:
        formulaTemplate = `=${formulaName}()`;
    }
    
    setFormulaText(formulaTemplate);
    setFormulaStep(1);
    setShowFormulaHelper(false);
    
    // Posicionar cursor dentro dos parênteses
    setTimeout(() => {
      if (formulaInputRef.current) {
        formulaInputRef.current.focus();
        // Posicionar cursor antes do fechamento do parêntese
        const cursorPos = formulaTemplate.indexOf('(') + 1;
        formulaInputRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }, 100);
  };

  const cancelFormulaMode = () => {
    setIsFormulaMode(false);
    setFormulaText('');
    setFormulaSelectedCells([]);
    setFormulaTargetCell(null);
  };

  // Helper function to update column types
  const updateColumnTypes = (mediaType: string | null, dataType: string) => {
    if (!columnEditMenu) return;
    
    const updatedTables = openTables.map(table => {
      // Clone the table
      const updatedTable = { ...table };
      
      // Check if any columns need updating
      let columnsUpdated = false;
      
      if (table.columns) {
        updatedTable.columns = table.columns.map((col, index) => {
          // Check if this column is selected using the new ColumnManager
          const columnId = ColumnManager.createColumnId(table, col, index);
          const columnKey = ColumnManager.createKey(columnId);
          
          if (columnEditMenu.columns.includes(columnKey)) {
            columnsUpdated = true;
            // Return a new column object with updated type
            return {
              ...col,
              media_type: mediaType,
              data_type: dataType
            };
          }
          
          return col;
        });
      }
      
      return columnsUpdated ? updatedTable : table;
    });
    
    setOpenTables(updatedTables);
    setColumnEditMenu(null);
  };

  const applyFormula = () => {
    if (!formulaTargetCell || !formulaText) return;
    
    // Parse and apply formula
    const table = openTables.find(t => t.id === formulaTargetCell.tableId);
    if (!table) return;
    
    // Simple formula evaluation (can be expanded)
    let result = formulaText;
    
    // Replace cell references with values
    if (formulaText.startsWith('=')) {
      result = evaluateFormula(formulaText.substring(1), table);
    }
    
    // Update cell value
    const updatedData = [...table.data];
    updatedData[formulaTargetCell.row][formulaTargetCell.col] = result;
    
    setOpenTables(prev => prev.map(t => 
      t.id === table.id 
        ? { ...t, data: updatedData, hasUnsavedChanges: true }
        : t
    ));
    
    cancelFormulaMode();
  };

  const evaluateFormula = (formula: string, table: OpenTable): string => {
    // Simple formula evaluation - can be expanded with a proper parser
    let result = formula;
    
    // Replace cell references (A1, B2, etc.) with actual values
    const cellRegex = /([A-Z]+)(\d+)/g;
    result = result.replace(cellRegex, (match, col, row) => {
      const rowIndex = parseInt(row) - 1;
      const colName = col.toLowerCase();
      const value = table.data[rowIndex]?.[colName] || 0;
      return String(value);
    });
    
    // Simple math evaluation (be careful with eval in production!)
    try {
      // For demo purposes - in production use a proper expression parser
      result = String(Function('"use strict"; return (' + result + ')')());
    } catch (e) {
      console.error('Formula evaluation error:', e);
      result = '#ERROR';
    }
    
    return result;
  };

  const handleFormulaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFormula();
    } else if (e.key === 'Escape') {
      cancelFormulaMode();
    }
  };

  const handleFormulaCellClick = (tableId: string, row: number, col: string) => {
    if (!isFormulaMode) return;
    
    // Add cell reference to formula
    const cellRef = `${col.toUpperCase()}${row + 1}`;
    
    setFormulaText(prev => {
      // Se a fórmula tem parênteses, inserir dentro deles
      if (prev.includes('()')) {
        // Inserir primeira célula dentro dos parênteses vazios
        return prev.replace('()', `(${cellRef})`);
      } else if (prev.includes('(') && prev.includes(')')) {
        // Já tem conteúdo nos parênteses
        const openParen = prev.lastIndexOf('(');
        const closeParen = prev.indexOf(')', openParen);
        
        if (closeParen > openParen) {
          const beforeParen = prev.substring(0, closeParen);
          const afterParen = prev.substring(closeParen);
          
          // Verificar se já tem conteúdo
          const content = prev.substring(openParen + 1, closeParen).trim();
          if (content) {
            // Adicionar com separador apropriado
            if (selectedFormula === 'CONCATENAR') {
              return beforeParen + ';' + cellRef + afterParen;
            } else if (content.endsWith(':')) {
              // Completar range
              return beforeParen + cellRef + afterParen;
            } else if (!content.endsWith(';') && !content.endsWith(':')) {
              // Adicionar range ou próximo argumento
              return beforeParen + ':' + cellRef + afterParen;
            } else {
              return beforeParen + cellRef + afterParen;
            }
          } else {
            return beforeParen + cellRef + afterParen;
          }
        }
      }
      
      // Fallback para fórmulas simples
      if (prev.endsWith('=') || prev.endsWith('+') || prev.endsWith('-') || 
          prev.endsWith('*') || prev.endsWith('/') || prev.endsWith('(')) {
        return prev + cellRef;
      }
      return prev + '+' + cellRef;
    });
    
    // Track selected cells for highlighting
    setFormulaSelectedCells(prev => [...prev, cellRef]);
    
    // Keep focus on formula input and position cursor
    setTimeout(() => {
      if (formulaInputRef.current) {
        formulaInputRef.current.focus();
        // Posicionar cursor dentro dos parênteses, após o conteúdo inserido
        const text = formulaInputRef.current.value;
        const closeParen = text.indexOf(')');
        if (closeParen > -1) {
          formulaInputRef.current.setSelectionRange(closeParen, closeParen);
        } else {
          formulaInputRef.current.setSelectionRange(text.length, text.length);
        }
      }
    }, 10);
  };

  // Update mouse position during drag
  useEffect(() => {
    if (!isDraggingRelationship) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setDragRelationship(prev => 
        prev ? { ...prev, currentPos: { x: e.clientX, y: e.clientY } } : null
      );
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      // Verificar se estamos sobre uma coluna
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const th = element?.closest('th[data-column-name]');
      
      if (th && dragRelationship) {
        const tableId = th.getAttribute('data-table-id');
        const columnName = th.getAttribute('data-column-name');
        
        if (tableId && columnName && 
            (dragRelationship.fromTable !== tableId || dragRelationship.fromColumn !== columnName)) {
          setPendingRelationship({
            fromTable: dragRelationship.fromTable,
            fromColumn: dragRelationship.fromColumn,
            toTable: tableId,
            toColumn: columnName
          });
          
          setRelTypeMenuPos({ x: e.clientX, y: e.clientY });
          setShowRelTypeMenu(true);
        }
      }
      
      setIsDraggingRelationship(false);
      setDragRelationship(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRelationship, dragRelationship]);
  
  // Import/Export functions
  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i]?.trim() || '';
        });
        return row;
      });
      
      // Criar nova tabela com dados importados
      alert('CSV importado com sucesso!');
    };
    input.click();
  };
  
  const handleExportCSV = () => {
    if (!activeTableId) return;
    
    const activeTable = openTables.find(t => t.id === activeTableId);
    if (!activeTable) return;
    
    // Criar CSV
    const headers = (activeTable.columns || []).map(c => c.column_name).join(',');
    const rows = (activeTable.data || []).map(row =>
      (activeTable.columns || []).map(c => row && c && c.column_name ? row[c.column_name] || '' : '').join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTable.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Função para criar nova coluna
  const createColumn = async () => {
    if (!showAddColumnDialog || !newColumnConfig.name) return;
    
    const { tableId } = showAddColumnDialog;
    const [schema, tableName] = tableId.split('.');
    
    // Construir query SQL
    let query = `ALTER TABLE ${schema}.${tableName} ADD COLUMN ${newColumnConfig.name} ${newColumnConfig.type}`;
    
    if (newColumnConfig.notNull) query += ' NOT NULL';
    if (newColumnConfig.unique) query += ' UNIQUE';
    if (newColumnConfig.defaultValue) {
      const needsQuotes = ['text', 'varchar', 'char'].includes(newColumnConfig.type.toLowerCase());
      query += ` DEFAULT ${needsQuotes ? `'${newColumnConfig.defaultValue}'` : newColumnConfig.defaultValue}`;
    }
    
    console.log('📝 Criando coluna:', query);
    
    try {
      const response = await fetch('/api/postgres/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, params: [] })
      });
      
      if (response.ok) {
        console.log('✅ Coluna criada:', newColumnConfig.name);
        
        // Atualizar estrutura local
        const newColumn = {
          column_name: newColumnConfig.name,
          data_type: newColumnConfig.type,
          is_nullable: newColumnConfig.notNull ? 'NO' : 'YES',
          column_default: newColumnConfig.defaultValue || null,
          is_primary: newColumnConfig.isPrimary || false
        };
        
        setOpenTables(prev => prev.map(t => {
          if (t.id === tableId) {
            return {
              ...t,
              columns: [...t.columns, newColumn]
            };
          }
          return t;
        }));
        
        // Fechar modal e limpar
        setShowAddColumnDialog(null);
        setNewColumnConfig({
          name: '',
          type: 'text',
          notNull: false,
          unique: false,
          isPrimary: false,
          defaultValue: ''
        });
      } else {
        const error = await response.text();
        console.error('Erro ao criar coluna:', error);
        alert('Erro ao criar coluna: ' + error);
      }
    } catch (err) {
      console.error('Erro ao criar coluna:', err);
      alert('Erro ao criar coluna');
    }
  };

  return (
    <>
      {/* Modal de adicionar coluna - popup simples */}
      {showAddColumnDialog && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#d6d6d6',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
              Adicionar Nova Coluna
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Nome da Coluna:
              </label>
              <input 
                type="text" 
                placeholder="ex: telefone"
                value={newColumnConfig.name}
                onChange={(e) => setNewColumnConfig({...newColumnConfig, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Tipo de Dados:
              </label>
              <select 
                value={newColumnConfig.type} 
                onChange={(e) => setNewColumnConfig({...newColumnConfig, type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="text">Texto</option>
                <option value="integer">Número Inteiro</option>
                <option value="numeric">Número Decimal</option>
                <option value="boolean">Sim/Não</option>
                <option value="date">Data</option>
                <option value="timestamp">Data e Hora</option>
                <option value="json">JSON</option>
                <option value="uuid">UUID</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={newColumnConfig.notNull} 
                  onChange={(e) => setNewColumnConfig({...newColumnConfig, notNull: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                Campo obrigatório (NOT NULL)
              </label>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={newColumnConfig.unique} 
                  onChange={(e) => setNewColumnConfig({...newColumnConfig, unique: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                Valores únicos (UNIQUE)
              </label>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Valor padrão (opcional):
              </label>
              <input 
                type="text" 
                placeholder="ex: 0 ou 'ativo'"
                value={newColumnConfig.defaultValue}
                onChange={(e) => setNewColumnConfig({...newColumnConfig, defaultValue: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <button 
                onClick={createColumn}
                disabled={!newColumnConfig.name}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: newColumnConfig.name ? '#0070f3' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: newColumnConfig.name ? 'pointer' : 'not-allowed'
                }}
              >
                Criar Coluna
              </button>
              <button 
                onClick={() => {
                  setShowAddColumnDialog(null);
                  setNewColumnConfig({
                    name: '',
                    type: 'text',
                    notNull: false,
                    unique: false,
                    isPrimary: false,
                    defaultValue: ''
                  });
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container principal da aplicação */}
      <div className="h-full w-full flex relative">
        {/* Estilos inline para toolbar */}
        <style>{`
        .toolbar-btn {
          padding: 4px 6px;
          border: 1px solid transparent;
          border-radius: 2px;
          background-color: transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s;
          color: #FFFFFF;
        }
        .toolbar-btn:hover {
          background-color: #606060;
          border-color: #707070;
        }
        .toolbar-btn:active {
          background-color: #707070;
        }
      `}</style>
      
      {/* Save Status Indicator - Removido para interface mais limpa */}

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
        {/* Toolbar Completa de Edição */}
        <div className="w-full">
          <div className="flex items-center gap-1">
            {/* Container com moldura para elementos principais */}
            <div className="flex items-center gap-1 px-2 py-1 bg-white/5 backdrop-blur-md border border-white/10 w-full" style={{zIndex: 10000}}>
              {/* Custom Schema Dropdown with Icons - EXACTLY like sidebar */}
              <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSchemaDropdown(!showSchemaDropdown);
                }}
                className="flex items-center gap-1.5 px-2 py-0.5 w-[238px] h-[28px] border-b border-white/5 hover:bg-white/5 transition-all text-xs rounded"
                style={{ 
                  backgroundColor: selectedSchema ? getModulePrimaryColor(selectedSchema) + '08' : 'transparent',
                  borderLeft: selectedSchema ? `3px solid ${getModulePrimaryColor(selectedSchema)}` : '3px solid transparent'
                }}
              >
                {selectedSchema ? (
                  <>
                    {(() => {
                      const SchemaIcon = getSchemaIcon(selectedSchema);
                      const schemaColor = getModulePrimaryColor(selectedSchema);
                      return <SchemaIcon size={20} color={schemaColor} />;
                    })()}
                    <span className="font-medium text-white">
                      {selectedSchema === 'ia' ? 'INTELIGÊNCIA ARTIFICIAL' :
                       selectedSchema === 'database' ? 'BASE DE DADOS' :
                       selectedSchema === 'rh' ? 'RECURSOS HUMANOS' :
                       selectedSchema.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-white" />
                    <span className="text-gray-400 font-medium">Selecione Schema(s)</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
              </button>
              
              {/* Schema Dropdown Menu */}
              {showSchemaDropdown && (
                <div className="absolute top-full mt-1 left-0 w-full bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg z-[9999] overflow-hidden">
                  {schemas
                    .filter(schema => schema.schema_name !== 'public' && schema.schema_name !== 'plataforma_core' && schema.schema_name !== 'plataforma')
                    .map((schema, index, filteredSchemas) => {
                      const schemaColor = getModulePrimaryColor(schema.schema_name);
                      const SchemaIcon = getSchemaIcon(schema.schema_name);
                      const isChecked = selectedSchemas.includes(schema.schema_name);
                      const isSecondToLast = index === filteredSchemas.length - 2;
                      return (
                        <React.Fragment key={`schema-${schema.schema_name}`}>
                        <div
                          key={schema.schema_name}
                          className="w-full px-2 py-0.5 border-b border-white/5 flex items-center gap-1.5 hover:bg-white/5 transition-all text-xs cursor-pointer"
                          style={{ 
                            backgroundColor: (selectedSchema === schema.schema_name || isChecked) ? schemaColor + '08' : 'transparent',
                            borderLeft: (selectedSchema === schema.schema_name || isChecked) ? `3px solid ${schemaColor}` : '3px solid transparent'
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedSchema(schema.schema_name);
                            loadTables(schema.schema_name);
                            if (!selectedSchemas.includes(schema.schema_name)) {
                              setSelectedSchemas([schema.schema_name]);
                            }
                            setShowSchemaDropdown(false);
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded border cursor-pointer flex items-center justify-center"
                            style={{
                              borderColor: schemaColor,
                              backgroundColor: isChecked ? schemaColor : 'transparent'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isChecked) {
                                setSelectedSchemas(prev => prev.filter(s => s !== schema.schema_name));
                              } else {
                                setSelectedSchemas(prev => [...prev, schema.schema_name]);
                              }
                            }}
                          >
                            {isChecked && (
                              <svg className="w-2 h-2" viewBox="0 0 12 12">
                                <path 
                                  d="M10 3L4.5 8.5L2 6" 
                                  stroke="white" 
                                  strokeWidth="2" 
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedSchema(schema.schema_name);
                              loadTables(schema.schema_name);
                              if (!selectedSchemas.includes(schema.schema_name)) {
                                setSelectedSchemas([schema.schema_name]);
                              }
                              setShowSchemaDropdown(false);
                            }}
                            className="flex-1 flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 py-1 px-1"
                          >
                            <SchemaIcon size={20} color={schemaColor} />
                            <span className="font-medium text-white">
                              {schema.schema_name === 'ia' ? 'INTELIGÊNCIA ARTIFICIAL' :
                               schema.schema_name === 'database' ? 'BASE DE DADOS' :
                               schema.schema_name === 'rh' ? 'RECURSOS HUMANOS' :
                               schema.schema_name.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400">({schema.table_count})</span>
                          </button>
                        </div>
                        
                        {/* Inserir botão "ABRIR SELECIONADOS" após o penúltimo schema */}
                        {isSecondToLast && selectedSchemas.length > 0 && (
                    <button
                      onClick={() => {
                        // Open selected schemas
                        selectedSchemas.forEach(schemaName => {
                          const schema = schemas.find(s => s.schema_name === schemaName);
                          if (schema) {
                            loadTables(schemaName);
                            // Open all tables from this schema
                            fetch(`/api/postgres/tables?schema=${schemaName}`)
                              .then(res => res.json())
                              .then(schemaTables => {
                                schemaTables.forEach((table: TableInfo) => openTable(table));
                              });
                          }
                        });
                        setShowSchemaDropdown(false);
                        setSelectedSchemas([]);
                      }}
                      className="w-full px-2 py-1 flex items-center gap-1.5 hover:bg-white/5 transition-all text-xs"
                      style={{ 
                        backgroundColor: '#10b981' + '08',
                        borderLeft: '3px solid #10b981'
                      }}
                    >
                            <div className="w-3 h-3" /> {/* Spacer para alinhar com checkbox */}
                            <Database className="w-4 h-4" style={{ color: '#10b981' }} />
                            <span className="font-medium text-white">ABRIR SELECIONADOS</span>
                            <span className="text-[10px] text-slate-400">({selectedSchemas.length})</span>
                          </button>
                        )}
                        
                        </React.Fragment>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Custom Table Dropdown with Icons */}
            <div className="relative">
              <button
                onClick={() => {
                  console.log('Table dropdown button clicked. Current state:', showTableDropdown, 'Selected schema:', selectedSchema, 'Tables:', tables);
                  setShowTableDropdown(!showTableDropdown);
                }}
                className="flex items-center gap-1.5 px-2 py-0.5 w-[238px] h-[28px] border-b border-white/5 hover:bg-white/5 transition-all text-xs rounded"
                disabled={!selectedSchema}
                style={{ opacity: !selectedSchema ? 0.5 : 1 }}
              >
                <Table className="w-4 h-4 text-white" />
                <span className="text-gray-400 font-medium">Selecione Tabela(s)</span>
                <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
              </button>
              {showTableDropdown && selectedSchema && (
                <div className="absolute top-full mt-1 left-0 w-full max-h-64 overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg z-[9999]">
                  {tables.length === 0 ? (
                    <div className="px-2 py-2 text-center text-gray-500 text-xs">
                      Nenhuma tabela encontrada
                    </div>
                  ) : (
                    tables.map((t) => (
                    <button
                      key={t.table_name}
                      onClick={() => {
                        console.log('Button clicked for table:', t);
                        openTable(t);
                        setShowTableDropdown(false);
                      }}
                      className="w-full px-2 py-1 flex items-center gap-1.5 hover:bg-white/5 transition-all text-xs"
                    >
                      <Table className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-white truncate" style={{ fontSize: '8px' }}>{t.table_name.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400">({t.row_count || 0})</span>
                    </button>
                  )))}
                </div>
              )}
            </div>

            {/* Mode Toggle */}
            <button 
              onClick={() => setEditMode(editMode === 'view' ? 'edit' : 'view')}
              className={`px-2 py-1 rounded-lg transition-colors text-xs font-medium ${
                editMode === 'edit' 
                  ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                  : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
              }`}
              title={editMode === 'view' ? 'Ativar modo edição' : 'Ativar modo visualização'}
            >
              {editMode === 'edit' ? '✏️ Editar' : '👁️ Visualizar'}
            </button>

            {/* File Actions */}
            <button onClick={handleSave} className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors" title="Salvar">
              <Save className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>

            {/* Edit Actions */}
            <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors disabled:opacity-30" title="Desfazer">
              <Undo className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>
            <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors disabled:opacity-30" title="Refazer">
              <Redo className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>

            {/* View Controls */}
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>

            {/* Import/Export */}
            <button onClick={handleImportCSV} className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors" title="Importar CSV">
              <Upload className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>
            <button onClick={handleExportCSV} className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors" title="Exportar CSV">
              <Download className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>

            {/* Relationships */}
            <button 
              onClick={() => setShowRelationshipBuilder(true)} 
              className="p-1 hover:bg-white/[0.075] rounded-lg transition-colors" 
              title="Relacionamentos"
            >
              <LinkIcon className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
            </button>
            <button 
              onClick={() => setShowRelationships(!showRelationships)} 
              className={`p-1 hover:bg-white/[0.075] rounded-lg transition-colors`}
              title={showRelationships ? "Ocultar Relacionamentos" : "Mostrar Relacionamentos"}
            >
              {showRelationships ? <Eye className="w-7 h-7 text-white opacity-60 hover:opacity-100" /> : <EyeOff className="w-7 h-7 text-white opacity-60 hover:opacity-100" />}
            </button>
            
              {/* Hidden Columns Menu */}
              {openTables.some(t => hiddenColumns.get(t.id)?.size > 0) && (
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const tableWithHidden = openTables.find(t => hiddenColumns.get(t.id)?.size > 0);
                      if (tableWithHidden) {
                        setShowHiddenColumnsMenu({
                          tableId: tableWithHidden.id,
                          x: rect.left,
                          y: rect.bottom + 5
                        });
                      }
                    }}
                    className={`p-1 hover:bg-white/[0.075] rounded-lg transition-colors relative`}
                    title="Mostrar colunas ocultas"
                  >
                    <Columns className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
                      {Array.from(hiddenColumns.values()).reduce((acc, set) => acc + set.size, 0)}
                    </span>
                  </button>
                </div>
              )}
            
              {/* Schema Visualizer Toggle */}
              <button 
                onClick={() => setIsSchemaView(!isSchemaView)} 
                className={`p-1 hover:bg-white/[0.075] rounded-lg transition-colors`}
                title={isSchemaView ? "Voltar para Visão Normal" : "Visualizador de Schemas"}
              >
                <Grid className="w-7 h-7 text-white opacity-60 hover:opacity-100" />
              </button>
              
              {/* Status dentro do container */}
              <div className="flex items-center gap-4 text-xs text-slate-400 ml-auto">
                {/* Indicador de Autosave - Removido para interface mais limpa */}
              </div>
            </div>
          </div>
        </div>

        {/* Formula Bar - Only show when in formula mode */}
        {isFormulaMode && (
          <div className="px-3 py-2 border-b border-cyan-500/30 flex items-center gap-2 bg-cyan-950/30">
            <div className="flex items-center gap-2">
              <FunctionSquare className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-sm text-cyan-400 font-medium">Modo Fórmula</span>
            </div>
            <input
              ref={formulaInputRef}
              type="text"
              value={formulaText}
              onChange={(e) => setFormulaText(e.target.value)}
              onKeyDown={handleFormulaKeyDown}
              placeholder="Digite a fórmula (ex: =SUM(A1:A10) ou =A1+B1*2)"
              className="flex-1 px-3 py-1.5 bg-white border border-gray-400 rounded text-sm text-black placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
              autoFocus
            />
            <button 
              onClick={applyFormula}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors">
              Aplicar
            </button>
            <button 
              onClick={cancelFormulaMode}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
              Cancelar
            </button>
            <div className="text-xs text-cyan-300 ml-2">
              💡 Clique nas células para adicionar referências
            </div>
          </div>
        )}

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ 
            cursor: isSpacePressed ? 'grab' : 'default',
            backgroundImage: 'radial-gradient(circle 1px at center, rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Relationship Canvas - only show if enabled */}
          {showRelationships && !isSchemaView && (
            <RelationshipCanvas
              relationships={relationships}
              tables={openTables.filter(t => t && t.id).map(t => ({
                id: t.id,
                position: t.position,
                size: t.size,
                columns: t.columns
              }))}
              zoom={zoom}
              pan={pan}
            />
          )}
          
          {/* Canvas content */}
          <div 
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0'
            }}
          >
            {/* Schema View Relationships - SVG style like SchemaVisualizer */}
            {showRelationships && isSchemaView && (
              <svg
                className="absolute pointer-events-none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '10000px',
                  height: '10000px',
                  overflow: 'visible',
                  zIndex: 100
                }}
              >
                {(relationships || []).filter(r => r && typeof r === 'object').map((rel, relIndex) => {
                // Dupla validação de segurança para relationships
                if (!rel || typeof rel !== 'object') {
                  return null;
                }
                
                const fromTable = openTables.find(t => t.id === rel.fromTable);
                const toTable = openTables.find(t => t.id === rel.toTable);
                
                if (!fromTable || !toTable) {
                  return null;
                }
                
                // Find the specific columns to connect
                const fromColumnIndex = fromTable.columns.findIndex(c => c.column_name === rel.fromColumn);
                const toColumnIndex = toTable.columns.findIndex(c => c.column_name === rel.toColumn);
                
                // Calculate precise connection points
                const tableWidth = isSchemaView ? 320 : fromTable.size.width;
                const tableHeaderHeight = 40;
                const rowHeight = isSchemaView ? 28 : 25;
                
                // From table connection point (right side, at specific column)
                const fromX = fromTable.position.x + tableWidth;
                const fromY = fromTable.position.y + tableHeaderHeight + (fromColumnIndex * rowHeight) + (rowHeight / 2);
                
                // To table connection point (left side, at specific column)
                const toX = toTable.position.x;
                const toY = toTable.position.y + tableHeaderHeight + (toColumnIndex * rowHeight) + (rowHeight / 2);
                
                
                // Create curved path for smooth movement
                const deltaX = toX - fromX;
                const deltaY = toY - fromY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const controlOffset = Math.min(distance * 0.3, 100);
                
                const controlPoint1X = fromX + controlOffset;
                const controlPoint1Y = fromY;
                const controlPoint2X = toX - controlOffset;
                const controlPoint2Y = toY;
                
                const pathData = `M ${fromX} ${fromY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toX} ${toY}`;
                const midX = (fromX + toX) / 2;
                const midY = (fromY + toY) / 2;
                
                // Calculate arrow angle at the end point
                const arrowAngle = Math.atan2(toY - controlPoint2Y, toX - controlPoint2X);
                const arrowLength = 10;
                
                // Arrow points
                const arrowX1 = toX - arrowLength * Math.cos(arrowAngle - Math.PI / 6);
                const arrowY1 = toY - arrowLength * Math.sin(arrowAngle - Math.PI / 6);
                const arrowX2 = toX - arrowLength * Math.cos(arrowAngle + Math.PI / 6);
                const arrowY2 = toY - arrowLength * Math.sin(arrowAngle + Math.PI / 6);
                
                // Use same color logic as RelationshipCanvas for consistency
                const isSameSchema = fromTable.schema === toTable.schema;
                const relationColor = isSameSchema ? '#06B6D4' : '#F59E0B';
                
                // Garantir que temos um ID único para a key
                const relationshipKey = rel.id || `rel_${relIndex}_${fromTable.id}_${toTable.id}`;
                
                return (
                  <g key={relationshipKey}>
                    {/* Small arrows along the path */}
                    {(() => {
                      const arrows = [];
                      const numArrows = Math.max(18, Math.floor(distance / 20)); // Triple arrow density
                      
                      for (let i = 0; i < numArrows; i++) {
                        const t = (i + 1) / (numArrows + 1);
                        
                        // Calculate point on bezier curve
                        const x = Math.pow(1-t, 3) * fromX + 
                                 3 * Math.pow(1-t, 2) * t * controlPoint1X + 
                                 3 * (1-t) * Math.pow(t, 2) * controlPoint2X + 
                                 Math.pow(t, 3) * toX;
                        const y = Math.pow(1-t, 3) * fromY + 
                                 3 * Math.pow(1-t, 2) * t * controlPoint1Y + 
                                 3 * (1-t) * Math.pow(t, 2) * controlPoint2Y + 
                                 Math.pow(t, 3) * toY;
                        
                        // Calculate tangent for arrow direction
                        const dx = 3 * Math.pow(1-t, 2) * (controlPoint1X - fromX) + 
                                  6 * (1-t) * t * (controlPoint2X - controlPoint1X) + 
                                  3 * Math.pow(t, 2) * (toX - controlPoint2X);
                        const dy = 3 * Math.pow(1-t, 2) * (controlPoint1Y - fromY) + 
                                  6 * (1-t) * t * (controlPoint2Y - controlPoint1Y) + 
                                  3 * Math.pow(t, 2) * (toY - controlPoint2Y);
                        
                        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        
                        arrows.push(
                          <polygon
                            key={i}
                            points="0,0 -8,-3 -8,3"
                            fill={relationColor}
                            transform={`translate(${x},${y}) rotate(${angle})`}
                          />
                        );
                      }
                      return arrows;
                    })()}
                    
                    {/* Circle at the start */}
                    <circle
                      cx={fromX}
                      cy={fromY}
                      r="4"
                      fill={relationColor}
                    />
                    
                    {/* Circle at the end (instead of arrow) */}
                    <circle
                      cx={toX}
                      cy={toY}
                      r="4"
                      fill={relationColor}
                    />
                    
                    {/* Relationship type label */}
                    <text
                      x={midX}
                      y={midY - 10}
                      fill={relationColor}
                      fontSize="12"
                      textAnchor="middle"
                      className="font-sans select-none"
                      style={{ 
                        pointerEvents: 'none'
                      }}
                    >
                      {rel.type || '1:N'}
                    </text>
                  </g>
                );
              }).filter(Boolean)}
              </svg>
            )}
            {/* Render open tables */}
            {openTables.filter(t => t && t.id).map((table) => {
              // Dupla verificação para garantir segurança
              if (!table || !table.id) {
                return null;
              }
              // Garantir que table.data e columns existem
              if (!table.data) {
                table.data = [];
              }
              if (!table.columns) {
                table.columns = [];
              }
              const schemaColor = getModulePrimaryColor(table.schema || selectedSchema);
              
              return (
                <div
                  key={table.id}
                  className={`absolute border border-gray-300 rounded-b-xl shadow-lg ${
                    table.isMinimized ? 'h-auto' : ''
                  } ${table.isMaximized ? 'inset-4' : ''}`}
                  style={{
                    left: table.isMaximized ? 0 : table.position.x,
                    top: table.isMaximized ? 0 : table.position.y,
                    width: table.isMaximized ? 'calc(100% - 32px)' : table.size.width,
                    height: table.isMinimized ? 'auto' : (table.isMaximized ? 'calc(100% - 32px)' : (isSchemaView ? 'auto' : table.size.height)),
                    borderColor: schemaColor + '40',
                    zIndex: table.zIndex,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Table Header */}
                  <div 
                    className="h-10 px-4 border-b border-white/10 flex items-center justify-between cursor-move rounded-t-none"
                    style={{ backgroundColor: schemaColor + '40' }}
                    onMouseDown={(e) => handleTableMouseDown(e, table.id)}
                  >
                    {/* Left side: icon and name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Table className="w-4 h-4 flex-shrink-0" style={{ color: schemaColor }} />
                      <span className="font-medium text-white truncate" style={{ fontSize: '23px' }}>{table.name}</span>
                      <span className="text-lg text-gray-400">({table.schema})</span>
                    </div>
                    {/* Window controls - same size as windows (w-5 h-5) */}
                    <div className="flex items-center space-x-3">
                      <button 
                        className="w-5 h-5 bg-red-500 rounded-full hover:bg-red-600 transition-colors" 
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTable(table.id);
                        }}
                        title="Fechar tabela"
                      />
                      <button 
                        className="w-5 h-5 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          maximizeTable(table.id);
                        }}
                        title="Maximizar/Restaurar tabela"
                      />
                    </div>
                  </div>

                  {/* Table Content */}
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                  {!table.isMinimized && (
                    isSchemaView ? (
                      // SCHEMA VIEW - Exact copy from SchemaVisualizer
                      <div className="overflow-y-visible">
                        {(table.columns || []).map((column, index) => {
                          const TypeIcon = getTypeIcon(column.data_type);
                          return (
                            <div
                              key={column.column_name}
                              className="px-4 py-2 border-b hover:bg-gray-100 flex items-center gap-2 text-sm"
                              style={{ borderBottomColor: schemaColor + '40' }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {column.is_primary && (
                                  <Key className="w-3 h-3 text-yellow-400" />
                                )}
                                {column.is_foreign && (
                                  <LinkIcon className="w-3 h-3 text-purple-400" />
                                )}
                                <TypeIcon className="w-3 h-3 text-slate-400" />
                                <span className="font-medium text-slate-200">{column.column_name}</span>
                              </div>
                              <div className="text-slate-400 uppercase" style={{ fontSize: '0.375rem', lineHeight: '0.5rem' }}>
                                {column.data_type}
                              </div>
                              {column.is_nullable === 'NO' && (
                                <div className="w-2 h-2 bg-red-400 rounded-full" title="NOT NULL" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // NORMAL VIEW - existing table grid code
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      position: 'relative'
                    }}
                    data-table-id={table.id}
                    ref={(el) => {
                      // Validação de desenvolvimento para detectar desalinhamentos
                      if (el) {
                        setTimeout(() => {
                          const thead = el.querySelector('thead tr');
                          const tbody = el.querySelector('tbody tr');
                          if (thead && tbody) {
                            const theadCells = thead.querySelectorAll('th');
                            const tbodyCells = tbody.querySelectorAll('td');
                            
                            // Verificação detalhada de alinhamento
                            let isAligned = true;
                            const alignmentDetails = [];
                            
                            // Verificar número de colunas
                            if (theadCells.length !== tbodyCells.length) {
                              isAligned = false;
                              alignmentDetails.push(`Número de colunas diferente: ${theadCells.length} cabeçalhos vs ${tbodyCells.length} células`);
                            }
                            
                            // Verificar larguras de cada coluna
                            for (let i = 0; i < Math.min(theadCells.length, tbodyCells.length); i++) {
                              const thWidth = theadCells[i].offsetWidth;
                              const tdWidth = tbodyCells[i].offsetWidth;
                              if (Math.abs(thWidth - tdWidth) > 1) { // Tolerância de 1px
                                isAligned = false;
                                alignmentDetails.push(`Coluna ${i}: largura diferente (th: ${thWidth}px, td: ${tdWidth}px)`);
                              }
                            }
                            
                            if (isAligned) {
                            } else {
                              console.error(`❌ PROBLEMA DE ALINHAMENTO na tabela ${table.id}:`, {
                                detalhes: alignmentDetails
                              });
                            }
                          }
                        }, 500); // Aumentado para garantir renderização completa
                      }
                    }}>
                      {/* Container único para scroll de toda a tabela */}
                      <div 
                        className="table-scroll-container"
                        style={{ 
                          overflowX: 'auto',
                          overflowY: 'auto',
                          width: '100%',
                          height: table.isMaximized ? 'calc(100vh - 200px)' : 'calc(100% - 40px)', // Subtrair altura do header
                          flex: 1, // Preencher todo espaço vertical disponível
                          backgroundColor: '#f5f5f5',
                          position: 'relative'
                        }}
                      >
                        {/* Tabela única com thead e tbody */}
                        <table 
                          key={formatUpdateCounter} // Forçar re-render quando formatação muda
                          data-table-id={table.id}
                          tabIndex={0}
                          style={{ 
                        width: (() => {
                          // Calcular largura total da tabela
                          let totalWidth = 0;
                          const tableColumns = getTableColumns(table);
                          
                          tableColumns.forEach(col => {
                            const colWidth = col.is_empty ? 100 : (table.columnWidths?.get(col.column_name) || 200);
                            totalWidth += colWidth;
                          });
                          
                          return `${totalWidth}px`;
                        })(),
                        minWidth: '100%', // Garantir que preencha pelo menos o container
                        tableLayout: 'auto', // Voltando para 'auto' - fixed estava causando problemas
                        borderCollapse: 'collapse',
                        fontFamily: 'Calibri, Arial, sans-serif'
                      }}>
                        <thead style={{ 
                          position: 'sticky',
                          top: 0,
                          zIndex: 20
                        }}>
                          {/* Barra combinada: nome da célula + fórmula + ferramentas compactas */}
                          <tr style={{ height: '32px', backgroundColor: '#505050' }}>
                            {/* Barra combinada - ocupando toda a largura incluindo a área da numeração */}
                            <th colSpan={getTableColumns(table).length + 1} style={{
                              backgroundColor: '#505050',
                              borderBottom: '1px solid #404040',
                              padding: '2px 4px',
                              textAlign: 'left'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                height: '28px'
                              }}>
                                {/* Nome da célula */}
                                <input
                                  type="text"
                                  value={(() => {
                                    if (selectedCells.size === 1) {
                                      const cellKey = Array.from(selectedCells)[0];
                                      const [tableId, row, col] = cellKey.split('_');
                                      if (tableId === table.id) {
                                        const columns = getTableColumns(table);
                                        const colIndex = columns.findIndex(c => c.column_name === col);
                                        let letter = '';
                                        let num = colIndex;
                                        while (num >= 0) {
                                          letter = String.fromCharCode(65 + (num % 26)) + letter;
                                          num = Math.floor(num / 26) - 1;
                                          if (num < 0) break;
                                        }
                                        return `${letter}${parseInt(row) + 1}`;
                                      }
                                    }
                                    return '';
                                  })()}
                                  readOnly
                                  style={{
                                    width: '50px',
                                    padding: '2px 4px',
                                    fontSize: '11px',
                                    border: '1px solid #606060',
                                    borderRadius: '2px',
                                    backgroundColor: '#383838',
                                    color: '#FFFFFF',
                                    textAlign: 'center'
                                  }}
                                  placeholder="A1"
                                />
                                
                                {/* fx */}
                                <button
                                  className="toolbar-btn"
                                  title="Função"
                                  style={{
                                    padding: '2px 4px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    minWidth: '24px'
                                  }}
                                >
                                  fx
                                </button>
                                
                                {/* Barra de fórmula */}
                                <input
                                  type="text"
                                  value={(() => {
                                    if (selectedCells.size === 1) {
                                      const cellKey = Array.from(selectedCells)[0];
                                      const [tableId, rowStr, col] = cellKey.split('_');
                                      if (tableId === table.id) {
                                        const row = parseInt(rowStr);
                                        const cellValue = table.data?.[row]?.[col] || '';
                                        return cellValue;
                                      }
                                    }
                                    return '';
                                  })()}
                                  onChange={(e) => {
                                    if (selectedCells.size === 1) {
                                      const cellKey = Array.from(selectedCells)[0];
                                      const [tableId, rowStr, col] = cellKey.split('_');
                                      if (tableId === table.id) {
                                        const row = parseInt(rowStr);
                                        handleCellEdit(tableId, row, col, e.target.value);
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (selectedCells.size === 1) {
                                        const cellKey = Array.from(selectedCells)[0];
                                        const [tableId, rowStr, col] = cellKey.split('_');
                                        const row = parseInt(rowStr);
                                        handleKeyboardNavigation(e as any, tableId, row, col);
                                      }
                                    }
                                  }}
                                  style={{
                                    width: '200px',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    border: '1px solid #606060',
                                    borderRadius: '2px',
                                    backgroundColor: '#383838',
                                    color: '#FFFFFF'
                                  }}
                                  placeholder={selectedCells.size === 1 ? "Valor" : "Selecione"}
                                />
                                
                                {/* Separador */}
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#707070', margin: '0 4px' }} />
                                
                                {/* Ferramentas compactas */}
                                <button 
                                  className="toolbar-btn" 
                                  title="Negrito" 
                                  style={{ padding: '2px 4px', minWidth: '20px', fontWeight: 'bold' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, bold: !current.bold });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >B</button>
                                <button 
                                  className="toolbar-btn" 
                                  title="Itálico" 
                                  style={{ padding: '2px 4px', minWidth: '20px', fontStyle: 'italic' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, italic: !current.italic });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >I</button>
                                <button 
                                  className="toolbar-btn" 
                                  title="Sublinhado" 
                                  style={{ padding: '2px 4px', minWidth: '20px', textDecoration: 'underline' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, underline: !current.underline });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >U</button>
                                
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#707070', margin: '0 2px' }} />
                                
                                <button 
                                  className="toolbar-btn" 
                                  title="Alinhar à esquerda" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, align: 'left' });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <AlignLeft className="w-3 h-3" />
                                </button>
                                <button 
                                  className="toolbar-btn" 
                                  title="Centralizar" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, align: 'center' });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <AlignCenter className="w-3 h-3" />
                                </button>
                                <button 
                                  className="toolbar-btn" 
                                  title="Alinhar à direita" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, align: 'right' });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <AlignRight className="w-3 h-3" />
                                </button>
                                
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#707070', margin: '0 2px' }} />
                                
                                <select 
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 2px',
                                    border: '1px solid #606060',
                                    borderRadius: '2px',
                                    backgroundColor: '#404040',
                                    color: '#FFFFFF',
                                    height: '20px'
                                  }}
                                  onChange={(e) => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, fontFamily: e.target.value });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <option value="Calibri">Calibri</option>
                                  <option value="Arial">Arial</option>
                                  <option value="Times New Roman">Times</option>
                                  <option value="Courier New">Courier</option>
                                </select>
                                
                                <select 
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 2px',
                                    border: '1px solid #606060',
                                    borderRadius: '2px',
                                    backgroundColor: '#404040',
                                    color: '#FFFFFF',
                                    width: '40px',
                                    height: '20px'
                                  }}
                                  onChange={(e) => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        newFormatting.set(cellKey, { ...current, fontSize: parseInt(e.target.value) });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <option value="10">10</option>
                                  <option value="11">11</option>
                                  <option value="12">12</option>
                                  <option value="14">14</option>
                                  <option value="16">16</option>
                                  <option value="18">18</option>
                                </select>
                                
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#707070', margin: '0 2px' }} />
                                
                                <button 
                                  className="toolbar-btn" 
                                  title="Cor do texto" 
                                  style={{ padding: '2px 4px', position: 'relative' }}
                                  onClick={(e) => {
                                    // Criar um input color temporário
                                    const input = document.createElement('input');
                                    input.type = 'color';
                                    input.value = '#000000';
                                    input.onchange = (ev) => {
                                      const color = (ev.target as HTMLInputElement).value;
                                      if (selectedCells.size > 0) {
                                        const newFormatting = new Map(cellFormatting);
                                        selectedCells.forEach(cellKey => {
                                          const current = newFormatting.get(cellKey) || {};
                                          newFormatting.set(cellKey, { ...current, color });
                                        });
                                        setCellFormatting(newFormatting);
                                        // Incrementar contador para forçar re-render (simples e leve)
                                        setFormatUpdateCounter(prev => prev + 1);
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Type className="w-3 h-3" />
                                </button>
                                <button 
                                  className="toolbar-btn" 
                                  title="Cor de fundo" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={(e) => {
                                    // Criar um input color temporário
                                    const input = document.createElement('input');
                                    input.type = 'color';
                                    input.value = '#FFFFFF';
                                    input.onchange = (ev) => {
                                      const bgColor = (ev.target as HTMLInputElement).value;
                                      if (selectedCells.size > 0) {
                                        const newFormatting = new Map(cellFormatting);
                                        selectedCells.forEach(cellKey => {
                                          const current = newFormatting.get(cellKey) || {};
                                          newFormatting.set(cellKey, { ...current, backgroundColor: bgColor });
                                        });
                                        setCellFormatting(newFormatting);
                                        // Incrementar contador para forçar re-render (simples e leve)
                                        setFormatUpdateCounter(prev => prev + 1);
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Paintbrush className="w-3 h-3" />
                                </button>
                                
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#707070', margin: '0 2px' }} />
                                
                                <button 
                                  className="toolbar-btn" 
                                  title="Bordas" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={() => {
                                    if (selectedCells.size > 0) {
                                      const newFormatting = new Map(cellFormatting);
                                      selectedCells.forEach(cellKey => {
                                        const current = newFormatting.get(cellKey) || {};
                                        // Toggle border
                                        const hasBorder = current.border;
                                        newFormatting.set(cellKey, { 
                                          ...current, 
                                          border: hasBorder ? undefined : '1px solid #000000' 
                                        });
                                      });
                                      setCellFormatting(newFormatting);
                                      // Incrementar contador para forçar re-render (simples e leve)
                                      setFormatUpdateCounter(prev => prev + 1);
                                    }
                                  }}
                                >
                                  <Square className="w-3 h-3" />
                                </button>
                                
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#707070', margin: '0 2px' }} />
                                
                                <button 
                                  className="toolbar-btn" 
                                  title="Soma automática" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={() => {
                                    // Calcular soma das células selecionadas
                                    if (selectedCells.size > 0) {
                                      let sum = 0;
                                      const table = openTables.find(t => t.id === Array.from(selectedCells)[0].split('_')[0]);
                                      if (table) {
                                        selectedCells.forEach(cellKey => {
                                          const [tableId, rowStr, col] = cellKey.split('_');
                                          const row = parseInt(rowStr);
                                          const value = parseFloat(table.data?.[row]?.[col]) || 0;
                                          sum += value;
                                        });
                                        alert(`Soma: ${sum}`);
                                      }
                                    }
                                  }}
                                >
                                  <Calculator className="w-3 h-3" />
                                </button>
                                <button 
                                  className="toolbar-btn" 
                                  title="Inserir função" 
                                  style={{ padding: '2px 4px' }}
                                  onClick={() => {
                                    // Abrir menu de funções
                                    if (selectedCells.size === 1) {
                                      const cellKey = Array.from(selectedCells)[0];
                                      const [tableId, rowStr, col] = cellKey.split('_');
                                      // Por enquanto, inserir uma função de exemplo
                                      const formula = prompt('Digite a fórmula (ex: =SUM(A1:A10), =AVERAGE(B1:B5))');
                                      if (formula) {
                                        handleCellEdit(tableId, parseInt(rowStr), col, formula);
                                      }
                                    } else {
                                      alert('Selecione uma única célula para inserir uma fórmula');
                                    }
                                  }}
                                >
                                  <FunctionSquare className="w-3 h-3" />
                                </button>
                              </div>
                            </th>
                          </tr>
                          
                          {/* Cabeçalho estilo Excel - COM DADOS */}
                          <tr 
                            className="table-header-row" 
                            style={{ 
                              position: 'relative'
                            }}
                          >
                            {/* Célula vazia para alinhar com números de linha */}
                            <th style={{
                              width: '20px',
                              minWidth: '20px',
                              maxWidth: '20px',
                              backgroundColor: '#606060',
                              borderRight: '1px solid #505050',
                              borderBottom: '1px solid #505050',
                              padding: 0,
                              position: 'sticky',
                              left: 0,
                              zIndex: 21,
                              textAlign: 'center'
                            }}>
                              <Database style={{ 
                                width: '12px', 
                                height: '12px', 
                                color: '#a0a0a0',
                                display: 'inline-block'
                              }} />
                            </th>
                            
                            {/* Renderizar colunas de dados + colunas vazias extras */}
                            {(() => {
                              const columns = getVisibleColumns(table);
                              return columns;
                            })().map((col, dataIndex) => {
                              // Usar largura customizada ou padrão
                              let customWidth = col.is_empty ? 100 : (table.columnWidths?.get(col.column_name) || 200);
                              let finalWidth = customWidth;
                              
                              const columnId = ColumnManager.createColumnId(table, col, dataIndex);
                              
                              return (
                              <th 
                                key={col.column_name}
                                className="text-center relative group"
                                data-table-id={columnId.tableId}
                                data-column-name={columnId.columnName}
                                data-visual-index={columnId.visualIndex}
                                data-data-index={columnId.dataIndex}
                                style={{ 
                                  backgroundColor: selectedColumns.has(ColumnManager.createKey(columnId)) ? '#0070f3' : '#d6d6d6',
                                  width: `${finalWidth}px`,
                                  minWidth: `${finalWidth}px`,
                                  maxWidth: `${finalWidth}px`,
                                  height: '28px',
                                  minHeight: '28px',
                                  maxHeight: '28px',
                                  cursor: 'default',
                                  borderRight: '1px solid #c0c0c0',
                                  borderBottom: '1px solid #c0c0c0',
                                  position: 'relative',
                                  padding: '3px 4px',
                                  fontSize: '15px',
                                  fontWeight: 'normal',
                                  color: selectedColumns.has(ColumnManager.createKey(columnId)) ? 'white' : '#333333',
                                  fontFamily: 'Calibri, Arial, sans-serif',
                                  boxSizing: 'border-box'
                                }}
                                onMouseDown={(e) => {
                                  // Alt para arrastar relacionamentos
                                  if (e.altKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleColumnDragStart(e, table.id, col.column_name);
                                    return;
                                  }
                                  
                                  // Iniciar seleção de colunas com clique e arraste
                                  e.preventDefault();
                                  const columnKey = ColumnManager.createKey(columnId);
                                  
                                  // Começar nova seleção
                                  setSelectedColumns(new Set([columnKey]));
                                  setSelectedTable(table);
                                  setIsDraggingColumnSelection(true);
                                  setColumnSelectionStart(columnKey);
                                }}
                                onMouseEnter={(e) => {
                                  // Durante arraste de seleção de colunas
                                  if (isDraggingColumnSelection && columnSelectionStart) {
                                    const columnKey = ColumnManager.createKey(columnId);
                                    const allColumns = getTableColumns(table);
                                    
                                    // Encontrar índices de início e atual
                                    const startParts = columnSelectionStart.split('::');
                                    const startColName = startParts[2];
                                    const startIndex = allColumns.findIndex(c => c.column_name === startColName);
                                    const currentIndex = allColumns.findIndex(c => c.column_name === col.column_name);
                                    
                                    if (startIndex !== -1 && currentIndex !== -1) {
                                      const newSelection = new Set<string>();
                                      const start = Math.min(startIndex, currentIndex);
                                      const end = Math.max(startIndex, currentIndex);
                                      
                                      // Adicionar todas as colunas no intervalo
                                      for (let i = start; i <= end; i++) {
                                        const targetCol = allColumns[i];
                                        const targetId = ColumnManager.createColumnId(table, targetCol, i);
                                        newSelection.add(ColumnManager.createKey(targetId));
                                      }
                                      setSelectedColumns(newSelection);
                                    }
                                  }
                                  
                                  // Visual para arraste de relacionamento
                                  if (isDraggingRelationship && dragRelationship) {
                                    e.currentTarget.style.backgroundColor = '#b0b0b0';
                                  }
                                }}
                                onMouseUp={(e) => {
                                  // Finalizar arraste de seleção
                                  if (isDraggingColumnSelection) {
                                    setIsDraggingColumnSelection(false);
                                    setColumnSelectionStart(null);
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  // Restaurar cor ao sair
                                  if (isDraggingRelationship) {
                                    const isSelected = selectedColumns.has(ColumnManager.createKey(columnId));
                                    e.currentTarget.style.backgroundColor = isSelected ? '#0070f3' : '#d6d6d6';
                                  }
                                }}
                              >
                                {/* Conteúdo simples como Excel */}
                                {col.is_empty ? (
                                  // Primeira coluna vazia mostra botão +, outras ficam vazias
                                  parseInt(col.column_name.split('_').pop() || '0') === 0 ? (
                                    <button 
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        background: 'transparent',
                                        border: '1px dashed #999',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: '#666',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f0f0f0';
                                        e.currentTarget.style.borderColor = '#666';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = '#999';
                                      }}
                                      onClick={() => {
                                        setShowAddColumnDialog({ tableId: table.id });
                                      }}
                                      title="Adicionar nova coluna"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    // Outras colunas vazias - sem conteúdo
                                    <div style={{ width: '100%', height: '100%' }} />
                                  )
                                ) : (
                                  // Para colunas de dados, mostrar ícone + nome + letra
                                  <div style={{ 
                                    width: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'flex-start', // Alinhado à esquerda
                                    gap: '0',
                                    padding: '0 2px',
                                    pointerEvents: 'none',
                                    position: 'relative' // Garantir que o conteúdo fique dentro
                                  }}>
                                    
                                    {/* Ícone do tipo de dado - mesmo espaçamento da barra */}
                                    <div style={{ 
                                      flexShrink: 0,
                                      marginLeft: '0',
                                      marginRight: '1px' // 1px depois do ícone
                                    }}>
                                      {col.is_primary && (
                                        <Key className="w-3 h-3 text-yellow-600" />
                                      )}
                                      {col.is_foreign && (
                                        <LinkIcon className="w-3 h-3 text-purple-600" />
                                      )}
                                      {!col.is_primary && !col.is_foreign && (
                                        React.createElement(getTypeIcon(col.data_type), { 
                                          className: "w-3 h-3",
                                          style: { color: '#666' }
                                        })
                                      )}
                                    </div>
                                    
                                    {/* Nome da coluna - alinhado à esquerda próximo ao ícone */}
                                    {editingColumnName?.tableId === table.id && editingColumnName?.columnName === col.column_name ? (
                                      <input
                                        type="text"
                                        defaultValue={col.column_name}
                                        className="bg-white outline-none text-left flex-1"
                                        style={{ fontSize: '16.5px', color: '#333333', marginLeft: '4px' }}
                                        autoFocus
                                        onBlur={async (e) => {
                                          const newName = e.target.value.trim();
                                          if (newName && newName !== col.column_name) {
                                            // Renomear coluna no banco
                                            const [schema, tableName] = table.id.split('.');
                                            const query = `ALTER TABLE ${schema}.${tableName} RENAME COLUMN ${col.column_name} TO ${newName}`;
                                            
                                            try {
                                              const response = await fetch('/api/postgres/query', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ query, params: [] })
                                              });
                                              
                                              if (response.ok) {
                                                console.log('✅ Coluna renomeada:', col.column_name, '→', newName);
                                                // Atualizar estrutura local
                                                setOpenTables(prev => prev.map(t => {
                                                  if (t.id === table.id) {
                                                    return {
                                                      ...t,
                                                      columns: t.columns.map(c => 
                                                        c.column_name === col.column_name 
                                                          ? { ...c, column_name: newName }
                                                          : c
                                                      )
                                                    };
                                                  }
                                                  return t;
                                                }));
                                              } else {
                                                console.error('Erro ao renomear coluna');
                                              }
                                            } catch (err) {
                                              console.error('Erro ao renomear coluna:', err);
                                            }
                                          }
                                          setEditingColumnName(null);
                                        }}
                                        onKeyDown={async (e) => {
                                          if (e.key === 'Enter') {
                                            const newName = e.currentTarget.value.trim();
                                            if (newName && newName !== col.column_name) {
                                              // Renomear coluna no banco
                                              const [schema, tableName] = table.id.split('.');
                                              const query = `ALTER TABLE ${schema}.${tableName} RENAME COLUMN ${col.column_name} TO ${newName}`;
                                              
                                              try {
                                                const response = await fetch('/api/postgres/query', {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ query, params: [] })
                                                });
                                                
                                                if (response.ok) {
                                                  console.log('✅ Coluna renomeada:', col.column_name, '→', newName);
                                                  // Atualizar estrutura local
                                                  setOpenTables(prev => prev.map(t => {
                                                    if (t.id === table.id) {
                                                      return {
                                                        ...t,
                                                        columns: t.columns.map(c => 
                                                          c.column_name === col.column_name 
                                                            ? { ...c, column_name: newName }
                                                            : c
                                                        )
                                                      };
                                                    }
                                                    return t;
                                                  }));
                                                } else {
                                                  console.error('Erro ao renomear coluna');
                                                }
                                              } catch (err) {
                                                console.error('Erro ao renomear coluna:', err);
                                              }
                                            }
                                            setEditingColumnName(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingColumnName(null);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <span 
                                        onDoubleClick={() => setEditingColumnName({ tableId: table.id, columnName: col.column_name })}
                                        style={{
                                          backgroundColor: 'transparent',
                                          color: '#333',
                                          flex: 1,
                                          cursor: 'pointer',
                                          textAlign: 'left', // Alinhado à esquerda
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          pointerEvents: 'auto',
                                          fontSize: '16.5px', // Aumentado em 50% (de 11px para 16.5px)
                                          marginLeft: '4px', // Movido 4px para a direita
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title={(() => {
                                          // Tooltip com informações da coluna
                                          const parts = [];
                                          if (col.data_type) parts.push(`Type: ${col.data_type}`);
                                          if (col.is_nullable === 'NO') parts.push('Required (NOT NULL)');
                                          if (col.column_default) parts.push(`Default: ${col.column_default}`);
                                          if (col.is_primary) parts.push('Primary Key');
                                          return parts.join('\n');
                                        })()}
                                      >
                                        {col.column_name}
                                        {/* Indicador de NOT NULL */}
                                        {col.is_nullable === 'NO' && !col.column_default && (
                                          <span style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>*</span>
                                        )}
                                        {/* Indicador de Primary Key */}
                                        {(col.is_primary || col.column_name === 'id') && (
                                          <span style={{ fontSize: '14px' }}>🔑</span>
                                        )}
                                        {/* Letra da coluna no final */}
                                        <span style={{ 
                                          marginLeft: 'auto',
                                          marginRight: '4px',
                                          fontSize: '12px',
                                          fontWeight: 'bold',
                                          color: '#666',
                                          flexShrink: 0
                                        }}>
                                          {(() => {
                                            // Gerar letra da coluna
                                            const colIndex = getTableColumns(table).findIndex(c => c.column_name === col.column_name);
                                            let label = '';
                                            let num = colIndex;
                                            while (num >= 0) {
                                              label = String.fromCharCode(65 + (num % 26)) + label;
                                              num = Math.floor(num / 26) - 1;
                                              if (num < 0) break;
                                            }
                                            return label;
                                          })()}
                                        </span>
                                      </span>
                                    )}
                                    
                                  </div>
                                )}
                                {/* Column resize handle */}
                                <div
                                  className="absolute cursor-col-resize"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleColumnResizeStart(e, table.id, col.column_name);
                                  }}
                                  style={{
                                    width: '20px',
                                    right: '-10px',
                                    top: 0,
                                    bottom: 0,
                                    height: '100%',
                                    zIndex: 9999,
                                    cursor: 'col-resize',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 112, 243, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                />
                              </th>
                              );
                            })}
                          </tr>
                          
                          {/* Segunda linha do cabeçalho - Filtros e Controles */}
                          <tr style={{ height: '32px', backgroundColor: '#f8f8f8' }}>
                            {/* Ícone de filtro na coluna de numeração */}
                            <th style={{
                              minWidth: '20px',
                              maxWidth: '20px',
                              width: '20px',
                              backgroundColor: '#606060',
                              borderRight: '1px solid #505050',
                              borderBottom: '1px solid #505050',
                              textAlign: 'center',
                              padding: '2px',
                              cursor: 'pointer'
                            }}
                            onClick={() => toggleRawDataMode(table.id)}
                            title="Alternar modo de visualização"
                            >
                              <Filter style={{ 
                                width: '12px', 
                                height: '12px', 
                                color: rawDataMode.get(table.id) ? '#4ade80' : '#a0a0a0',
                                display: 'inline-block',
                                transition: 'color 0.2s'
                              }} />
                            </th>
                            
                            {/* Filtros para cada coluna */}
                            {getTableColumns(table).map((col, idx) => {
                              const isVisible = !hiddenColumns.has(`${table.id}_${col.column_name}`);
                              if (!isVisible && !col.is_empty) return null;
                              
                              const columnWidth = table.columnWidths?.get(col.column_name) || getInitialColumnWidth(col.data_type);
                              const filter = getColumnFilter(table.id, col.column_name);
                              
                              return (
                                <th
                                  key={`filter_${col.column_name}_${idx}`}
                                  style={{
                                    minWidth: `${columnWidth}px`,
                                    maxWidth: col.is_empty ? `${columnWidth}px` : undefined,
                                    width: col.is_empty ? `${columnWidth}px` : `${columnWidth}px`,
                                    backgroundColor: '#f0f0f0',
                                    borderRight: '1px solid #c0c0c0',
                                    borderBottom: '1px solid #c0c0c0',
                                    padding: '2px',
                                    position: 'relative'
                                  }}
                                >
                                    {!col.is_empty && (
                                    <ColumnFilterControl
                                      columnName={col.column_name}
                                      columnType={col.data_type || 'TEXT'}
                                      filter={filter}
                                      onFilterChange={(newFilter) => {
                                        updateColumnFilter(table.id, col.column_name, newFilter);
                                      }}
                                      onHideColumn={(columnName) => {
                                        hideColumn(table.id, columnName);
                                      }}
                                    />
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        {/* Tbody na mesma tabela - COM VIRTUALIZAÇÃO CONDICIONAL */}
                        {(() => {
                          // Flag para ativar virtualização baseada no volume de dados
                          const USE_VIRTUALIZATION = (table.data?.length || 0) > 500; // Ativar para tabelas com mais de 500 linhas
                          const ENABLE_VIRTUALIZATION = false; // Flag mestre para habilitar/desabilitar virtualização (temporariamente desabilitada para testes)
                          
                          // FUNÇÃO PARA TRANSFORMAR DADOS EM RAW MODE
                          const transformDataForRawMode = (data: any[]) => {
                            // Se raw mode não está ativo, retorna dados normais
                            if (!rawDataMode.get(table.id)) return data;
                            
                            // Transformar TODOS os valores NULL e empty em strings visíveis
                            return data.map(row => {
                              const newRow: any = {};
                              Object.keys(row).forEach(key => {
                                const value = row[key];
                                
                                // IMPORTANTE: No PostgreSQL/Supabase, campos TEXT vazios podem vir como NULL
                                // Precisamos distinguir entre NULL real e empty string que virou NULL
                                
                                if (value === null) {
                                  // Para campos de texto, NULL pode significar empty string
                                  // Vamos mostrar como NULL/EMPTY para ser claro
                                  newRow[key] = "NULL/EMPTY";
                                } else if (value === undefined) {
                                  newRow[key] = "UNDEFINED";
                                } else if (value === '') {
                                  newRow[key] = "EMPTY";
                                } else if (typeof value === 'string' && value.length === 0) {
                                  newRow[key] = "EMPTY";
                                } else if (typeof value === 'string' && value.trim() === '') {
                                  newRow[key] = "WHITESPACE";
                                } else {
                                  // Manter valor original sem prefixo
                                  newRow[key] = value;
                                }
                              });
                              return newRow;
                            });
                          };
                          
                          if (ENABLE_VIRTUALIZATION && USE_VIRTUALIZATION) {
                            // RENDERIZAÇÃO VIRTUALIZADA - para grandes volumes
                            
                            // Aplicar filtros de dados
                            let filteredData = table.data || [];
                            const tableFilters = columnFilters.get(table.id);
                            
                            // DEBUG LOGS - Remover após testes
                            console.group('🔍 [FILTER DEBUG]', table.id);
                            console.log('Raw data count:', table.data?.length || 0);
                            console.log('Active filters:', Array.from(tableFilters?.entries() || []));
                            
                            if (tableFilters && tableFilters.size > 0) {
                              console.log('🔄 [FILTER] Starting to filter data...');
                              const originalCount = filteredData.length;
                              
                              filteredData = filteredData.filter(row => {
                                // Verificar cada filtro de coluna
                                for (const [columnName, filter] of tableFilters.entries()) {
                                  if (filter.dataFilter) {
                                    const cellValue = String(row[columnName] || '');
                                    const filterValue = filter.dataFilter.value || '';
                                    const caseSensitive = filter.dataFilter.caseSensitive || false;
                                    
                                    console.log(`🔎 [FILTER] Checking ${columnName}:`, {
                                      cellValue: cellValue.substring(0, 50), // Log apenas primeiros 50 chars
                                      filterValue,
                                      condition: filter.dataFilter.condition,
                                      caseSensitive
                                    });
                                    
                                    const compareValue = caseSensitive ? cellValue : cellValue.toLowerCase();
                                    const compareFilter = caseSensitive ? filterValue : filterValue.toLowerCase();
                                    
                                    switch (filter.dataFilter.condition) {
                                      case 'equals':
                                        if (compareValue !== compareFilter) return false;
                                        break;
                                      case 'contains':
                                        if (!compareValue.includes(compareFilter)) return false;
                                        break;
                                      case 'startsWith':
                                        if (!compareValue.startsWith(compareFilter)) return false;
                                        break;
                                      case 'endsWith':
                                        if (!compareValue.endsWith(compareFilter)) return false;
                                        break;
                                      case 'empty':
                                        if (cellValue !== '') return false;
                                        break;
                                      case 'notEmpty':
                                        if (cellValue === '') return false;
                                        break;
                                    }
                                  }
                                }
                                return true;
                              });
                              
                              console.log(`📈 [FILTER] Filtered: ${originalCount} → ${filteredData.length} rows`);
                            } else {
                              console.log('⚠️ [FILTER] No active filters, showing all data');
                            }
                            
                            // APLICAR ORDENAÇÃO após filtros
                            if (tableFilters && tableFilters.size > 0) {
                              // Encontrar colunas com sorting ativo
                              const sortingColumns = Array.from(tableFilters.entries())
                                .filter(([_, filter]) => filter.sorting?.direction)
                                .sort((a, b) => (a[1].sorting?.priority || 0) - (b[1].sorting?.priority || 0));

                              if (sortingColumns.length > 0) {
                                console.log('🔄 [SORTING] Applying sort to', filteredData.length, 'rows, columns:', 
                                  sortingColumns.map(([col, filter]) => `${col}:${filter.sorting?.direction}`));
                                
                                filteredData = filteredData.sort((rowA, rowB) => {
                                  for (const [columnName, filter] of sortingColumns) {
                                    const valueA = String(rowA[columnName] || '');
                                    const valueB = String(rowB[columnName] || '');
                                    
                                    // Detectar tipo de dados para ordenação inteligente
                                    const numA = parseFloat(valueA);
                                    const numB = parseFloat(valueB);
                                    const isNumeric = !isNaN(numA) && !isNaN(numB) && valueA.trim() !== '' && valueB.trim() !== '';
                                    
                                    let comparison = 0;
                                    if (isNumeric) {
                                      comparison = numA - numB;
                                    } else {
                                      comparison = valueA.localeCompare(valueB, 'pt-BR', { 
                                        numeric: true, 
                                        sensitivity: 'base' 
                                      });
                                    }
                                    
                                    if (comparison !== 0) {
                                      return filter.sorting!.direction === 'desc' ? -comparison : comparison;
                                    }
                                  }
                                  return 0;
                                });
                                
                                console.log('✅ [SORTING] Sort applied, first 3 rows:', 
                                  filteredData.slice(0, 3).map(row => 
                                    Object.fromEntries(sortingColumns.map(([col]) => [col, row[col]]))
                                  ));
                              }
                            }
                            
                            // APLICAR TRANSFORMAÇÃO PARA RAW MODE
                            const displayData = transformDataForRawMode(filteredData);
                            
                            console.log('Final display data count:', displayData.length);
                            console.log('Final data preview:', displayData.slice(0, 3));
                            console.groupEnd();
                            
                            return (
                              <tbody style={{ backgroundColor: 'transparent' }}>
                                <tr>
                                  <td colSpan={getVisibleColumns(table).length + 1} style={{ padding: 0 }}>
                                    <VirtualizedTableBody
                                      data={displayData}
                                      columns={getVisibleColumns(table)}
                                      tableId={table.id}
                                      width={table.width || 1200}
                                      height={400} // Altura fixa para área virtual
                                      rowHeight={table.rowHeight || 32}
                                      columnWidths={table.columnWidths || new Map()}
                                      selectedCells={selectedCells}
                                      editingCell={table.editingCell}
                                      metadata={table.metadata} // Passar metadados para formatação
                                      columnFilters={columnFilters.get(table.id)} // Passar filtros de coluna
                                      onCellEdit={handleCellEdit}
                                      onCellClick={(tableId, row, col, e) => {
                                        // Lógica de seleção de célula
                                        const cellKey = `${tableId}_${row}_${col}`;
                                        handleCellSelection(cellKey, e.ctrlKey, e.shiftKey);
                                      }}
                                      onCellDoubleClick={(tableId, row, col) => {
                                        // Entrar em modo de edição
                                        setOpenTables(prev => prev.map(t =>
                                          t.id === tableId
                                            ? { ...t, editingCell: { row, col } }
                                            : t
                                        ));
                                      }}
                                      getCellContent={(row, col) => {
                                        // Usar CellRenderer com type hints
                                        const cellValue = row[col.column_name];
                                        const columnMetadata = table.metadata ? table.metadata[col.column_name] : null;
                                        const hasFilters = columnFilters.get(table.id) && columnFilters.get(table.id)!.size > 0;
                                        
                                        // IMPORTANTE: Usar formatação do filtro se existir
                                        const columnFilter = columnFilters.get(table.id)?.get(col.column_name);
                                        const formattingType = columnFilter?.formatting?.type;
                                        
                                        // DEBUG: Verificar formatação ativa
                                        if (formattingType && formattingType !== 'text') {
                                          console.log(`💅 [FORMAT] Aplicando ${formattingType} na coluna ${col.column_name}`, {
                                            cellValue,
                                            formattingType,
                                            options: columnFilter?.formatting?.options
                                          });
                                        }
                                        const isRawMode = rawDataMode.get(table.id) || false;
                                        
                                        // DEBUG INTENSIVO para rastrear o problema
                                        if (isRawMode) {
                                          console.log(`[TABLE CANVAS DEBUG] getCellContent para ${col.column_name}:`, {
                                            cellValue,
                                            isRawMode,
                                            tableId: table.id,
                                            rawDataModeMap: rawDataMode
                                          });
                                        }
                                        
                                        // FORÇAR exibição de NULL/EMPTY quando raw mode está ativo
                                        if (isRawMode) {
                                          console.log(`[RAW MODE ATIVO] Processando célula ${col.column_name} com valor:`, cellValue);
                                          
                                          // MOSTRAR NULL E EMPTY DE FORMA ÓBVIA
                                          if (cellValue === null || cellValue === undefined) {
                                            console.log('→ Retornando NULL element');
                                            return (
                                              <div style={{
                                                backgroundColor: '#ff0000',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                padding: '2px 6px',
                                                borderRadius: '3px'
                                              }}>
                                                NULL
                                              </div>
                                            );
                                          }
                                          if (cellValue === '') {
                                            console.log('→ Retornando EMPTY element');
                                            return (
                                              <div style={{
                                                backgroundColor: '#ff8800',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                padding: '2px 6px',
                                                borderRadius: '3px'
                                              }}>
                                                EMPTY
                                              </div>
                                            );
                                          }
                                          // Valor normal sem formatação - COM FUNDO VERDE para indicar raw mode
                                          console.log('→ Retornando RAW element para valor:', cellValue);
                                          return (
                                            <span style={{ 
                                              backgroundColor: '#90EE90', 
                                              padding: '2px 4px', 
                                              borderRadius: '2px',
                                              display: 'inline-block'
                                            }}>
                                              RAW: {String(cellValue)}
                                            </span>
                                          );
                                        }
                                        
                                        // Criar metadata combinado se tiver formatação do filtro
                                        const effectiveMetadata = formattingType ? {
                                          ...columnMetadata,
                                          typeHint: formattingType,
                                          formatOptions: columnFilter?.formatting?.options || {}
                                        } : columnMetadata;
                                        
                                        return (
                                          <CellRenderer
                                            value={cellValue}
                                            columnMetadata={effectiveMetadata}
                                            showRawData={false}
                                            onPDFClick={handlePDFClick}
                                          />
                                        );
                                      }}
                                      getCellStyle={(row, col) => {
                                        // Aplicar estilos personalizados
                                        return {};
                                      }}
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            );
                          }
                          
                          // RENDERIZAÇÃO TRADICIONAL - mantida para compatibilidade e tabelas pequenas
                          // Aplicar filtros de dados TAMBÉM AQUI!
                          let filteredData = table.data || [];
                          const tableFilters = columnFilters.get(table.id);
                          
                          console.group('🔍 [FILTER DEBUG - NON-VIRTUALIZED]', table.id);
                          console.log('Raw data count:', table.data?.length || 0);
                          console.log('Active filters:', Array.from(tableFilters?.entries() || []));
                          
                          if (tableFilters && tableFilters.size > 0) {
                            console.log('🔄 [FILTER] Starting to filter data (non-virtualized)...');
                            const originalCount = filteredData.length;
                            
                            filteredData = filteredData.filter(row => {
                              // Verificar cada filtro de coluna
                              for (const [columnName, filter] of tableFilters.entries()) {
                                if (filter.dataFilter) {
                                  const cellValue = String(row[columnName] || '');
                                  const filterValue = filter.dataFilter.value || '';
                                  const caseSensitive = filter.dataFilter.caseSensitive || false;
                                  
                                  const compareValue = caseSensitive ? cellValue : cellValue.toLowerCase();
                                  const compareFilter = caseSensitive ? filterValue : filterValue.toLowerCase();
                                  
                                  switch (filter.dataFilter.condition) {
                                    case 'equals':
                                      if (compareValue !== compareFilter) return false;
                                      break;
                                    case 'contains':
                                      if (!compareValue.includes(compareFilter)) return false;
                                      break;
                                    case 'startsWith':
                                      if (!compareValue.startsWith(compareFilter)) return false;
                                      break;
                                    case 'endsWith':
                                      if (!compareValue.endsWith(compareFilter)) return false;
                                      break;
                                    case 'empty':
                                      if (cellValue !== '') return false;
                                      break;
                                    case 'notEmpty':
                                      if (cellValue === '') return false;
                                      break;
                                  }
                                }
                              }
                              return true;
                            });
                            
                            console.log(`📈 [FILTER] Filtered: ${originalCount} → ${filteredData.length} rows (non-virtualized)`);
                          } else {
                            console.log('⚠️ [FILTER] No active filters, showing all data (non-virtualized)');
                          }
                          
                          // APLICAR ORDENAÇÃO após filtros
                          if (tableFilters && tableFilters.size > 0) {
                            // Encontrar colunas com sorting ativo
                            const sortingColumns = Array.from(tableFilters.entries())
                              .filter(([_, filter]) => filter.sorting?.direction)
                              .sort((a, b) => (a[1].sorting?.priority || 0) - (b[1].sorting?.priority || 0));

                            if (sortingColumns.length > 0) {
                              console.log('🔄 [SORTING] Applying sort to', filteredData.length, 'rows (non-virtualized)');
                              
                              filteredData = filteredData.sort((rowA, rowB) => {
                                for (const [columnName, filter] of sortingColumns) {
                                  const valueA = String(rowA[columnName] || '');
                                  const valueB = String(rowB[columnName] || '');
                                  
                                  // Detectar tipo de dados para ordenação inteligente
                                  const numA = parseFloat(valueA);
                                  const numB = parseFloat(valueB);
                                  const isNumeric = !isNaN(numA) && !isNaN(numB) && valueA.trim() !== '' && valueB.trim() !== '';
                                  
                                  let comparison = 0;
                                  if (isNumeric) {
                                    comparison = numA - numB;
                                  } else {
                                    comparison = valueA.localeCompare(valueB, 'pt-BR', { 
                                      numeric: true, 
                                      sensitivity: 'base' 
                                    });
                                  }
                                  
                                  if (comparison !== 0) {
                                    return filter.sorting!.direction === 'desc' ? -comparison : comparison;
                                  }
                                }
                                return 0;
                              });
                            }
                          }
                          
                          console.groupEnd();
                          
                          // APLICAR TRANSFORMAÇÃO PARA RAW MODE
                          const displayData = transformDataForRawMode(filteredData);
                          
                          return (
                            <tbody style={{ backgroundColor: 'transparent' }}>
                              {/* Renderizar dados existentes + 20 linhas vazias para facilitar edição */}
                              {[...displayData, ...Array(20).fill({})].map((row, rowIndex) => {
                            const rowHeight = table.rowHeight || 32; // Use custom row height or default 32px
                            
                            
                            return (
                            <tr key={rowIndex} className="border-b" style={{ borderBottomColor: '#e2e8f0', height: `${rowHeight}px` }}>
                              {/* Número da linha - COM RESIZE */}
                              <th scope="row" style={{
                                width: '20px',
                                minWidth: '20px',
                                maxWidth: '20px',
                                backgroundColor: selectedRows.has(`${table.id}_${rowIndex}`) ? '#0070f3' : '#606060',
                                color: '#FFFFFF',
                                borderRight: '1px solid #505050',
                                borderBottom: '1px solid #505050',
                                textAlign: 'center',
                                fontSize: '9px',
                                fontWeight: 'normal',
                                fontFamily: 'Calibri, Arial, sans-serif',
                                padding: '2px',
                                userSelect: 'none',
                                cursor: 'pointer',
                                position: 'sticky',
                                left: 0,
                                zIndex: 10
                              }}
                              onClick={() => {
                                const rowKey = `${table.id}_${rowIndex}`;
                                const newSelectedRows = new Set<string>();
                                newSelectedRows.add(rowKey);
                                setSelectedRows(newSelectedRows);
                                
                                // Selecionar todas as células da linha
                                const newSelectedCells = new Set<string>();
                                const columns = getTableColumns(table);
                                columns.forEach(col => {
                                  newSelectedCells.add(`${table.id}_${rowIndex}_${col.column_name}`);
                                });
                                setSelectedCells(newSelectedCells);
                                setSelectedColumns(new Set());
                              }}>
                                {rowIndex + 1}
                                
                                {/* Área de resize na borda inferior */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    cursor: 'row-resize',
                                    backgroundColor: 'transparent',
                                    zIndex: 22
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsResizingRow(true);
                                    setResizingRow({
                                      tableId: table.id,
                                      startY: e.clientY,
                                      startHeight: table.rowHeight || 32
                                    });
                                  }}
                                  onMouseEnter={(e) => {
                                    // Visual feedback on hover
                                    const target = e.currentTarget as HTMLDivElement;
                                    target.style.backgroundColor = 'rgba(0, 120, 215, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    // Remove visual feedback
                                    const target = e.currentTarget as HTMLDivElement;
                                    target.style.backgroundColor = 'transparent';
                                  }}
                                />
                              </th>
                              
                              {/* Renderizar colunas de dados + colunas vazias extras */}
                              {(() => {
                                const columns = getVisibleColumns(table);
                                if (rowIndex === 0) {
                                }
                                return columns;
                              })().map((col, dataIndex) => {
                                // Usar largura customizada ou padrão
                                let customWidth = col.is_empty ? 100 : (table.columnWidths?.get(col.column_name) || 200);
                                let finalWidth = customWidth;
                                
                                const columnId = ColumnManager.createColumnId(table, col, dataIndex);
                                const allColumns = getTableColumns(table);
                                const cellBorders = getCellSelectionBorder(table.id, rowIndex, col.column_name, allColumns);
                                
                                return (
                                <td 
                                  key={col.column_name}
                                  className="text-sm cursor-cell select-none align-middle"
                                  data-table-cell="true"
                                  data-visual-index={columnId.visualIndex}
                                  data-data-index={columnId.dataIndex}
                                  data-column-name={columnId.columnName}
                                  data-table-id={table.id}
                                  data-row={rowIndex}
                                  data-col={col.column_name}
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    // DELETE: Limpar célula(s) selecionada(s)
                                    if (e.key === 'Delete' && !table.editingCell) {
                                      console.log('🔴 DELETE pressionado!');
                                      console.log('Tabela:', table.id, 'Linha:', rowIndex, 'Coluna:', col.column_name);
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      
                                      // Se esta célula está selecionada, limpar todas as selecionadas
                                      const currentCellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                      
                                      if (selectedCells.has(currentCellKey) && selectedCells.size > 1) {
                                        // Limpar todas as células selecionadas (exceto colunas de sistema)
                                        selectedCells.forEach(key => {
                                          const match = key.match(/^(.+)_(\d+)_(.+)$/);
                                          if (match) {
                                            const [, tblId, rowStr, colName] = match;
                                            const rowIdx = parseInt(rowStr);
                                            
                                            
                                            if (!isNaN(rowIdx)) {
                                              handleCellEdit(tblId, rowIdx, colName, null, true); // true = isDelete
                                            }
                                          }
                                        });
                                      } else {
                                        // Se não há seleção múltipla, limpar apenas esta célula
                                        handleCellEdit(table.id, rowIndex, col.column_name, null, true); // true = isDelete
                                      }
                                    }
                                    // BACKSPACE: Limpar e entrar em modo de edição
                                    else if (e.key === 'Backspace' && !table.editingCell) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      
                                      // Limpar conteúdo
                                      handleCellEdit(table.id, rowIndex, col.column_name, null, true); // true = isDelete (BACKSPACE também limpa)
                                      
                                      // Entrar em modo de edição
                                      setOpenTables(prev => prev.map(t =>
                                        t.id === table.id
                                          ? { ...t, editingCell: { row: rowIndex, col: col.column_name } }
                                          : t
                                      ));
                                    }
                                    // F2: Entrar em modo de edição (como Excel)
                                    else if (e.key === 'F2' && !table.editingCell) {
                                      e.preventDefault();
                                      
                                      
                                      setOpenTables(prev => prev.map(t =>
                                        t.id === table.id
                                          ? { ...t, editingCell: { row: rowIndex, col: col.column_name } }
                                          : t
                                      ));
                                    }
                                    // Tecla de letra/número: Entrar em edição e substituir conteúdo
                                    else if (!table.editingCell && /^[a-zA-Z0-9 ]$/.test(e.key)) {
                                      e.preventDefault();
                                      
                                      // Entrar em modo de edição com o caractere digitado
                                      setOpenTables(prev => prev.map(t =>
                                        t.id === table.id
                                          ? { ...t, editingCell: { row: rowIndex, col: col.column_name }, initialValue: e.key }
                                          : t
                                      ));
                                    }
                                    // Navegação por teclado (incluindo setas)
                                    else if (!table.editingCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleKeyboardNavigation(e, table.id, rowIndex, col.column_name);
                                    }
                                  }}
                                  style={{
                                    width: `${finalWidth}px`,
                                    minWidth: `${finalWidth}px`,
                                    maxWidth: `${finalWidth}px`,
                                    height: `${rowHeight}px`,
                                    backgroundColor: (() => {
                                      const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                      const formatting = cellFormatting.get(cellKey);
                                      const isSelected = selectedCells.has(cellKey);
                                      
                                      // Se a célula está selecionada, aplicar cinza claro, senão usar formatação ou branco
                                      if (isSelected && !formatting?.backgroundColor) {
                                        return '#f0f0f0'; // Cinza bem claro para células selecionadas
                                      }
                                      return formatting?.backgroundColor || '#FFFFFF';
                                    })(),
                                    ...cellBorders,
                                    padding: '2px 4px',
                                    boxSizing: 'border-box',
                                    // Removido outline - usando apenas getCellSelectionBorder para moldura externa
                                    // Aplicar formatação de texto
                                    ...(() => {
                                      const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                      const formatting = cellFormatting.get(cellKey);
                                      const styles: any = {};
                                      
                                      if (formatting) {
                                        if (formatting.bold) styles.fontWeight = 'bold';
                                        if (formatting.italic) styles.fontStyle = 'italic';
                                        if (formatting.underline) styles.textDecoration = 'underline';
                                        if (formatting.align) styles.textAlign = formatting.align;
                                        if (formatting.color) styles.color = formatting.color;
                                        if (formatting.fontSize) styles.fontSize = `${formatting.fontSize}px`;
                                        if (formatting.fontFamily) styles.fontFamily = formatting.fontFamily;
                                        if (formatting.border) styles.border = formatting.border;
                                      }
                                      
                                      return styles;
                                    })()
                                  }}
                                  onMouseDown={(e) => {
                                    
                                    // Don't handle cell clicks if clicking on file icons
                                    const target = e.target as HTMLElement;
                                    if (target.closest('[data-file-icon]')) {
                                      return;
                                    }
                                    
                                    if (isFormulaMode) {
                                      e.preventDefault();
                                      handleFormulaCellClick(table.id, rowIndex, col.column_name);
                                    } else {
                                      // NÃO entrar em modo de edição no clique simples
                                      // Apenas selecionar a célula
                                      const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                      
                                      // IMPORTANTE: Focar na célula para receber eventos de teclado
                                      const currentCell = e.currentTarget as HTMLElement;
                                      if (currentCell && currentCell.focus) {
                                        setTimeout(() => currentCell.focus(), 0);
                                      }
                                      
                                      if (e.shiftKey && cellSelectionStart) {
                                        // Shift+Click: selecionar intervalo
                                        const newSelection = new Set<string>();
                                        const columns = getTableColumns(table);
                                        
                                        const startRow = cellSelectionStart.row;
                                        const endRow = rowIndex;
                                        const startColIndex = columns.findIndex(c => c.column_name === cellSelectionStart.col);
                                        const endColIndex = columns.findIndex(c => c.column_name === col.column_name);
                                        
                                        const minRow = Math.min(startRow, endRow);
                                        const maxRow = Math.max(startRow, endRow);
                                        const minCol = Math.min(startColIndex, endColIndex);
                                        const maxCol = Math.max(startColIndex, endColIndex);
                                        
                                        for (let r = minRow; r <= maxRow; r++) {
                                          for (let c = minCol; c <= maxCol; c++) {
                                            if (columns[c]) {
                                              newSelection.add(`${table.id}_${r}_${columns[c].column_name}`);
                                            }
                                          }
                                        }
                                        setSelectedCells(newSelection);
                                      } else {
                                        // Click simples ou início de arraste
                                        setSelectedCells(new Set([cellKey]));
                                        setCellSelectionStart({tableId: table.id, row: rowIndex, col: col.column_name});
                                        setCellSelectionEnd({tableId: table.id, row: rowIndex, col: col.column_name});
                                        setIsDraggingCellSelection(true);
                                      }
                                      
                                      // Limpar seleções de linha/coluna
                                      setSelectedRows(new Set());
                                      setSelectedColumns(new Set());
                                      
                                      handleCellMouseDown(table.id, rowIndex, col.column_name, e);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    // Durante arraste de seleção
                                    if (isDraggingCellSelection && cellSelectionStart) {
                                      setCellSelectionEnd({tableId: table.id, row: rowIndex, col: col.column_name});
                                      
                                      const newSelection = new Set<string>();
                                      const columns = getTableColumns(table);
                                      
                                      const startRow = cellSelectionStart.row;
                                      const endRow = rowIndex;
                                      const startColIndex = columns.findIndex(c => c.column_name === cellSelectionStart.col);
                                      const endColIndex = columns.findIndex(c => c.column_name === col.column_name);
                                      
                                      const minRow = Math.min(startRow, endRow);
                                      const maxRow = Math.max(startRow, endRow);
                                      const minCol = Math.min(startColIndex, endColIndex);
                                      const maxCol = Math.max(startColIndex, endColIndex);
                                      
                                      for (let r = minRow; r <= maxRow; r++) {
                                        for (let c = minCol; c <= maxCol; c++) {
                                          if (columns[c]) {
                                            newSelection.add(`${table.id}_${r}_${columns[c].column_name}`);
                                          }
                                        }
                                      }
                                      setSelectedCells(newSelection);
                                    }
                                    
                                    handleCellMouseEnter(table.id, rowIndex, col.column_name);
                                  }}
                                  onMouseUp={() => handleCellMouseUp(table.id, rowIndex, col.column_name)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({
                                      x: e.clientX,
                                      y: e.clientY,
                                      tableId: table.id,
                                      rowIndex: rowIndex,
                                      columnName: col.column_name
                                    });
                                  }}
                                  onDoubleClick={() => {
                                    // Duplo clique para entrar em modo de edição (comportamento Excel)
                                    // Só permite edição se estiver em modo edit
                                    if (editMode === 'edit') {
                                      setOpenTables(prev => prev.map(t =>
                                        t.id === table.id
                                          ? { ...t, editingCell: { row: rowIndex, col: col.column_name } }
                                          : t
                                      ));
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    // Permitir drop de arquivos
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Verificar se a coluna é do tipo PDF
                                    const columnMetadata = table.metadata?.find(m => m.column_name === col.column_name);
                                    const isPdfColumn = columnMetadata?.type_hint === 'pdf';
                                    
                                    // Adicionar visual feedback diferenciado
                                    if (isPdfColumn) {
                                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                      e.currentTarget.style.outline = '2px dashed #ef4444';
                                      e.currentTarget.title = 'Solte o PDF aqui';
                                    } else {
                                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                      e.currentTarget.style.outline = '2px dashed #3b82f6';
                                      e.currentTarget.title = 'Solte o arquivo aqui';
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    // Remover visual feedback
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.outline = '';
                                    e.currentTarget.title = '';
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Remover visual feedback
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.outline = '';
                                    e.currentTarget.title = '';
                                    
                                    // Verificar se há arquivos sendo arrastados
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                      const files = Array.from(e.dataTransfer.files);
                                      
                                      // Verificar se a coluna é do tipo PDF
                                      const columnMetadata = table.metadata?.find(m => m.column_name === col.column_name);
                                      const isPdfColumn = columnMetadata?.type_hint === 'pdf';
                                      
                                      if (isPdfColumn) {
                                        // Aceitar apenas PDFs
                                        const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
                                        if (pdfFiles.length === 0) {
                                          alert('Esta coluna aceita apenas arquivos PDF');
                                          return;
                                        }
                                        
                                        // Para colunas PDF, fazer upload e inserir URL diretamente na célula
                                        const pdfFile = pdfFiles[0]; // Usar apenas o primeiro PDF
                                        
                                        // Mostrar indicador de carregamento
                                        const originalValue = table.data[rowIndex]?.[col.column_name] || '';
                                        handleCellEdit(table.id, rowIndex, col.column_name, '⏳ Carregando PDF...');
                                        
                                        try {
                                          console.log('📄 [PDF Drop] Starting upload:', { 
                                            fileName: pdfFile.name, 
                                            tableId: table.id, 
                                            rowIndex, 
                                            columnName: col.column_name 
                                          });
                                          
                                          // Upload do PDF para o Supabase
                                          const storedFile = await uploadFile(
                                            pdfFile,
                                            `${table.schema}_${table.name}`,
                                            col.column_name,
                                            rowIndex
                                          );
                                          
                                          console.log('📄 [PDF Drop] Upload result:', storedFile);
                                          
                                          if (storedFile && storedFile.publicUrl) {
                                            // Inserir URL do PDF na célula
                                            console.log('✅ [PDF Drop] Inserting URL into cell:', storedFile.publicUrl);
                                            await handleCellEdit(table.id, rowIndex, col.column_name, storedFile.publicUrl);
                                            console.log('✅ [PDF Drop] PDF URL inserted successfully');
                                          } else {
                                            console.error('❌ [PDF Drop] No public URL returned');
                                            // Restaurar valor original em caso de erro
                                            handleCellEdit(table.id, rowIndex, col.column_name, originalValue);
                                            alert('Erro ao fazer upload do PDF - URL não gerada');
                                          }
                                        } catch (error) {
                                          console.error('Erro no upload do PDF:', error);
                                          // Restaurar valor original em caso de erro
                                          handleCellEdit(table.id, rowIndex, col.column_name, originalValue);
                                          alert('Erro ao fazer upload do PDF: ' + error.message);
                                        }
                                      } else {
                                        // Para outras colunas, usar o sistema de arquivos normal
                                        setActiveFileCell({ tableId: table.id, row: rowIndex, col: col.column_name });
                                        setLastClickedCell({ tableId: table.id, row: rowIndex, col: col.column_name });
                                        await handleFileUpload(e.dataTransfer.files);
                                      }
                                    }
                                  }}
                                >
                                  {/* Renderizar input de edição quando a célula está sendo editada */}
                                  {table.editingCell?.row === rowIndex && table.editingCell?.col === col.column_name ? (
                                    // Verificar se é uma coluna PDF
                                    (() => {
                                      const columnFilter = columnFilters.get(table.id)?.get(col.column_name);
                                      const isPDFColumn = columnFilter?.formatting?.type === 'pdf';
                                      
                                      if (isPDFColumn) {
                                        // Usar editor especializado para PDF
                                        return (
                                          <PDFCellEditor
                                            value={row && col && col.column_name ? row[col.column_name]?.toString() || '' : ''}
                                            onSave={(value) => {
                                              handleCellEdit(table.id, rowIndex, col.column_name, value);
                                              // Sair do modo de edição
                                              setOpenTables(prev => prev.map(t =>
                                                t.id === table.id ? { ...t, editingCell: undefined } : t
                                              ));
                                            }}
                                            onCancel={() => {
                                              // Sair do modo de edição sem salvar
                                              setOpenTables(prev => prev.map(t =>
                                                t.id === table.id ? { ...t, editingCell: undefined } : t
                                              ));
                                            }}
                                            columnName={col.column_name}
                                            tableName={table.name}
                                          />
                                        );
                                      }
                                      
                                      // Editor padrão para outros tipos
                                      return (
                                        <input
                                          type="text"
                                          defaultValue={row && col && col.column_name ? row[col.column_name]?.toString() || '' : ''}
                                          data-cell={`${table.id}_${rowIndex}_${col.column_name}`}
                                          className="w-full bg-transparent outline-none"
                                      style={{ 
                                        // Aplicar formatação dinâmica do cellFormatting Map
                                        ...(() => {
                                          const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                          const formatting = cellFormatting.get(cellKey);
                                          return {
                                            fontSize: formatting?.fontSize ? `${formatting.fontSize}px` : '11px',
                                            fontFamily: formatting?.fontFamily || 'Calibri, Arial, sans-serif',
                                            fontWeight: formatting?.bold ? 'bold' : 'normal',
                                            fontStyle: formatting?.italic ? 'italic' : 'normal',
                                            textDecoration: formatting?.underline ? 'underline' : 'none',
                                            color: formatting?.color || '#000000',
                                            textAlign: formatting?.align || 'left',
                                            backgroundColor: formatting?.backgroundColor || 'transparent',
                                            padding: '0 2px',
                                            lineHeight: '1.4',
                                            whiteSpace: 'pre-wrap', // Preserve spaces
                                            height: '19px', // Fixed height for consistent alignment
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: formatting?.align === 'center' ? 'center' : formatting?.align === 'right' ? 'flex-end' : 'flex-start'
                                          };
                                        })()
                                      }}
                                      autoFocus
                                      onBlur={(e) => {
                                        // Salvar ao sair do campo
                                        const value = normalizeEmptyValue(e.target.value);
                                        handleCellEdit(table.id, rowIndex, col.column_name, value);
                                      }}
                                      onChange={(e) => {
                                        // AUTOSAVE: NÃO usar trim() para preservar espaços
                                        const value = e.target.value === '' ? null : e.target.value;
                                        
                                        // Atualizar localmente primeiro para UI responsiva
                                        const newData = [...table.data];
                                        if (!newData[rowIndex]) newData[rowIndex] = {};
                                        newData[rowIndex][col.column_name] = value;
                                        
                                        setOpenTables(prev => prev.map(t => 
                                          t.id === table.id ? { ...t, data: newData } : t
                                        ));
                                      }}
                                      onKeyDown={(e) => {
                                        e.stopPropagation(); // Prevent event bubbling
                                        
                                        if (e.key === 'Enter') {
                                          // ENTER: Salvar e mover para baixo (comportamento Excel)
                                          e.preventDefault();
                                          const value = normalizeEmptyValue(e.currentTarget.value);
                                          handleCellEdit(table.id, rowIndex, col.column_name, value);
                                          
                                          // Sair do modo de edição
                                          setOpenTables(prev => prev.map(t =>
                                            t.id === table.id ? { ...t, editingCell: undefined } : t
                                          ));
                                          
                                          // Mover seleção para célula abaixo
                                          const nextRow = rowIndex + 1;
                                          if (nextRow < table.data.length) {
                                            const nextCellKey = `${table.id}_${nextRow}_${col.column_name}`;
                                            setSelectedCells(new Set([nextCellKey]));
                                            
                                            // Focar na próxima célula
                                            setTimeout(() => {
                                              const nextCell = document.querySelector(`[data-table-id="${table.id}"][data-row="${nextRow}"][data-col="${col.column_name}"]`) as HTMLElement;
                                              if (nextCell) nextCell.focus();
                                            }, 50);
                                          }
                                        } else if (e.key === 'Tab') {
                                          // TAB: Salvar e mover para direita (comportamento Excel)
                                          e.preventDefault();
                                          const value = normalizeEmptyValue(e.currentTarget.value);
                                          handleCellEdit(table.id, rowIndex, col.column_name, value);
                                          
                                          // Sair do modo de edição
                                          setOpenTables(prev => prev.map(t =>
                                            t.id === table.id ? { ...t, editingCell: undefined } : t
                                          ));
                                          
                                          // Mover seleção para próxima coluna
                                          const columns = getTableColumns(table);
                                          const currentColIndex = columns.findIndex(c => c.column_name === col.column_name);
                                          const nextColIndex = e.shiftKey ? currentColIndex - 1 : currentColIndex + 1; // Shift+Tab vai para esquerda
                                          
                                          if (nextColIndex >= 0 && nextColIndex < columns.length) {
                                            const nextCol = columns[nextColIndex];
                                            const nextCellKey = `${table.id}_${rowIndex}_${nextCol.column_name}`;
                                            setSelectedCells(new Set([nextCellKey]));
                                            
                                            // Focar na próxima célula
                                            setTimeout(() => {
                                              const nextCell = document.querySelector(`[data-table-id="${table.id}"][data-row="${rowIndex}"][data-col="${nextCol.column_name}"]`) as HTMLElement;
                                              if (nextCell) nextCell.focus();
                                            }, 50);
                                          }
                                        } else if (e.key === 'Escape') {
                                          // ESC: Cancelar edição sem salvar
                                          e.preventDefault();
                                          
                                          // Restaurar valor original
                                          const originalValue = row && col && col.column_name ? row[col.column_name] : '';
                                          e.currentTarget.value = originalValue?.toString() || '';
                                          
                                          // Sair do modo de edição
                                          setOpenTables(prev => prev.map(t =>
                                            t.id === table.id ? { ...t, editingCell: undefined } : t
                                          ));
                                          
                                          // Manter foco na célula atual
                                          setTimeout(() => {
                                            const currentCell = document.querySelector(`[data-table-id="${table.id}"][data-row="${rowIndex}"][data-col="${col.column_name}"]`) as HTMLElement;
                                            if (currentCell) currentCell.focus();
                                          }, 50);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onInput={(e) => {
                                        // Allow any character including spaces
                                        e.stopPropagation();
                                      }}
                                    />
                                      );
                                    })()
                                  ) : (
                                    <div 
                                      onClick={(e) => {
                                        // Clique simples NÃO deve entrar em edição
                                        e.stopPropagation();
                                        // Apenas selecionar a célula
                                        const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                        setSelectedCells(new Set([cellKey]));
                                        setCellSelectionStart({ tableId: table.id, row: rowIndex, col: col.column_name });
                                      }}
                                      style={{ 
                                      height: '19px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      backgroundColor: 'transparent', 
                                      background: 'none',
                                      padding: '0 2px',
                                      margin: 0,
                                      border: 'none',
                                      outline: 'none',
                                      boxShadow: 'none',
                                      width: '100%',
                                      // Aplicar formatação se existir, senão usar padrões
                                      ...(() => {
                                        const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                        const formatting = cellFormatting.get(cellKey);
                                        return {
                                          fontSize: formatting?.fontSize ? `${formatting.fontSize}px` : '11px',
                                          fontFamily: formatting?.fontFamily || 'Calibri, Arial, sans-serif',
                                          fontWeight: formatting?.bold ? 'bold' : 'normal',
                                          fontStyle: formatting?.italic ? 'italic' : 'normal',
                                          textDecoration: formatting?.underline ? 'underline' : 'none',
                                          color: formatting?.color || '#000000',
                                          textAlign: formatting?.align || 'left',
                                          justifyContent: formatting?.align === 'center' ? 'center' : formatting?.align === 'right' ? 'flex-end' : 'flex-start'
                                        };
                                      })()
                                    }}>
                                      {(() => {
                                        // Para colunas vazias, apenas mostrar texto simples ou vazio
                                        if (col.is_empty) {
                                          return '';
                                        }
                                        
                                        const cellKey = `${table.id}_${rowIndex}_${col.column_name}`;
                                        const cellContentKey = `${rowIndex}-${col.column_name}`; // Manter para cellContents que usa formato diferente
                                        const cellValue = row && col && col.column_name ? row[col.column_name] : null;
                                        
                                        // PRIORIDADE 1: Verificar cellContents (memória)
                                        const cellContent = table.cellContents?.get(cellContentKey);
                                        let validFiles: FileAttachment[] = [];
                                        
                                        // Se tem files no cellContents, usar isso
                                        if (cellContent?.files && cellContent.files.length > 0) {
                                          validFiles = cellContent.files;
                                        }
                                        // PRIORIDADE 2: Se não tem no cellContents, tentar fazer parse do JSON
                                        else if (cellValue && typeof cellValue === 'string' && (cellValue.startsWith('[') || cellValue.startsWith('{'))) {
                                          try {
                                            const parsed = JSON.parse(cellValue);
                                            const fileArray = Array.isArray(parsed) ? parsed : [parsed];
                                            
                                            validFiles = fileArray
                                              .filter(f => f && (f.url || f.publicUrl))
                                              .map((f, idx) => ({
                                                id: f.id || `file_${Date.now()}_${idx}`,
                                                name: f.name || (f.id && f.id.includes('_') ? f.id.substring(f.id.indexOf('_') + 1) : 'arquivo'),
                                                url: f.url || f.publicUrl || '',
                                                mimeType: f.type || f.mimeType || 'application/octet-stream',
                                                type: f.type || f.mimeType || 'application/octet-stream',
                                                size: f.size || 0,
                                                publicUrl: f.publicUrl || f.url || '',
                                                path: f.path || '',
                                                thumbnailUrl: f.thumbnailUrl || null,
                                                uploadedAt: f.uploadedAt || new Date().toISOString()
                                              }));
                                            
                                            if (validFiles.length > 0) {
                                              // ATUALIZAR cellContents para próxima renderização
                                              const updatedContent = { ...cellContent, files: validFiles };
                                              const updatedContents = new Map(table.cellContents || new Map());
                                              updatedContents.set(cellContentKey, updatedContent);
                                              // Não atualizar estado aqui para evitar loop infinito
                                            }
                                          } catch (e) {
                                            console.error(`❌ [RENDER] Failed to parse JSON in ${cellKey}:`, e);
                                          }
                                        }
                                        
                                        // Verificações de conteúdo
                                        const hasFiles = validFiles.length > 0;
                                        // CORREÇÃO: Aceitar números também, não apenas strings
                                        const hasText = !hasFiles && cellValue !== null && cellValue !== undefined && 
                                          (typeof cellValue !== 'string' || (!cellValue.startsWith('[') && !cellValue.startsWith('{')));
                                        
                                        // Calcular tamanho do thumbnail baseado na altura da linha
                                        // Usar 80% da altura menos padding para garantir que caiba
                                        const thumbnailSize = Math.round((rowHeight || 32) * 0.8 - 4);
                                        
                                        return (
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: 'transparent',
                                            overflow: 'visible'
                                          }}>
                                            {hasFiles && (
                                              <div style={{ 
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                flexWrap: 'nowrap',
                                                height: '100%'
                                              }}>
                                                {/* Mostrar até 4 miniaturas */}
                                                {validFiles.slice(0, 4).map((file, idx) => (
                                                  <div key={file?.id || `file-${idx}`}>
                                                    {file?.uploading ? (
                                                      <div className="flex items-center justify-center" style={{ width: `${thumbnailSize}px`, height: `${thumbnailSize}px` }}>
                                                        <RefreshCw className="text-gray-500 animate-spin" style={{ width: `${thumbnailSize * 0.6}px`, height: `${thumbnailSize * 0.6}px` }} />
                                                      </div>
                                                    ) : (
                                                      <span 
                                                        className="cursor-pointer inline-block"
                                                        onClick={() => file && handleViewFile(file)}
                                                        title={file?.name || file?.id || ''}
                                                      >
                                                        {getFileIcon(file, thumbnailSize)}
                                                      </span>
                                                    )}
                                                  </div>
                                                ))}
                                                {/* Indicador de mais arquivos */}
                                                {validFiles.length > 4 && (
                                                  <div 
                                                    className="inline-flex items-center justify-center cursor-pointer"
                                                    style={{ 
                                                      width: `${thumbnailSize}px`, 
                                                      height: `${thumbnailSize}px`, 
                                                      fontSize: `${Math.max(10, thumbnailSize * 0.45)}px`, 
                                                      backgroundColor: '#f0f0f0',
                                                      borderRadius: '3px',
                                                      border: '1px solid #e0e0e0',
                                                      color: '#666666',
                                                      fontWeight: '600'
                                                    }}
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      // Abrir modal com todos os arquivos ou expandir visualização
                                                    }}
                                                    title={`Mais ${validFiles.length - 4} arquivo(s)`}
                                                  >
                                                    <span style={{ fontWeight: '500' }}>+{validFiles.length - 4}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {(!hasFiles && hasText) && (() => {
                                              const hasFilters = columnFilters.get(table.id) && columnFilters.get(table.id)!.size > 0;
                                              const columnMetadata = table.metadata ? table.metadata[col.column_name] : null;
                                              const isRawMode = rawDataMode.get(table.id) || false;
                                              
                                              // IMPORTANTE: Usar formatação do filtro se existir
                                              const columnFilter = columnFilters.get(table.id)?.get(col.column_name);
                                              const formattingType = columnFilter?.formatting?.type;
                                              
                                              // Criar metadata combinado se tiver formatação do filtro
                                              const effectiveMetadata = formattingType ? {
                                                ...columnMetadata,
                                                typeHint: formattingType,
                                                formatOptions: columnFilter?.formatting?.options || {}
                                              } : columnMetadata;
                                              
                                              return (
                                                <CellRenderer
                                                  value={cellValue}
                                                  columnMetadata={effectiveMetadata}
                                                  showRawData={isRawMode}
                                                  className="w-full"
                                                  onPDFClick={handlePDFClick}
                                                />
                                              );
                                            })()}
                                            {!hasFiles && !hasText && (
                                              <div style={{ 
                                                color: '#64748b',
                                                padding: '0 4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                minHeight: '32px',
                                                backgroundColor: 'transparent',
                                                background: 'transparent',
                                                boxShadow: 'none',
                                                border: 'none',
                                                outline: 'none'
                                              }}>
                                                {/* Empty cell */}
                                                
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </td>
                              );
                              })}
                            </tr>
                            );
                          })}
                            </tbody>
                          );
                        })()}
                      </table>
                    </div>
                    </div>
                    )
                  )}
                  </div>

                  {/* Resize Handles - só aparecem quando não está minimizada ou maximizada */}
                  {!table.isMinimized && !table.isMaximized && (
                    <>
                      {/* Corners */}
                      <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-400/30 z-50"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'top-left')}
                      />
                      <div
                        className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize hover:bg-blue-400/30 z-50"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'top-right')}
                      />
                      <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize hover:bg-blue-400/30 z-50"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'bottom-left')}
                      />
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-400/30 z-50"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'bottom-right')}
                      />
                      
                      {/* Edges */}
                      <div
                        className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize hover:bg-blue-400/20 z-40"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'top')}
                      />
                      <div
                        className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize hover:bg-blue-400/20 z-40"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'bottom')}
                      />
                      <div
                        className="absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize hover:bg-blue-400/20 z-40"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'left')}
                      />
                      <div
                        className="absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize hover:bg-blue-400/20 z-40"
                        onMouseDown={(e) => handleResizeStart(e, table.id, 'right')}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend for Schema View */}
          {isSchemaView && openTables.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-white border border-gray-300 rounded-xl p-4 z-10">
              <div className="text-sm font-medium text-white mb-2">Legenda</div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Key className="w-3 h-3 text-yellow-400" />
                  <span>Chave Primária</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span>NOT NULL</span>
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3 h-3 text-purple-400" />
                  <span>Foreign Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span>Relacionamento ({relationships.length})</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">
              {colorPickerTarget === 'background' ? 'Cor de Fundo' : 'Cor do Texto'}
            </h3>
            <button
              onClick={() => setShowColorPicker(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {[
              '#000000', '#424242', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#F5F5F5', '#FFFFFF',
              '#D32F2F', '#F44336', '#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39', '#8BC34A',
              '#4CAF50', '#009688', '#00BCD4', '#03A9F4', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0',
              '#E91E63', '#880E4F', '#4A148C', '#311B92', '#1A237E', '#0D47A1', '#01579B', '#006064',
              '#004D40', '#1B5E20', '#33691E', '#827717', '#F57F17', '#FF6F00', '#E65100', '#BF360C',
              '#3E2723', '#5D4037', '#6D4C41', '#795548', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8'
            ].map(color => (
              <button
                key={color}
                onClick={() => applyColor(color)}
                className="w-8 h-8 rounded border border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input
              type="color"
              className="w-full h-10 rounded cursor-pointer"
              onChange={(e) => applyColor(e.target.value)}
            />
            <input
              type="text"
              placeholder="#000000"
              className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  applyColor(e.target.value);
                }
              }}
            />
          </div>
        </div>
      </div>
      )}
      
      {/* Border Picker Modal */}
      {showBorderPicker && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">Configurar Bordas</h3>
            <button
              onClick={() => setShowBorderPicker(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Border Sides Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-3">Lados da Borda</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={borderSides.top}
                  onChange={(e) => setBorderSides(prev => ({ ...prev, top: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-white">Superior</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={borderSides.right}
                  onChange={(e) => setBorderSides(prev => ({ ...prev, right: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-white">Direita</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={borderSides.bottom}
                  onChange={(e) => setBorderSides(prev => ({ ...prev, bottom: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-white">Inferior</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={borderSides.left}
                  onChange={(e) => setBorderSides(prev => ({ ...prev, left: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-white">Esquerda</span>
              </label>
            </div>
          </div>
          
          {/* Border Style */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Estilo</label>
            <select
              value={borderStyle}
              onChange={(e) => setBorderStyle(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
            >
              <option value="solid">Sólida</option>
              <option value="dashed">Tracejada</option>
              <option value="dotted">Pontilhada</option>
            </select>
          </div>
          
          {/* Border Width */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Largura</label>
            <input
              type="range"
              min="1"
              max="5"
              value={borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1px</span>
              <span>{borderWidth}px</span>
              <span>5px</span>
            </div>
          </div>
          
          {/* Border Color */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Cor</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              />
            </div>
          </div>
          
          {/* Preview */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Prévia</label>
            <div className="bg-gray-800 p-8 rounded flex items-center justify-center">
              <div
                className="w-24 h-24 bg-gray-700"
                style={{
                  borderTop: borderSides.top ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
                  borderRight: borderSides.right ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
                  borderBottom: borderSides.bottom ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
                  borderLeft: borderSides.left ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none'
                }}
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowBorderPicker(false)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={applyBorders}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
      )}
      
      {/* Relationship Builder Modal */}
      {showRelationshipBuilder && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-medium text-white">Gerenciar Relacionamentos</h3>
            </div>
            <button
              onClick={() => setShowRelationshipBuilder(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Existing Relationships */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Relacionamentos Existentes</h4>
            {relationships.length === 0 ? (
              <div className="text-sm text-gray-500 italic">Nenhum relacionamento definido</div>
            ) : (
              <div className="space-y-2">
                {relationships.filter(rel => rel && rel.id).map(rel => (
                  <div key={rel.id} className="flex items-center justify-between p-3 bg-white/[0.05] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: rel.color }}
                      />
                      <span className="text-sm text-white">
                        {openTables.find(t => t.id === rel.fromTable)?.name || rel.fromTable}.{rel.fromColumn} → {openTables.find(t => t.id === rel.toTable)?.name || rel.toTable}.{rel.toColumn}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                        {rel.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRelationships(prev => prev.filter(r => r && r.id).map(r => 
                            r.id === rel.id ? { ...r, isActive: !r.isActive } : r
                          ));
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          rel.isActive 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {rel.isActive ? 'Ativo' : 'Inativo'}
                      </button>
                      <button
                        onClick={() => {
                          setRelationships(prev => prev.filter(r => r && r.id && r.id !== rel.id));
                          deleteRelationshipFromDB(rel.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Create New Relationship */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Criar Novo Relacionamento</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tabela de Origem</label>
                  <select 
                    id="fromTable"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    onChange={(e) => {
                      const tableId = e.target.value;
                      const table = openTables.find(t => t.id === tableId);
                      const fromColumnSelect = document.getElementById('fromColumn') as HTMLSelectElement;
                      if (fromColumnSelect && table && table.columns) {
                        fromColumnSelect.innerHTML = '<option value="">Selecione...</option>';
                        table.columns.forEach(col => {
                          const option = document.createElement('option');
                          option.value = col.column_name;
                          option.textContent = col.column_name;
                          if (col.is_primary) option.textContent += ' 🔑';
                          if (col.is_foreign) option.textContent += ' 🔗';
                          fromColumnSelect.appendChild(option);
                        });
                      }
                    }}
                  >
                    <option value="">Selecione...</option>
                    {openTables.filter(t => t && t.id).map(t => (
                      <option key={t.id} value={t.id}>{t.schema}.{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Coluna de Origem</label>
                  <select 
                    id="fromColumn"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  >
                    <option value="">Selecione...</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tabela de Destino</label>
                  <select 
                    id="toTable"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    onChange={(e) => {
                      const tableId = e.target.value;
                      const table = openTables.find(t => t.id === tableId);
                      const toColumnSelect = document.getElementById('toColumn') as HTMLSelectElement;
                      if (toColumnSelect && table && table.columns) {
                        toColumnSelect.innerHTML = '<option value="">Selecione...</option>';
                        table.columns.forEach(col => {
                          const option = document.createElement('option');
                          option.value = col.column_name;
                          option.textContent = col.column_name;
                          if (col.is_primary) option.textContent += ' 🔑';
                          if (col.is_foreign) option.textContent += ' 🔗';
                          toColumnSelect.appendChild(option);
                        });
                      }
                    }}
                  >
                    <option value="">Selecione...</option>
                    {openTables.filter(t => t && t.id).map(t => (
                      <option key={t.id} value={t.id}>{t.schema}.{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Coluna de Destino</label>
                  <select 
                    id="toColumn"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  >
                    <option value="">Selecione...</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo de Relacionamento</label>
                  <select 
                    id="relType"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  >
                    <option value="1:1">1:1 (Um para Um)</option>
                    <option value="1:N">1:N (Um para Muitos)</option>
                    <option value="N:N">N:N (Muitos para Muitos)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cor</label>
                  <input
                    type="color"
                    id="relColor"
                    defaultValue="#8B5CF6"
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
              
              <button
                onClick={() => {
                  const fromTable = (document.getElementById('fromTable') as HTMLSelectElement)?.value;
                  const fromColumn = (document.getElementById('fromColumn') as HTMLSelectElement)?.value || 'id';
                  const toTable = (document.getElementById('toTable') as HTMLSelectElement)?.value;
                  const toColumn = (document.getElementById('toColumn') as HTMLSelectElement)?.value || 'id';
                  const relType = (document.getElementById('relType') as HTMLSelectElement)?.value as '1:1' | '1:N' | 'N:N';
                  const relColor = (document.getElementById('relColor') as HTMLInputElement)?.value;
                  
                  if (fromTable && toTable) {
                    const newRel: TableRelationship = {
                      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID mais único
                      fromTable,
                      fromColumn,
                      toTable,
                      toColumn,
                      type: relType,
                      color: relColor,
                      isActive: true
                    };
                    // Garantir que não há relacionamentos sem ID
                    setRelationships(prev => [...prev.filter(r => r && r.id), newRel]);
                  }
                }}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Adicionar Relacionamento
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Drag line visualization */}
    {isDraggingRelationship && dragRelationship && (
      <svg
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100vw', height: '100vh' }}
      >
        <line
          x1={dragRelationship.fromPos.x}
          y1={dragRelationship.fromPos.y}
          x2={dragRelationship.currentPos.x}
          y2={dragRelationship.currentPos.y}
          stroke="#8B5CF6"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <circle
          cx={dragRelationship.fromPos.x}
          cy={dragRelationship.fromPos.y}
          r="4"
          fill="#8B5CF6"
        />
        <circle
          cx={dragRelationship.currentPos.x}
          cy={dragRelationship.currentPos.y}
          r="4"
          fill="#8B5CF6"
        />
      </svg>
    )}
    
    {/* Hidden file input */}
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
      className="hidden"
      onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileUpload(e.target.files);
        }
        e.target.value = ''; // Reset input
      }}
    />
    
    {/* File Viewer Modal */}
    {viewingFile && (
      <FileViewer 
        file={viewingFile} 
        onClose={() => setViewingFile(null)} 
      />
      )}
      
      {/* Relationship type selection menu */}
      {showRelTypeMenu && (
        <div
        className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2"
        style={{
          left: relTypeMenuPos.x,
          top: relTypeMenuPos.y,
        }}
      >
        <div className="text-xs text-gray-400 mb-2 px-2">Escolha o tipo de relacionamento:</div>
        <button
          onClick={() => createRelationshipFromDrag('1:1')}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-white transition-colors"
        >
          1:1 (Um para Um)
        </button>
        <button
          onClick={() => createRelationshipFromDrag('1:N')}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-white transition-colors"
        >
          1:N (Um para Muitos)
        </button>
        <button
          onClick={() => createRelationshipFromDrag('N:N')}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-white transition-colors"
        >
          N:N (Muitos para Muitos)
        </button>
        <hr className="my-2 border-gray-700" />
        <button
          onClick={() => {
            setShowRelTypeMenu(false);
            setPendingRelationship(null);
          }}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-400 transition-colors"
        >
          Cancelar
        </button>
      </div>
      )}
      
      {/* Instructions tooltip */}
      {openTables.length > 1 && !relationships.length && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900/90 border border-purple-500/50 rounded-lg px-4 py-2 z-40">
        <div className="flex items-center gap-2 text-sm">
          <LinkIcon className="w-4 h-4 text-purple-400" />
          <span className="text-white">Dica: Clique no ícone <LinkIcon className="inline w-3 h-3" /> ao lado do nome da coluna e arraste para outra coluna</span>
        </div>
      </div>
      )}
      
      {/* Key press indicators */}
      {(isAltPressed || isSpacePressed) && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-2">
          {isAltPressed && (
            <div className="bg-purple-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Alt</kbd>
              <span>+ Scroll para Zoom</span>
            </div>
          )}
          {isSpacePressed && (
            <div className="bg-cyan-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Espaço</kbd>
              <span>+ Arraste para Mover</span>
            </div>
          )}
        </div>
      </div>
      )}
      
      {/* Formula Helper Window - Janela Flutuante Padrão do Sistema */}
      {showFormulaHelper && !selectedFormula && (
        <div 
          className="fixed z-50"
          style={{
            left: isFormulaWindowMaximized ? 0 : `${formulaWindowPos.x}px`,
            top: isFormulaWindowMaximized ? 0 : `${formulaWindowPos.y}px`,
            width: isFormulaWindowMaximized ? '100vw' : '900px',
            height: isFormulaWindowMaximized ? '100vh' : '600px',
            maxWidth: isFormulaWindowMaximized ? '100vw' : '90vw',
            transition: isDraggingFormulaWindow ? 'none' : 'all 0.2s ease'
          }}
        >
          <div className={`bg-black/10 backdrop-blur-sm border border-gray-300 ${isFormulaWindowMaximized ? '' : 'rounded-lg'} shadow-2xl flex flex-col h-full`}>
            {/* Window Header - Padrão Exato do Sistema com Traffic Lights */}
            <div 
              className={`flex items-center justify-between h-10 px-4 bg-gray-800 border-b border-gray-700 ${isFormulaWindowMaximized ? '' : 'rounded-t-lg'} select-none ${isDraggingFormulaWindow ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleFormulaWindowMouseDown}
              onDoubleClick={toggleFormulaWindowMaximize}
            >
              {/* Espaço vazio para simetria */}
              <div className="w-20"></div>
              
              {/* Título centralizado */}
              <div className="flex-1 text-center flex items-center justify-center gap-2">
                <FunctionSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-gray-200">Assistente de Fórmulas</span>
              </div>
              
              {/* Traffic Lights - Ordem: Vermelho (fechar), Verde (maximizar) */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => closeFormulaHelper()}
                  className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm hover:shadow-md active:scale-95"
                  title="Fechar janela"
                  aria-label="Fechar janela"
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={toggleFormulaWindowMaximize}
                  className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm hover:shadow-md active:scale-95"
                  title={isFormulaWindowMaximized ? "Restaurar janela" : "Maximizar janela"}
                  aria-label={isFormulaWindowMaximized ? "Restaurar janela" : "Maximizar janela"}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            {/* Window Content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#6b7280 #1f2937',
              overscrollBehavior: 'contain'
            }}>
              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  1️⃣ Primeiro, selecione a célula onde deseja o resultado<br/>
                  2️⃣ Depois escolha uma fórmula abaixo<br/>
                  3️⃣ Por fim, selecione as células para aplicar a fórmula
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
              {EXCEL_FORMULAS.map((formula) => {
                return (
                  <div
                    key={formula.name}
                    onClick={() => selectFormulaType(formula.name)}
                    className="border border-gray-700 hover:border-cyan-500 rounded-lg p-4 cursor-pointer transition-all hover:bg-cyan-950/20 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-cyan-950/50 rounded-lg group-hover:bg-cyan-900/50">
                        <FunctionSquare className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{formula.name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{formula.description}</p>
                        <div className="bg-gray-800/50 rounded px-2 py-1 mb-2">
                          <code className="text-xs text-cyan-300">{formula.syntax}</code>
                        </div>
                        <div className="text-xs text-gray-500">
                          Exemplo: <code className="text-cyan-400">{formula.example}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              
              <div className="mt-6 p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">Dica Excel</span>
                </div>
                <p className="text-xs text-gray-400">
                  Você pode clicar e arrastar para selecionar múltiplas células, 
                  usar Ctrl+Click para selecionar células não adjacentes, 
                  ou digitar diretamente as referências como A1:A10
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu de Edição de Colunas */}
      {columnEditMenu && (() => {
        const table = openTables.find(t => t.id === columnEditMenu.tableId);
        const schemaColor = table ? getModulePrimaryColor(table.schema || selectedSchema) : '#10b981';
        
        return (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#d6d6d6',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 99999
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
              {columnEditMenu.columns.length > 1 
                ? `Editar ${columnEditMenu.columns.length} colunas`
                : 'Editar coluna'}
            </h3>
            <button
              onClick={() => setColumnEditMenu(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#999',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          {columnEditMenu.columns.length > 1 && (
            <div style={{ 
              fontSize: '14px', 
              color: '#666', 
              marginBottom: '16px',
              padding: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px'
            }}>
              ℹ️ Alterações serão aplicadas a todas as colunas selecionadas
            </div>
          )}
          
          {/* Opções básicas */}
          <div style={{ marginBottom: '16px' }}>
            <button
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onClick={() => {
                // Abrir edição de nome para primeira coluna
                const firstColumnKey = columnEditMenu.columns[0];
                // Extract the column name using ColumnManager
                const columnName = ColumnManager.extractColumnName(firstColumnKey);
                if (columnName) {
                  setEditingColumnName({ tableId: columnEditMenu.tableId, columnName: columnName });
                }
                setColumnEditMenu(null);
              }}
            >
              ✏️ Renomear Coluna
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid #ddd', margin: '16px 0' }}></div>
          
          {/* Tipos de dados básicos */}
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Alterar Tipo de Dados:</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'text')}
            >
              📝 Texto
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'integer')}
            >
              🔢 Inteiro
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'numeric')}
            >
              💰 Decimal
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'boolean')}
            >
              ✓ Sim/Não
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'date')}
            >
              📅 Data
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'timestamp')}
            >
              🕐 Data/Hora
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              onClick={() => updateColumnTypes(null, 'json')}
            >
              {} JSON
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid #ddd', margin: '16px 0' }}></div>
          
          {/* Tipos de mídia especializados */}
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Tipos de Mídia:</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => updateColumnTypes('image', 'text')}
            >
              📷 Imagem
            </button>
          
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => updateColumnTypes('pdf', 'text')}
            >
              📄 PDF
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => updateColumnTypes('video', 'text')}
            >
              🎥 Vídeo
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => updateColumnTypes('excel', 'text')}
            >
              📊 Excel
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => updateColumnTypes('word', 'text')}
            >
              📝 Word
            </button>
            
            <button
              style={{
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => updateColumnTypes('mixed', 'text')}
            >
              📎 Múltiplos
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid #ddd', margin: '16px 0' }}></div>
          
          {/* Formatação de células */}
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Formatação das células:</div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                color: '#333'
              }}
            onClick={() => {
              // Aplicar formatação a todas as células das colunas selecionadas
              const table = openTables.find(t => t.id === columnEditMenu.tableId);
              if (table && table.data) {
                columnEditMenu.columns.forEach(columnKey => {
                  // Extract column name using ColumnManager
                  const colName = ColumnManager.extractColumnName(columnKey);
                  if (!colName) return;
                  table.data.forEach((_, rowIndex) => {
                    const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                    const current = cellFormatting.get(key) || {};
                    cellFormatting.set(key, { ...current, bold: true });
                  });
                });
                setCellFormatting(new Map(cellFormatting));
              }
              setColumnEditMenu(null);
            }}
            >
              B
            </button>
            
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontStyle: 'italic',
                cursor: 'pointer',
                color: '#333'
              }}
            onClick={() => {
              const table = openTables.find(t => t.id === columnEditMenu.tableId);
              if (table && table.data) {
                columnEditMenu.columns.forEach(columnKey => {
                  // Extract column name using ColumnManager
                  const colName = ColumnManager.extractColumnName(columnKey);
                  if (!colName) return;
                  table.data.forEach((_, rowIndex) => {
                    const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                    const current = cellFormatting.get(key) || {};
                    cellFormatting.set(key, { ...current, italic: true });
                  });
                });
                setCellFormatting(new Map(cellFormatting));
              }
              setColumnEditMenu(null);
            }}
            >
              I
            </button>
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Alinhamento:</div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
            onClick={() => {
              const table = openTables.find(t => t.id === columnEditMenu.tableId);
              if (table && table.data) {
                const newFormatting = new Map(cellFormatting);
                
                columnEditMenu.columns.forEach(columnKey => {
                  // Extract column name using ColumnManager
                  const colName = ColumnManager.extractColumnName(columnKey);
                  if (!colName) return;
                  
                  table.data.forEach((_, rowIndex) => {
                    const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                    const current = newFormatting.get(key) || {};
                    newFormatting.set(key, { ...current, align: 'left' });
                  });
                });
                
                setCellFormatting(newFormatting);
              }
              setColumnEditMenu(null);
            }}
            >
              ← Esquerda
            </button>
            
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
            onClick={() => {
              const table = openTables.find(t => t.id === columnEditMenu.tableId);
              if (table && table.data) {
                const newFormatting = new Map(cellFormatting);
                
                columnEditMenu.columns.forEach(columnKey => {
                  // Extract column name using ColumnManager
                  const colName = ColumnManager.extractColumnName(columnKey);
                  if (!colName) return;
                  
                  table.data.forEach((_, rowIndex) => {
                    const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                    const current = newFormatting.get(key) || {};
                    newFormatting.set(key, { ...current, align: 'center' });
                  });
                });
                
                setCellFormatting(newFormatting);
              }
              setColumnEditMenu(null);
            }}
            >
              ↔ Centro
            </button>
            
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#333'
              }}
            onClick={() => {
              const table = openTables.find(t => t.id === columnEditMenu.tableId);
              if (table && table.data) {
                const newFormatting = new Map(cellFormatting);
                
                columnEditMenu.columns.forEach(columnKey => {
                  // Extract column name using ColumnManager
                  const colName = ColumnManager.extractColumnName(columnKey);
                  if (!colName) return;
                  
                  table.data.forEach((_, rowIndex) => {
                    const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                    const current = newFormatting.get(key) || {};
                    newFormatting.set(key, { ...current, align: 'right' });
                  });
                });
                
                setCellFormatting(newFormatting);
              }
              setColumnEditMenu(null);
            }}
            >
              → Direita
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid #ddd', margin: '16px 0' }}></div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Tamanho da fonte:</div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => {
                const table = openTables.find(t => t.id === columnEditMenu.tableId);
                if (table && table.data) {
                  columnEditMenu.columns.forEach(columnKey => {
                    // Extract column name using ColumnManager
                    const colName = ColumnManager.extractColumnName(columnKey);
                    if (!colName) return;
                    
                    table.data.forEach((_, rowIndex) => {
                      const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                      const current = cellFormatting.get(key) || {};
                      cellFormatting.set(key, { ...current, fontSize: 12 });
                    });
                  });
                  setCellFormatting(new Map(cellFormatting));
                }
                setColumnEditMenu(null);
              }}
            >
              12px
            </button>
          
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#333'
              }}
            onClick={() => {
              const table = openTables.find(t => t.id === columnEditMenu.tableId);
              if (table && table.data) {
                columnEditMenu.columns.forEach(columnKey => {
                  // Extract column name using ColumnManager
                  const colName = ColumnManager.extractColumnName(columnKey);
                  if (!colName) return;
                  
                  table.data.forEach((_, rowIndex) => {
                    const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                    const current = cellFormatting.get(key) || {};
                    cellFormatting.set(key, { ...current, fontSize: 14 });
                  });
                });
                setCellFormatting(new Map(cellFormatting));
              }
              setColumnEditMenu(null);
            }}
            >
              14px
            </button>
            
            <button
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#333'
              }}
              onClick={() => {
                const table = openTables.find(t => t.id === columnEditMenu.tableId);
                if (table && table.data) {
                  columnEditMenu.columns.forEach(columnKey => {
                    // Extract column name using ColumnManager
                    const colName = ColumnManager.extractColumnName(columnKey);
                    if (!colName) return;
                    
                    table.data.forEach((_, rowIndex) => {
                      const key = `${columnEditMenu.tableId}_${rowIndex}_${colName}`;
                      const current = cellFormatting.get(key) || {};
                      cellFormatting.set(key, { ...current, fontSize: 16 });
                    });
                  });
                  setCellFormatting(new Map(cellFormatting));
                }
                setColumnEditMenu(null);
              }}
            >
              16px
            </button>
          </div>
        </div>
      )})()}

      {/* Menu de Colunas Ocultas */}
      {showHiddenColumnsMenu && (() => {
        const table = openTables.find(t => t.id === showHiddenColumnsMenu.tableId);
        const tableHidden = hiddenColumns.get(showHiddenColumnsMenu.tableId) || new Set();
        const schemaColor = table ? getModulePrimaryColor(table.schema || selectedSchema) : '#10b981';
        
        return (
          <div
            className="fixed z-[9999] backdrop-blur-md rounded-lg shadow-2xl min-w-[200px] max-h-[60vh] overflow-y-auto bg-gray-900/95"
            style={{
              left: showHiddenColumnsMenu.x,
              top: showHiddenColumnsMenu.y,
              borderColor: schemaColor + '60',
              border: '1px solid'
            }}
            onMouseLeave={() => setShowHiddenColumnsMenu(null)}
          >
            <div className="px-2 py-1 border-b" style={{ borderColor: schemaColor + '40' }}>
              <div className="text-xs text-white/80 font-medium">
                Colunas Ocultas ({tableHidden.size})
              </div>
            </div>
            
            {Array.from(tableHidden).map(columnName => (
              <button
                key={columnName}
                className="w-full px-3 py-1 text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                onClick={() => {
                  showColumn(showHiddenColumnsMenu.tableId, columnName);
                  if (tableHidden.size === 1) {
                    setShowHiddenColumnsMenu(null);
                  }
                }}
              >
                <Eye className="w-3 h-3" />
                {columnName}
              </button>
            ))}
            
            {tableHidden.size > 1 && (
              <>
                <div className="border-t" style={{ borderColor: schemaColor + '40' }}></div>
                <button
                  className="w-full px-3 py-1 text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors font-medium"
                  onClick={() => {
                    Array.from(tableHidden).forEach(columnName => {
                      showColumn(showHiddenColumnsMenu.tableId, columnName);
                    });
                    setShowHiddenColumnsMenu(null);
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Mostrar Todas
                </button>
              </>
            )}
          </div>
        );
      })()}

      {/* Menu de Contexto para Formatação de Células */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-gray-900 border border-white/20 rounded-lg shadow-xl py-2"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            minWidth: '200px'
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {/* Ações de Edição */}
          <div className="border-b border-white/10 mb-1 pb-1">
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                // Copy selected cells to clipboard
                if (selectedCells.size > 0) {
                  const table = openTables.find(t => t.id === contextMenu.tableId);
                  if (table) {
                    let copyData = '';
                    const cellsArray = Array.from(selectedCells);
                    
                    // Get unique rows and columns
                    const rows = new Set<number>();
                    const cols = new Set<string>();
                    cellsArray.forEach(key => {
                      const [_, row, col] = key.split('_');
                      rows.add(parseInt(row));
                      cols.add(col);
                    });
                    
                    // Sort rows and columns
                    const sortedRows = Array.from(rows).sort((a, b) => a - b);
                    const sortedCols = Array.from(cols);
                    
                    // Build copy data
                    sortedRows.forEach((row, i) => {
                      sortedCols.forEach((col, j) => {
                        const value = table.data?.[row]?.[col] || '';
                        copyData += value;
                        if (j < sortedCols.length - 1) copyData += '\t';
                      });
                      if (i < sortedRows.length - 1) copyData += '\n';
                    });
                    
                    navigator.clipboard.writeText(copyData);
                  }
                }
                setContextMenu(null);
              }}
            >
              📋 Copiar
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                // Cut functionality (copy + clear)
                if (selectedCells.size > 0) {
                  const table = openTables.find(t => t.id === contextMenu.tableId);
                  if (table) {
                    let copyData = '';
                    const cellsArray = Array.from(selectedCells);
                    
                    // Copy data
                    const rows = new Set<number>();
                    const cols = new Set<string>();
                    cellsArray.forEach(key => {
                      const [_, row, col] = key.split('_');
                      rows.add(parseInt(row));
                      cols.add(col);
                    });
                    
                    const sortedRows = Array.from(rows).sort((a, b) => a - b);
                    const sortedCols = Array.from(cols);
                    
                    sortedRows.forEach((row, i) => {
                      sortedCols.forEach((col, j) => {
                        const value = table.data?.[row]?.[col] || '';
                        copyData += value;
                        if (j < sortedCols.length - 1) copyData += '\t';
                        // Clear the cell
                        handleCellEdit(contextMenu.tableId, row, col, '');
                      });
                      if (i < sortedRows.length - 1) copyData += '\n';
                    });
                    
                    navigator.clipboard.writeText(copyData);
                  }
                }
                setContextMenu(null);
              }}
            >
              ✂️ Recortar
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={async () => {
                // Paste from clipboard
                try {
                  const text = await navigator.clipboard.readText();
                  if (text && selectedCells.size === 1) {
                    const cellKey = Array.from(selectedCells)[0];
                    const [tableId, rowStr, col] = cellKey.split('_');
                    const startRow = parseInt(rowStr);
                    
                    const table = openTables.find(t => t.id === tableId);
                    if (table) {
                      const columns = getVisibleColumns(table);
                      const startColIndex = columns.findIndex(c => c.column_name === col);
                      
                      // Parse paste data
                      const rows = text.split('\n');
                      rows.forEach((rowData, rowOffset) => {
                        const cells = rowData.split('\t');
                        cells.forEach((cellData, colOffset) => {
                          const targetRow = startRow + rowOffset;
                          const targetCol = columns[startColIndex + colOffset];
                          if (targetCol) {
                            handleCellEdit(tableId, targetRow, targetCol.column_name, cellData);
                          }
                        });
                      });
                    }
                  }
                } catch (err) {
                  console.error('Failed to paste:', err);
                }
                setContextMenu(null);
              }}
            >
              📄 Colar
            </button>
          </div>
          
          {/* Inserir/Deletar */}
          <div className="border-b border-white/10 mb-1 pb-1">
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                // Insert row above
                // This would need backend implementation
                console.log('Insert row above - needs backend implementation');
                setContextMenu(null);
              }}
            >
              ➕ Inserir linha acima
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                // Delete row
                if (confirm('Tem certeza que deseja deletar esta linha?')) {
                  const table = openTables.find(t => t.id === contextMenu.tableId);
                  if (table && table.data) {
                    const row = table.data[contextMenu.rowIndex];
                    if (row && row.id) {
                      // Delete via SQL
                      const [schema, tableName] = contextMenu.tableId.split('.');
                      fetch('/api/postgres/query', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          query: `DELETE FROM "${schema}"."${tableName}" WHERE id = $1`,
                          params: [row.id]
                        })
                      }).then(() => {
                        // Refresh table
                        loadTableData(contextMenu.tableId);
                      });
                    }
                  }
                }
                setContextMenu(null);
              }}
            >
              ❌ Deletar linha
            </button>
          </div>
          
          <div className="text-xs text-white/60 px-3 py-1 border-b border-white/10 mb-1">
            Formatação da Célula
          </div>
          
          {/* Texto */}
          <div className="border-b border-white/10 mb-1 pb-1">
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                const current = cellFormatting.get(key) || {};
                setCellFormatting(new Map(cellFormatting.set(key, { ...current, bold: !current.bold })));
                setContextMenu(null);
              }}
            >
              <span className="font-bold">B</span> Negrito
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                const current = cellFormatting.get(key) || {};
                setCellFormatting(new Map(cellFormatting.set(key, { ...current, italic: !current.italic })));
                setContextMenu(null);
              }}
            >
              <span className="italic">I</span> Itálico
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                const current = cellFormatting.get(key) || {};
                setCellFormatting(new Map(cellFormatting.set(key, { ...current, underline: !current.underline })));
                setContextMenu(null);
              }}
            >
              <span className="underline">U</span> Sublinhado
            </button>
          </div>
          
          {/* Alinhamento */}
          <div className="border-b border-white/10 mb-1 pb-1">
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                const current = cellFormatting.get(key) || {};
                setCellFormatting(new Map(cellFormatting.set(key, { ...current, align: 'left' })));
                setContextMenu(null);
              }}
            >
              ← Alinhar à Esquerda
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                const current = cellFormatting.get(key) || {};
                setCellFormatting(new Map(cellFormatting.set(key, { ...current, align: 'center' })));
                setContextMenu(null);
              }}
            >
              ↔ Centralizar
            </button>
            
            <button
              className="w-full px-3 py-1.5 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                const current = cellFormatting.get(key) || {};
                setCellFormatting(new Map(cellFormatting.set(key, { ...current, align: 'right' })));
                setContextMenu(null);
              }}
            >
              → Alinhar à Direita
            </button>
          </div>
          
          {/* Tamanho da Fonte */}
          <div className="px-3 py-1">
            <div className="text-xs text-white/60 mb-1">Tamanho da Fonte</div>
            <div className="flex gap-1">
              {[8, 10, 11, 12, 14, 16, 18].map(size => (
                <button
                  key={size}
                  className="px-2 py-1 text-xs text-white hover:bg-white/10 rounded"
                  onClick={() => {
                    const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                    const current = cellFormatting.get(key) || {};
                    setCellFormatting(new Map(cellFormatting.set(key, { ...current, fontSize: size })));
                    setContextMenu(null);
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          {/* Limpar Formatação */}
          <div className="border-t border-white/10 mt-1 pt-1">
            <button
              className="w-full px-3 py-1.5 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const key = `${contextMenu.tableId}_${contextMenu.rowIndex}_${contextMenu.columnName}`;
                cellFormatting.delete(key);
                setCellFormatting(new Map(cellFormatting));
                setContextMenu(null);
              }}
            >
              ✕ Limpar Formatação
            </button>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      {viewingPDF && (
        <PDFViewer
          url={viewingPDF.url}
          fileName={viewingPDF.fileName}
          onClose={() => setViewingPDF(null)}
        />
      )}

      </div>
    </>
  );
}
