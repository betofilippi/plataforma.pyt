/**
 * Visual Workflow Editor Component
 * Drag-and-drop interface for building and managing workflows
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  WorkflowDefinition, 
  WorkflowNodeConfig, 
  WorkflowConnection, 
  WorkflowVariable,
  WorkflowTrigger,
  WorkflowNodeType,
  TriggerType,
  ExecutionStatus,
  workflowEngine
} from '../../lib/table-editor/workflow-engine';
import { WindowCard, WindowButton, WindowInput, WindowToggle } from '../ui';
import { 
  Play, 
  Pause, 
  Square, 
  Save, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  GitBranch,
  Zap,
  Database,
  Globe,
  Code,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';

// Node Type Definitions
const NODE_TYPES: Record<WorkflowNodeType, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  description: string;
}> = {
  start: { 
    label: 'Start', 
    icon: <Play className="w-4 h-4" />, 
    color: 'bg-green-500',
    description: 'Workflow starting point'
  },
  action: { 
    label: 'Action', 
    icon: <Zap className="w-4 h-4" />, 
    color: 'bg-blue-500',
    description: 'Execute an action'
  },
  condition: { 
    label: 'Condition', 
    icon: <GitBranch className="w-4 h-4" />, 
    color: 'bg-yellow-500',
    description: 'Branch based on condition'
  },
  loop: { 
    label: 'Loop', 
    icon: <RotateCcw className="w-4 h-4" />, 
    color: 'bg-purple-500',
    description: 'Repeat execution'
  },
  parallel: { 
    label: 'Parallel', 
    icon: <Maximize2 className="w-4 h-4" />, 
    color: 'bg-indigo-500',
    description: 'Execute in parallel'
  },
  ai_processing: { 
    label: 'AI Processing', 
    icon: <Code className="w-4 h-4" />, 
    color: 'bg-pink-500',
    description: 'Process with AI'
  },
  mcp_service: { 
    label: 'MCP Service', 
    icon: <Globe className="w-4 h-4" />, 
    color: 'bg-teal-500',
    description: 'Call MCP service'
  },
  data_transform: { 
    label: 'Transform', 
    icon: <Database className="w-4 h-4" />, 
    color: 'bg-orange-500',
    description: 'Transform data'
  },
  webhook: { 
    label: 'Webhook', 
    icon: <Globe className="w-4 h-4" />, 
    color: 'bg-cyan-500',
    description: 'HTTP request'
  },
  delay: { 
    label: 'Delay', 
    icon: <Clock className="w-4 h-4" />, 
    color: 'bg-gray-500',
    description: 'Wait for duration'
  },
  end: { 
    label: 'End', 
    icon: <Square className="w-4 h-4" />, 
    color: 'bg-red-500',
    description: 'Workflow end point'
  }
};

// Status Icons
const STATUS_ICONS: Record<ExecutionStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-gray-400" />,
  running: <Play className="w-4 h-4 text-blue-400 animate-pulse" />,
  completed: <CheckCircle className="w-4 h-4 text-green-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  cancelled: <Square className="w-4 h-4 text-gray-400" />,
  paused: <Pause className="w-4 h-4 text-yellow-400" />
};

// Interfaces
interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  nodeId?: string;
  offset: Position;
}

interface ConnectionState {
  isConnecting: boolean;
  sourceNodeId?: string;
  sourceHandle?: string;
  currentPosition?: Position;
}

interface WorkflowEditorProps {
  workflowId?: string;
  onSave?: (workflow: WorkflowDefinition) => void;
  onExecute?: (workflowId: string, variables: Record<string, any>) => void;
  readOnly?: boolean;
}

// Main Component
export function WorkflowEditor({ 
  workflowId, 
  onSave, 
  onExecute, 
  readOnly = false 
}: WorkflowEditorProps) {
  // State
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(() => ({
    id: workflowId || `workflow_${Date.now()}`,
    name: 'New Workflow',
    version: '1.0.0',
    created: new Date(),
    updated: new Date(),
    createdBy: 'user',
    variables: [],
    nodes: [],
    connections: [],
    triggers: [],
    settings: {
      timeout: 300000, // 5 minutes
      maxConcurrentExecutions: 1,
      retainExecutionHistory: 30,
      enableRollback: true,
      enablePause: true
    }
  }));
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, offset: { x: 0, y: 0 } });
  const [connectionState, setConnectionState] = useState<ConnectionState>({ isConnecting: false });
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('pending');
  const [showExecutions, setShowExecutions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Position>({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Load workflow if ID provided
  useEffect(() => {
    if (workflowId) {
      const existingWorkflow = workflowEngine.getWorkflow(workflowId);
      if (existingWorkflow) {
        setWorkflow(existingWorkflow);
      }
    }
  }, [workflowId]);
  
  // Event Handlers
  const handleNodeDragStart = useCallback((nodeId: string, event: React.MouseEvent) => {
    if (readOnly) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDragState({
      isDragging: true,
      nodeId,
      offset: {
        x: event.clientX - rect.left - node.position.x * zoom - panOffset.x,
        y: event.clientY - rect.top - node.position.y * zoom - panOffset.y
      }
    });
  }, [workflow.nodes, zoom, panOffset, readOnly]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (dragState.isDragging && dragState.nodeId) {
      const newX = (event.clientX - rect.left - panOffset.x - dragState.offset.x) / zoom;
      const newY = (event.clientY - rect.top - panOffset.y - dragState.offset.y) / zoom;
      
      setWorkflow(prev => ({
        ...prev,
        nodes: prev.nodes.map(node =>
          node.id === dragState.nodeId
            ? { ...node, position: { x: newX, y: newY } }
            : node
        )
      }));
    }
    
    if (connectionState.isConnecting) {
      setConnectionState(prev => ({
        ...prev,
        currentPosition: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
      }));
    }
  }, [dragState, connectionState, zoom, panOffset]);
  
  const handleMouseUp = useCallback(() => {
    setDragState({ isDragging: false, offset: { x: 0, y: 0 } });
    if (connectionState.isConnecting && !connectionState.currentPosition) {
      setConnectionState({ isConnecting: false });
    }
  }, [connectionState]);
  
  const handleAddNode = useCallback((type: WorkflowNodeType) => {
    if (readOnly) return;
    
    const newNode: WorkflowNodeConfig = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: `${NODE_TYPES[type].label} ${workflow.nodes.filter(n => n.type === type).length + 1}`,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      }
    };
    
    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updated: new Date()
    }));
  }, [workflow.nodes, readOnly]);
  
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (readOnly) return;
    
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      connections: prev.connections.filter(c => 
        c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
      ),
      updated: new Date()
    }));
    
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode, readOnly]);
  
  const handleStartConnection = useCallback((nodeId: string, handle: string) => {
    if (readOnly) return;
    
    setConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandle: handle
    });
  }, [readOnly]);
  
  const handleCompleteConnection = useCallback((targetNodeId: string, targetHandle: string) => {
    if (!connectionState.sourceNodeId || readOnly) return;
    
    const newConnection: WorkflowConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceNodeId: connectionState.sourceNodeId,
      sourceHandle: connectionState.sourceHandle || 'output',
      targetNodeId,
      targetHandle
    };
    
    setWorkflow(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
      updated: new Date()
    }));
    
    setConnectionState({ isConnecting: false });
  }, [connectionState, readOnly]);
  
  const handleSaveWorkflow = useCallback(async () => {
    try {
      await workflowEngine.registerWorkflow(workflow);
      onSave?.(workflow);
      
      // Show success feedback
      console.log('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  }, [workflow, onSave]);
  
  const handleExecuteWorkflow = useCallback(async () => {
    if (!workflow.id) return;
    
    try {
      const executionId = await workflowEngine.executeWorkflow(workflow.id);
      setExecutionStatus('running');
      onExecute?.(workflow.id, {});
      
      // Monitor execution
      const checkStatus = () => {
        const execution = workflowEngine.getExecution(executionId);
        if (execution) {
          setExecutionStatus(execution.status);
          if (execution.status === 'running') {
            setTimeout(checkStatus, 1000);
          }
        }
      };
      
      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      setExecutionStatus('failed');
    }
  }, [workflow.id, onExecute]);
  
  // Render Methods
  const renderNode = useCallback((node: WorkflowNodeConfig) => {
    const nodeType = NODE_TYPES[node.type];
    const isSelected = selectedNode === node.id;
    
    return (
      <div
        key={node.id}
        className={`
          absolute bg-white/10 backdrop-blur-sm border rounded-lg p-3 min-w-[120px] cursor-pointer
          transition-all duration-200 hover:bg-white/20 select-none
          ${isSelected ? 'border-purple-400 ring-2 ring-purple-400/50' : 'border-white/20'}
        `}
        style={{
          left: node.position.x * zoom + panOffset.x,
          top: node.position.y * zoom + panOffset.y,
          transform: `scale(${zoom})`
        }}
        onMouseDown={(e) => handleNodeDragStart(node.id, e)}
        onClick={() => setSelectedNode(node.id)}
      >
        {/* Node Header */}
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-6 h-6 ${nodeType.color} rounded flex items-center justify-center text-white`}>
            {nodeType.icon}
          </div>
          <span className="text-sm font-medium text-white">{node.name}</span>
          {!readOnly && (
            <WindowButton
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </WindowButton>
          )}
        </div>
        
        {/* Connection Handles */}
        <div className="flex justify-between">
          {node.type !== 'start' && (
            <div
              className="w-3 h-3 bg-gray-400 rounded-full cursor-pointer hover:bg-purple-400"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleCompleteConnection(node.id, 'input');
              }}
            />
          )}
          
          {node.type !== 'end' && (
            <div
              className="w-3 h-3 bg-gray-400 rounded-full cursor-pointer hover:bg-purple-400 ml-auto"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleStartConnection(node.id, 'output');
              }}
            />
          )}
        </div>
      </div>
    );
  }, [selectedNode, zoom, panOffset, readOnly, handleNodeDragStart, handleDeleteNode, handleStartConnection, handleCompleteConnection]);
  
  const renderConnections = useCallback(() => {
    return (
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {workflow.connections.map(connection => {
          const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
          const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);
          
          if (!sourceNode || !targetNode) return null;
          
          const startX = (sourceNode.position.x + 60) * zoom + panOffset.x;
          const startY = (sourceNode.position.y + 40) * zoom + panOffset.y;
          const endX = (targetNode.position.x) * zoom + panOffset.x;
          const endY = (targetNode.position.y + 40) * zoom + panOffset.y;
          
          const midX = (startX + endX) / 2;
          
          return (
            <g key={connection.id}>
              <path
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                stroke="rgba(139, 92, 246, 0.6)"
                strokeWidth="2"
                fill="none"
                className="hover:stroke-purple-400 cursor-pointer"
              />
              <circle
                cx={endX}
                cy={endY}
                r="4"
                fill="rgb(139, 92, 246)"
              />
            </g>
          );
        })}
        
        {/* Preview connection while dragging */}
        {connectionState.isConnecting && connectionState.sourceNodeId && connectionState.currentPosition && (
          (() => {
            const sourceNode = workflow.nodes.find(n => n.id === connectionState.sourceNodeId);
            if (!sourceNode) return null;
            
            const startX = (sourceNode.position.x + 60) * zoom + panOffset.x;
            const startY = (sourceNode.position.y + 40) * zoom + panOffset.y;
            const endX = connectionState.currentPosition.x;
            const endY = connectionState.currentPosition.y;
            const midX = (startX + endX) / 2;
            
            return (
              <path
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                stroke="rgba(139, 92, 246, 0.4)"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
            );
          })()
        )}
      </svg>
    );
  }, [workflow.connections, workflow.nodes, connectionState, zoom, panOffset]);
  
  const renderNodePalette = () => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-white mb-4">Node Palette</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(NODE_TYPES).map(([type, config]) => (
          <WindowButton
            key={type}
            variant="secondary"
            size="sm"
            disabled={readOnly}
            onClick={() => handleAddNode(type as WorkflowNodeType)}
            className="flex items-center space-x-2 justify-start"
          >
            <div className={`w-4 h-4 ${config.color} rounded flex items-center justify-center text-white text-xs`}>
              {config.icon}
            </div>
            <span className="text-xs">{config.label}</span>
          </WindowButton>
        ))}
      </div>
    </div>
  );
  
  const renderProperties = () => {
    if (!selectedNode) {
      return (
        <div className="text-gray-400 text-center py-8">
          Select a node to edit properties
        </div>
      );
    }
    
    const node = workflow.nodes.find(n => n.id === selectedNode);
    if (!node) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Node Properties</h3>
        
        <WindowInput
          label="Name"
          value={node.name}
          disabled={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            setWorkflow(prev => ({
              ...prev,
              nodes: prev.nodes.map(n =>
                n.id === selectedNode ? { ...n, name: e.target.value } : n
              )
            }));
          }}
        />
        
        <WindowInput
          label="Description"
          value={node.description || ''}
          disabled={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            setWorkflow(prev => ({
              ...prev,
              nodes: prev.nodes.map(n =>
                n.id === selectedNode ? { ...n, description: e.target.value } : n
              )
            }));
          }}
        />
        
        {/* Node-specific configuration */}
        {node.type === 'action' && (
          <div className="space-y-3">
            <h4 className="text-md font-medium text-white">Action Configuration</h4>
            <select
              className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
              disabled={readOnly}
              value={node.action?.type || ''}
              onChange={(e) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.id === selectedNode
                      ? {
                          ...n,
                          action: {
                            ...n.action,
                            type: e.target.value as any,
                            config: {}
                          }
                        }
                      : n
                  )
                }));
              }}
            >
              <option value="">Select action type...</option>
              <option value="sql_query">SQL Query</option>
              <option value="api_call">API Call</option>
              <option value="data_transform">Data Transform</option>
              <option value="notification">Notification</option>
              <option value="file_operation">File Operation</option>
            </select>
          </div>
        )}
        
        {node.type === 'condition' && (
          <div className="space-y-3">
            <h4 className="text-md font-medium text-white">Condition Configuration</h4>
            <WindowInput
              label="Expression"
              placeholder="e.g., value > 100"
              disabled={readOnly}
              value={node.condition?.expression || ''}
              onChange={(e) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.id === selectedNode
                      ? {
                          ...n,
                          condition: {
                            ...n.condition,
                            expression: e.target.value
                          }
                        }
                      : n
                  )
                }));
              }}
            />
          </div>
        )}
        
        {node.type === 'ai_processing' && (
          <div className="space-y-3">
            <h4 className="text-md font-medium text-white">AI Configuration</h4>
            <select
              className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
              disabled={readOnly}
              value={node.aiProcessing?.provider || ''}
              onChange={(e) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.id === selectedNode
                      ? {
                          ...n,
                          aiProcessing: {
                            ...n.aiProcessing,
                            provider: e.target.value as any,
                            model: '',
                            prompt: ''
                          }
                        }
                      : n
                  )
                }));
              }}
            >
              <option value="">Select AI provider...</option>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="mistral">Mistral</option>
            </select>
            
            <textarea
              className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white h-24"
              placeholder="AI prompt template..."
              disabled={readOnly}
              value={node.aiProcessing?.prompt || ''}
              onChange={(e) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.id === selectedNode
                      ? {
                          ...n,
                          aiProcessing: {
                            ...n.aiProcessing,
                            prompt: e.target.value
                          }
                        }
                      : n
                  )
                }));
              }}
            />
          </div>
        )}
      </div>
    );
  };
  
  const renderToolbar = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <h2 className="text-xl font-bold text-white">{workflow.name}</h2>
        <span className={`px-2 py-1 rounded-full text-xs ${
          executionStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
          executionStatus === 'running' ? 'bg-blue-500/20 text-blue-400' :
          executionStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {STATUS_ICONS[executionStatus]}
          {executionStatus}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <WindowButton
          variant="secondary"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
        >
          <Minimize2 className="w-4 h-4" />
        </WindowButton>
        
        <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
        
        <WindowButton
          variant="secondary"
          onClick={() => setZoom(Math.min(2, zoom + 0.1))}
        >
          <Maximize2 className="w-4 h-4" />
        </WindowButton>
        
        <WindowButton
          variant="secondary"
          onClick={() => setShowTemplates(true)}
        >
          <Download className="w-4 h-4" />
          Templates
        </WindowButton>
        
        <WindowButton
          variant="secondary"
          onClick={() => setShowExecutions(true)}
        >
          <Eye className="w-4 h-4" />
          Executions
        </WindowButton>
        
        {!readOnly && (
          <>
            <WindowButton
              variant="primary"
              onClick={handleSaveWorkflow}
            >
              <Save className="w-4 h-4" />
              Save
            </WindowButton>
            
            <WindowButton
              variant="success"
              onClick={handleExecuteWorkflow}
              disabled={executionStatus === 'running'}
            >
              <Play className="w-4 h-4" />
              Execute
            </WindowButton>
          </>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="h-full flex">
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {renderToolbar()}
        
        <div
          ref={canvasRef}
          className="flex-1 relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg border border-white/20 overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid Background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)
              `,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
            }}
          />
          
          {/* Connections */}
          {renderConnections()}
          
          {/* Nodes */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            {workflow.nodes.map(renderNode)}
          </div>
          
          {/* Empty State */}
          {workflow.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Start Building Your Workflow</h3>
                <p className="text-sm">Drag nodes from the palette to begin</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Side Panel */}
      <div className="w-80 p-4 space-y-6">
        <WindowCard title="Node Palette">
          {renderNodePalette()}
        </WindowCard>
        
        <WindowCard title="Properties">
          {renderProperties()}
        </WindowCard>
        
        <WindowCard title="Workflow Settings">
          <div className="space-y-3">
            <WindowInput
              label="Workflow Name"
              value={workflow.name}
              disabled={readOnly}
              onChange={(e) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  name: e.target.value,
                  updated: new Date()
                }));
              }}
            />
            
            <WindowInput
              label="Timeout (ms)"
              type="number"
              value={workflow.settings.timeout}
              disabled={readOnly}
              onChange={(e) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    timeout: parseInt(e.target.value)
                  },
                  updated: new Date()
                }));
              }}
            />
            
            <WindowToggle
              label="Enable Rollback"
              checked={workflow.settings.enableRollback || false}
              disabled={readOnly}
              onChange={(checked) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    enableRollback: checked
                  },
                  updated: new Date()
                }));
              }}
            />
            
            <WindowToggle
              label="Enable Pause"
              checked={workflow.settings.enablePause || false}
              disabled={readOnly}
              onChange={(checked) => {
                if (readOnly) return;
                setWorkflow(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    enablePause: checked
                  },
                  updated: new Date()
                }));
              }}
            />
          </div>
        </WindowCard>
      </div>
    </div>
  );
}

export default WorkflowEditor;