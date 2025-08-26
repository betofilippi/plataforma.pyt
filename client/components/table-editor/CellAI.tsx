/**
 * CellAI Component
 * 
 * Renders AI-powered table cells with:
 * - Visual indicators for AI state (idle, processing, success, error)
 * - Loading animations during processing
 * - Preview of AI results with diff highlighting
 * - Click actions for different AI operations
 * - Integration with AI Engine
 * - Tooltips with metadata (tokens, cost, confidence)
 * - Inline editing with AI assistance
 * - Context menu for AI operations
 * - Real-time streaming results
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bot,
  Wand2,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit3,
  Play,
  Pause,
  Copy,
  Trash2,
  Settings,
  TrendingUp,
  Database,
  Filter,
  GitBranch,
  Clock,
  DollarSign,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  PenTool,
  Target,
  Layers,
  Code2,
  Workflow
} from 'lucide-react';

import { useAIEngine } from '../../lib/table-editor/useAIEngine';
import type {
  AIColumnType,
  AIColumnConfig,
  AICellValue,
  AIExecutionResult,
  AIExecutionContext
} from '../../lib/table-editor/ai-types';

// ===============================================
// INTERFACES
// ===============================================

interface CellAIProps {
  // Cell data
  value: AICellValue;
  column: AIColumnConfig;
  rowIndex: number;
  colIndex: number;
  rowData: Record<string, any>;
  
  // Callbacks
  onChange?: (value: AICellValue) => void;
  onError?: (error: string) => void;
  onExecute?: (columnId: string, rowId: string) => void;
  
  // State
  isSelected?: boolean;
  isEditing?: boolean;
  isReadOnly?: boolean;
  
  // Context
  tableData?: any[];
  tableId?: string;
  
  // Display options
  showMetadata?: boolean;
  showHistory?: boolean;
  compactMode?: boolean;
  debugMode?: boolean;
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
}

interface AIState {
  status: 'idle' | 'processing' | 'success' | 'error' | 'streaming';
  progress?: number;
  message?: string;
  metadata?: {
    tokens?: number;
    cost?: number;
    confidence?: number;
    latency?: number;
    model?: string;
  };
}

interface DiffResult {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  confidence?: number;
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export default function CellAI({
  value,
  column,
  rowIndex,
  colIndex,
  rowData,
  onChange,
  onError,
  onExecute,
  isSelected = false,
  isEditing = false,
  isReadOnly = false,
  tableData = [],
  tableId = '',
  showMetadata = false,
  showHistory = false,
  compactMode = false,
  debugMode = false,
  className = '',
  style
}: CellAIProps) {
  // ===============================================
  // STATE & REFS
  // ===============================================
  
  const [aiState, setAiState] = useState<AIState>({ status: 'idle' });
  const [previewValue, setPreviewValue] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editValue, setEditValue] = useState(value.raw?.toString() || '');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [diffResults, setDiffResults] = useState<DiffResult[]>([]);
  
  const cellRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<(() => void) | null>(null);
  
  // AI Engine hook
  const {
    generateContent,
    analyzeData,
    transformData,
    validateData,
    stream,
    isLoading,
    isStreaming,
    error: aiError,
    result,
    streamContent,
    stats,
    abort: abortAI
  } = useAIEngine({
    defaultProvider: 'openai',
    defaultModel: 'gpt-4'
  });

  // ===============================================
  // EFFECTS
  // ===============================================

  // Update AI state based on engine state
  useEffect(() => {
    if (isLoading || isStreaming) {
      setAiState(prev => ({ 
        ...prev, 
        status: isStreaming ? 'streaming' : 'processing' 
      }));
    } else if (aiError) {
      setAiState({ 
        status: 'error', 
        message: aiError 
      });
    } else if (result) {
      setAiState({
        status: result.success ? 'success' : 'error',
        message: result.error,
        metadata: {
          tokens: result.metadata?.tokens?.total || 0,
          cost: result.metadata?.cost || 0,
          confidence: result.metadata?.confidence || 0,
          latency: result.metadata?.executionTime || 0,
          model: result.metadata?.model
        }
      });
    } else {
      setAiState({ status: 'idle' });
    }
  }, [isLoading, isStreaming, aiError, result]);

  // Handle streaming content
  useEffect(() => {
    if (isStreaming && streamContent !== streamingContent) {
      setStreamingContent(streamContent);
      
      // Calculate diff if we have previous content
      if (value.processed) {
        const diffs = calculateDiff(value.processed.toString(), streamContent);
        setDiffResults(diffs);
      }
    }
  }, [streamContent, isStreaming, streamingContent, value.processed]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===============================================
  // COMPUTED VALUES
  // ===============================================

  const aiIcon = useMemo(() => {
    switch (column.type) {
      case 'ai_generator': return <Wand2 className="w-3 h-3" />;
      case 'ai_analyzer': return <TrendingUp className="w-3 h-3" />;
      case 'ai_transformer': return <GitBranch className="w-3 h-3" />;
      case 'mcp_action': return <Zap className="w-3 h-3" />;
      case 'mcp_query': return <Database className="w-3 h-3" />;
      case 'api_webhook': return <Layers className="w-3 h-3" />;
      case 'workflow': return <Workflow className="w-3 h-3" />;
      case 'validation': return <Target className="w-3 h-3" />;
      case 'aggregation': return <Filter className="w-3 h-3" />;
      case 'relation': return <GitBranch className="w-3 h-3" />;
      default: return <Bot className="w-3 h-3" />;
    }
  }, [column.type]);

  const statusIcon = useMemo(() => {
    switch (aiState.status) {
      case 'processing':
        return <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />;
      case 'streaming':
        return <Sparkles className="w-3 h-3 animate-pulse text-purple-400" />;
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  }, [aiState.status]);

  const displayValue = useMemo(() => {
    if (isStreaming && streamingContent) {
      return streamingContent;
    }
    if (showPreview && previewValue !== null) {
      return previewValue;
    }
    return value.processed || value.raw || '';
  }, [isStreaming, streamingContent, showPreview, previewValue, value]);

  // ===============================================
  // AI OPERATIONS
  // ===============================================

  const executeAI = useCallback(async () => {
    if (!column.aiConfig) return;

    const context: AIExecutionContext = {
      tableId: tableId,
      rowId: rowIndex.toString(),
      columnId: column.name,
      rowData,
      tableData,
      userContext: {
        userId: 'current-user',
        permissions: ['execute_ai']
      }
    };

    try {
      let result: AIExecutionResult;
      
      switch (column.type) {
        case 'ai_generator':
          result = await generateContent(
            column.aiConfig.prompt || 'Generate content for this cell',
            context
          );
          break;
          
        case 'ai_analyzer':
          result = await analyzeData(
            tableData,
            column.aiConfig.prompt || 'Analyze this data',
            context
          );
          break;
          
        case 'ai_transformer':
          result = await transformData(
            value.raw,
            'auto',
            column.aiConfig.outputFormat || 'text',
            context
          );
          break;
          
        case 'validation':
          const rules = [column.aiConfig.prompt || 'Validate this value'];
          result = await validateData(value.raw, rules, context);
          break;
          
        default:
          result = await generateContent(
            `Process this ${column.type} cell with value: ${value.raw}`,
            context
          );
      }

      if (result.success) {
        const newValue: AICellValue = {
          raw: value.raw,
          processed: result.value,
          metadata: {
            processedAt: new Date(),
            processedBy: result.metadata?.model || 'ai',
            cost: result.metadata?.cost || 0,
            latency: result.metadata?.executionTime || 0,
            tokens: result.metadata?.tokens?.total || 0,
            confidence: result.metadata?.confidence || 0
          },
          history: [
            ...(value.history || []),
            {
              timestamp: new Date(),
              value: result.value,
              action: 'generate',
              actor: 'ai',
              details: result.metadata
            }
          ]
        };

        onChange?.(newValue);
        onExecute?.(column.name, rowIndex.toString());
      } else {
        onError?.(result.error || 'AI execution failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [column, value, rowIndex, rowData, tableData, tableId, generateContent, analyzeData, transformData, validateData, onChange, onExecute, onError]);

  const streamAI = useCallback(async () => {
    if (!column.aiConfig) return;

    const prompt = column.aiConfig.prompt || 'Generate content for this cell';
    
    try {
      await stream(prompt, {
        model: column.aiConfig.model,
        temperature: column.aiConfig.temperature,
        maxTokens: column.aiConfig.maxTokens,
        onToken: (token) => {
          setStreamingContent(prev => prev + token);
        }
      });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Streaming failed');
    }
  }, [column, stream, onError]);

  const previewAI = useCallback(async () => {
    if (!column.aiConfig) return;

    setShowPreview(true);
    
    // Mock preview for now - in real implementation, this would be a lighter AI call
    const mockPreview = `Preview: AI will ${column.type.replace('_', ' ')} "${value.raw}"`;
    setPreviewValue(mockPreview);
    
    // Auto-hide preview after 3 seconds
    setTimeout(() => {
      setShowPreview(false);
      setPreviewValue(null);
    }, 3000);
  }, [column, value]);

  // ===============================================
  // UTILITY FUNCTIONS
  // ===============================================

  const calculateDiff = (oldText: string, newText: string): DiffResult[] => {
    // Simple diff implementation - in production, use a proper diff library
    if (oldText === newText) {
      return [{ type: 'unchanged', content: newText }];
    }
    
    return [
      { type: 'removed', content: oldText },
      { type: 'added', content: newText }
    ];
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata) return null;
    
    return (
      <div className="text-xs text-gray-400 space-y-1">
        {metadata.tokens && (
          <div className="flex items-center gap-1">
            <PenTool className="w-3 h-3" />
            <span>{metadata.tokens} tokens</span>
          </div>
        )}
        {metadata.cost && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>${metadata.cost.toFixed(4)}</span>
          </div>
        )}
        {metadata.confidence && (
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            <span>{Math.round(metadata.confidence * 100)}%</span>
          </div>
        )}
        {metadata.latency && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{metadata.latency}ms</span>
          </div>
        )}
      </div>
    );
  };

  // ===============================================
  // EVENT HANDLERS
  // ===============================================

  const handleClick = useCallback(() => {
    if (isReadOnly) return;
    
    // Different actions based on column type
    switch (column.type) {
      case 'ai_generator':
      case 'ai_analyzer':
      case 'ai_transformer':
        executeAI();
        break;
      default:
        // For other types, just show preview
        previewAI();
    }
  }, [column.type, executeAI, previewAI, isReadOnly]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    setShowContextMenu(true);
  }, [isReadOnly]);

  const handleDoubleClick = useCallback(() => {
    if (isReadOnly) return;
    setEditValue(value.raw?.toString() || '');
  }, [value.raw, isReadOnly]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (e.shiftKey) {
          streamAI();
        } else {
          executeAI();
        }
        break;
      case 'Escape':
        abortAI();
        setShowPreview(false);
        setShowContextMenu(false);
        break;
      case 'F2':
        setEditValue(value.raw?.toString() || '');
        break;
    }
  }, [executeAI, streamAI, abortAI, value.raw]);

  // ===============================================
  // RENDER HELPERS
  // ===============================================

  const renderDiff = () => {
    if (!diffResults.length) return null;
    
    return (
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="bg-gray-900 border border-white/20 rounded-lg p-3 max-w-xs">
          <div className="text-xs font-medium text-white mb-2">Changes Preview</div>
          <div className="space-y-1">
            {diffResults.map((diff, index) => (
              <div
                key={index}
                className={`text-xs px-2 py-1 rounded ${
                  diff.type === 'added' 
                    ? 'bg-green-600/20 text-green-300'
                    : diff.type === 'removed'
                    ? 'bg-red-600/20 text-red-300 line-through'
                    : 'text-gray-300'
                }`}
              >
                {diff.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!showContextMenu) return null;
    
    return (
      <div
        ref={contextMenuRef}
        className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-lg z-20 min-w-48"
      >
        <div className="p-1">
          <button
            onClick={executeAI}
            disabled={aiState.status === 'processing'}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Execute AI
          </button>
          
          <button
            onClick={streamAI}
            disabled={aiState.status === 'streaming'}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Stream AI
          </button>
          
          <button
            onClick={previewAI}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          
          <div className="my-1 border-t border-white/10" />
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(displayValue.toString());
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Value
          </button>
          
          <button
            onClick={() => {
              onChange?.({ ...value, processed: undefined });
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Result
          </button>
          
          <div className="my-1 border-t border-white/10" />
          
          <button
            onClick={() => setShowContextMenu(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>
    );
  };

  const renderTooltip = () => {
    if (!showTooltip || !value.metadata) return null;
    
    return (
      <div
        ref={tooltipRef}
        className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-white/20 rounded-lg shadow-lg p-3 z-30 min-w-64"
      >
        <div className="text-sm font-medium text-white mb-2">AI Metadata</div>
        {formatMetadata(value.metadata)}
        {formatMetadata(aiState.metadata)}
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!isStreaming && aiState.status !== 'processing') return null;
    
    return (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700 overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isStreaming 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-green-500'
          }`}
          style={{
            width: aiState.progress ? `${aiState.progress}%` : '100%',
            animation: aiState.progress ? 'none' : 'progress 2s ease-in-out infinite'
          }}
        />
      </div>
    );
  };

  // ===============================================
  // MAIN RENDER
  // ===============================================

  return (
    <div
      ref={cellRef}
      className={`
        relative group cell-ai
        ${compactMode ? 'min-h-8' : 'min-h-10'}
        ${isSelected ? 'ring-2 ring-purple-500/50' : ''}
        ${aiState.status === 'processing' ? 'animate-pulse' : ''}
        ${aiState.status === 'streaming' ? 'animate-pulse bg-purple-500/5' : ''}
        ${aiState.status === 'error' ? 'bg-red-500/5' : ''}
        ${aiState.status === 'success' ? 'bg-green-500/5' : ''}
        ${className}
      `}
      style={style}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      tabIndex={0}
    >
      {/* Main Content */}
      <div className="flex items-center gap-2 px-3 py-2 h-full">
        {/* AI Type Icon */}
        <div className={`
          flex-shrink-0 p-1 rounded-full transition-all duration-200
          ${column.type.startsWith('ai_') ? 'bg-purple-500/20 text-purple-400' : 
            column.type.startsWith('mcp_') ? 'bg-blue-500/20 text-blue-400' : 
            'bg-gray-500/20 text-gray-400'}
        `}>
          {aiIcon}
        </div>
        
        {/* Value Display */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white"
              autoFocus
            />
          ) : (
            <div className={`
              text-sm truncate transition-all duration-200
              ${aiState.status === 'streaming' ? 'text-purple-300' : 'text-white'}
              ${showPreview ? 'italic opacity-75' : ''}
            `}>
              {displayValue || (
                <span className="text-gray-500 italic">
                  {column.aiConfig?.prompt ? 'Click to generate' : 'No configuration'}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Status Icon */}
        {statusIcon && (
          <div className="flex-shrink-0">
            {statusIcon}
          </div>
        )}
        
        {/* More Options */}
        <button
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(!showContextMenu);
          }}
        >
          <MoreVertical className="w-3 h-3 text-gray-400" />
        </button>
      </div>
      
      {/* Progress Bar */}
      {renderProgressBar()}
      
      {/* Diff Preview */}
      {showPreview && renderDiff()}
      
      {/* Context Menu */}
      {renderContextMenu()}
      
      {/* Tooltip */}
      {renderTooltip()}
      
      {/* Metadata (if enabled) */}
      {showMetadata && value.metadata && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/10 rounded p-2 text-xs z-20">
          {formatMetadata(value.metadata)}
        </div>
      )}
      
      {/* History (if enabled) */}
      {showHistory && value.history && value.history.length > 0 && (
        <div className="absolute top-full right-0 mt-1 bg-gray-900 border border-white/10 rounded p-2 text-xs z-20 max-w-xs">
          <div className="font-medium text-white mb-1">History</div>
          {value.history.slice(-3).map((item, index) => (
            <div key={index} className="text-gray-400 mb-1">
              {item.timestamp.toLocaleTimeString()}: {item.action} by {item.actor}
            </div>
          ))}
        </div>
      )}
      
      {/* Debug Info (if enabled) */}
      {debugMode && (
        <div className="absolute bottom-full left-0 mb-1 bg-black border border-red-500/50 rounded p-2 text-xs text-red-300 z-20 font-mono">
          <div>Type: {column.type}</div>
          <div>Status: {aiState.status}</div>
          <div>Raw: {JSON.stringify(value.raw)}</div>
          <div>Processed: {JSON.stringify(value.processed)}</div>
        </div>
      )}
    </div>
  );
}

// ===============================================
// STYLES
// ===============================================

// Add to global CSS or styled-components
const styles = `
  @keyframes progress {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }
  
  .cell-ai {
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
  }
  
  .cell-ai:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }
  
  .cell-ai:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
  }
  
  .cell-ai.processing {
    animation: pulse 2s ease-in-out infinite;
  }
  
  .cell-ai.streaming {
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(139, 92, 246, 0.1) 50%, 
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// Export styles for use in parent components
export const cellAIStyles = styles;