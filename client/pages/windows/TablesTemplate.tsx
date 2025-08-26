import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Table,
  Grid,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Key,
  Link as LinkIcon,
  Hash,
  Type,
  Calendar,
  FileText,
  Circle,
  ArrowRight,
  Shuffle,
  Layers,
  Settings,
  Info
} from 'lucide-react';

// Template de exemplo para demonstração
interface Column {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
}

interface TableSchema {
  name: string;
  schema: string;
  columns: Column[];
  position: { x: number; y: number };
  color: string;
}

interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: '1:1' | '1:N' | 'N:N';
  color: string;
}

export function TablesTemplate() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Schema colors - mesmo padrão do Schema Visualizer
  const schemaColors = [
    '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
    '#EF4444', '#6366F1', '#EC4899', '#14B8A6'
  ];

  // Dados de exemplo - Rico em variedade
  useEffect(() => {
    const exampleTables: TableSchema[] = [
      // Schema: public (roxo)
      {
        name: 'usuarios',
        schema: 'public',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'nome', type: 'varchar(255)' },
          { name: 'email', type: 'varchar(255)' },
          { name: 'senha_hash', type: 'text' },
          { name: 'empresa_id', type: 'uuid', isForeignKey: true },
          { name: 'perfil_id', type: 'int4', isForeignKey: true },
          { name: 'ativo', type: 'boolean' },
          { name: 'criado_em', type: 'timestamp' },
          { name: 'atualizado_em', type: 'timestamp' }
        ],
        position: { x: 50, y: 50 },
        color: '#8B5CF6'
      },
      {
        name: 'empresas',
        schema: 'public',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'nome', type: 'varchar(255)' },
          { name: 'cnpj', type: 'varchar(14)' },
          { name: 'telefone', type: 'varchar(20)' },
          { name: 'endereco', type: 'text' },
          { name: 'plano_id', type: 'int4', isForeignKey: true },
          { name: 'ativo', type: 'boolean' },
          { name: 'criado_em', type: 'timestamp' }
        ],
        position: { x: 400, y: 50 },
        color: '#8B5CF6'
      },
      
      // Schema: plataforma_core (cyan)
      {
        name: 'permissoes',
        schema: 'plataforma_core',
        columns: [
          { name: 'id', type: 'serial', isPrimaryKey: true },
          { name: 'nome', type: 'varchar(100)' },
          { name: 'descricao', type: 'text' },
          { name: 'modulo', type: 'varchar(50)' },
          { name: 'ativo', type: 'boolean' }
        ],
        position: { x: 750, y: 50 },
        color: '#06B6D4'
      },
      {
        name: 'perfis',
        schema: 'plataforma_core',
        columns: [
          { name: 'id', type: 'serial', isPrimaryKey: true },
          { name: 'nome', type: 'varchar(100)' },
          { name: 'descricao', type: 'text' },
          { name: 'nivel', type: 'int4' },
          { name: 'criado_em', type: 'timestamp' }
        ],
        position: { x: 1050, y: 50 },
        color: '#06B6D4'
      },
      
      // Schema: produtos_app (verde)
      {
        name: 'produtos',
        schema: 'produtos_app',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'sku', type: 'varchar(50)' },
          { name: 'nome', type: 'varchar(255)' },
          { name: 'descricao', type: 'text' },
          { name: 'preco', type: 'numeric(10,2)' },
          { name: 'categoria_id', type: 'int4', isForeignKey: true },
          { name: 'estoque_id', type: 'uuid', isForeignKey: true },
          { name: 'ativo', type: 'boolean' },
          { name: 'criado_em', type: 'timestamp' }
        ],
        position: { x: 50, y: 350 },
        color: '#10B981'
      },
      {
        name: 'categorias',
        schema: 'produtos_app',
        columns: [
          { name: 'id', type: 'serial', isPrimaryKey: true },
          { name: 'nome', type: 'varchar(100)' },
          { name: 'slug', type: 'varchar(100)' },
          { name: 'pai_id', type: 'int4', isForeignKey: true },
          { name: 'ordem', type: 'int4' }
        ],
        position: { x: 400, y: 350 },
        color: '#10B981'
      },
      
      // Schema: estoques_app (laranja)
      {
        name: 'estoques',
        schema: 'estoques_app',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'produto_id', type: 'uuid', isForeignKey: true },
          { name: 'quantidade', type: 'int4' },
          { name: 'minimo', type: 'int4' },
          { name: 'maximo', type: 'int4' },
          { name: 'localizacao', type: 'varchar(50)' },
          { name: 'atualizado_em', type: 'timestamp' }
        ],
        position: { x: 750, y: 350 },
        color: '#F59E0B'
      },
      {
        name: 'movimentacoes',
        schema: 'estoques_app',
        columns: [
          { name: 'id', type: 'serial', isPrimaryKey: true },
          { name: 'estoque_id', type: 'uuid', isForeignKey: true },
          { name: 'tipo', type: 'varchar(20)' },
          { name: 'quantidade', type: 'int4' },
          { name: 'usuario_id', type: 'uuid', isForeignKey: true },
          { name: 'observacao', type: 'text' },
          { name: 'criado_em', type: 'timestamp' }
        ],
        position: { x: 1050, y: 350 },
        color: '#F59E0B'
      },
      
      // Schema: loja_app (vermelho)
      {
        name: 'pedidos',
        schema: 'loja_app',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'numero', type: 'varchar(20)' },
          { name: 'cliente_id', type: 'uuid', isForeignKey: true },
          { name: 'status', type: 'varchar(30)' },
          { name: 'total', type: 'numeric(10,2)' },
          { name: 'pagamento_id', type: 'uuid', isForeignKey: true },
          { name: 'criado_em', type: 'timestamp' }
        ],
        position: { x: 50, y: 650 },
        color: '#EF4444'
      },
      {
        name: 'itens_pedido',
        schema: 'loja_app',
        columns: [
          { name: 'id', type: 'serial', isPrimaryKey: true },
          { name: 'pedido_id', type: 'uuid', isForeignKey: true },
          { name: 'produto_id', type: 'uuid', isForeignKey: true },
          { name: 'quantidade', type: 'int4' },
          { name: 'preco_unitario', type: 'numeric(10,2)' },
          { name: 'desconto', type: 'numeric(10,2)' },
          { name: 'subtotal', type: 'numeric(10,2)' }
        ],
        position: { x: 400, y: 650 },
        color: '#EF4444'
      },
      
      // Schema: identidade_app (índigo)
      {
        name: 'assets',
        schema: 'identidade_app',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'tipo', type: 'varchar(50)' },
          { name: 'nome', type: 'varchar(255)' },
          { name: 'url', type: 'text' },
          { name: 'tags', type: 'jsonb' },
          { name: 'metadata', type: 'jsonb' },
          { name: 'criado_em', type: 'timestamp' }
        ],
        position: { x: 750, y: 650 },
        color: '#6366F1'
      },
      
      // Schema: importacao_app (rosa)
      {
        name: 'importacoes',
        schema: 'importacao_app',
        columns: [
          { name: 'id', type: 'uuid', isPrimaryKey: true },
          { name: 'tipo', type: 'varchar(50)' },
          { name: 'arquivo', type: 'text' },
          { name: 'status', type: 'varchar(30)' },
          { name: 'total_linhas', type: 'int4' },
          { name: 'linhas_processadas', type: 'int4' },
          { name: 'erros', type: 'jsonb' },
          { name: 'iniciado_em', type: 'timestamp' },
          { name: 'finalizado_em', type: 'timestamp' }
        ],
        position: { x: 1050, y: 650 },
        color: '#EC4899'
      }
    ];

    const exampleRelationships: Relationship[] = [
      // Relacionamentos dentro do mesmo schema
      {
        id: 'rel1',
        fromTable: 'usuarios',
        fromColumn: 'empresa_id',
        toTable: 'empresas',
        toColumn: 'id',
        type: '1:N',
        color: '#06B6D4'
      },
      {
        id: 'rel2',
        fromTable: 'usuarios',
        fromColumn: 'perfil_id',
        toTable: 'perfis',
        toColumn: 'id',
        type: '1:N',
        color: '#06B6D4'
      },
      {
        id: 'rel3',
        fromTable: 'categorias',
        fromColumn: 'pai_id',
        toTable: 'categorias',
        toColumn: 'id',
        type: '1:N',
        color: '#06B6D4'
      },
      
      // Relacionamentos cross-schema (laranja)
      {
        id: 'rel4',
        fromTable: 'produtos',
        fromColumn: 'categoria_id',
        toTable: 'categorias',
        toColumn: 'id',
        type: '1:N',
        color: '#F59E0B'
      },
      {
        id: 'rel5',
        fromTable: 'produtos',
        fromColumn: 'estoque_id',
        toTable: 'estoques',
        toColumn: 'id',
        type: '1:1',
        color: '#F59E0B'
      },
      {
        id: 'rel6',
        fromTable: 'estoques',
        fromColumn: 'produto_id',
        toTable: 'produtos',
        toColumn: 'id',
        type: '1:1',
        color: '#F59E0B'
      },
      {
        id: 'rel7',
        fromTable: 'movimentacoes',
        fromColumn: 'estoque_id',
        toTable: 'estoques',
        toColumn: 'id',
        type: '1:N',
        color: '#06B6D4'
      },
      {
        id: 'rel8',
        fromTable: 'movimentacoes',
        fromColumn: 'usuario_id',
        toTable: 'usuarios',
        toColumn: 'id',
        type: '1:N',
        color: '#F59E0B'
      },
      {
        id: 'rel9',
        fromTable: 'itens_pedido',
        fromColumn: 'pedido_id',
        toTable: 'pedidos',
        toColumn: 'id',
        type: '1:N',
        color: '#06B6D4'
      },
      {
        id: 'rel10',
        fromTable: 'itens_pedido',
        fromColumn: 'produto_id',
        toTable: 'produtos',
        toColumn: 'id',
        type: '1:N',
        color: '#F59E0B'
      }
    ];

    setTables(exampleTables);
    setRelationships(exampleRelationships);
  }, []);

  // Get type icon
  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('varchar') || lowerType.includes('text')) return Type;
    if (lowerType.includes('int') || lowerType.includes('serial')) return Hash;
    if (lowerType.includes('timestamp') || lowerType.includes('date')) return Calendar;
    if (lowerType.includes('boolean')) return Circle;
    if (lowerType.includes('json')) return FileText;
    return Hash;
  };

  // Zoom functions
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Auto-organize tables
  const autoOrganizeTables = () => {
    const tableWidth = 320;
    const padding = 40;
    const columnsPerRow = 3;
    
    const updatedTables = tables.map((table, index) => ({
      ...table,
      position: {
        x: (index % columnsPerRow) * (tableWidth + padding) + 50,
        y: Math.floor(index / columnsPerRow) * 300 + 50
      }
    }));
    
    setTables(updatedTables);
  };

  // Filter tables
  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render relationships
  const renderRelationships = () => {
    return relationships.map(rel => {
      const fromTable = tables.find(t => t.name === rel.fromTable);
      const toTable = tables.find(t => t.name === rel.toTable);
      
      if (!fromTable || !toTable) return null;

      const fromX = fromTable.position.x + 300;
      const fromY = fromTable.position.y + 50;
      const toX = toTable.position.x;
      const toY = toTable.position.y + 50;

      const pathData = `M ${fromX} ${fromY} L ${toX} ${toY}`;

      return (
        <g key={rel.id}>
          <path
            d={pathData}
            stroke={rel.color}
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
            opacity="0.6"
          />
          <text
            x={(fromX + toX) / 2}
            y={(fromY + toY) / 2 - 5}
            fill={rel.color}
            fontSize="10"
            textAnchor="middle"
            className="font-mono font-medium"
          >
            {rel.type}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div className="toolbar border-b border-white/10">
        <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Table className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">Template de Tabelas</span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Search */}
          <div className="flex items-center gap-1">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tabelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2.5 py-1.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-400 backdrop-blur-sm hover:bg-white/[0.075] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 transition-all"
            />
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors text-slate-300"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={autoOrganizeTables}
            className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors text-slate-300"
            title="Auto-organizar"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-white/10" />

          {/* Info */}
          <div className="text-xs text-slate-400">
            {filteredTables.length} tabelas • {relationships.length} relacionamentos • 7 schemas
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ 
          backgroundColor: '#1e293b',
          backgroundImage: `radial-gradient(circle 1px at center, rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* SVG for relationships */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0'
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <polygon
                points="0 0, 10 4, 0 8"
                fill="#06B6D4"
              />
            </marker>
          </defs>
          {renderRelationships()}
        </svg>

        {/* Tables */}
        <div 
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0'
          }}
        >
          {filteredTables.map((table) => (
            <div
              key={`${table.schema}.${table.name}`}
              className={`absolute bg-white/[0.08] backdrop-blur-md border border-white/20 rounded-xl shadow-lg hover:bg-white/[0.12] hover:border-white/30 select-none cursor-grab ${
                selectedTable === table.name ? 'ring-2 ring-cyan-400/50' : ''
              }`}
              style={{
                left: table.position.x,
                top: table.position.y,
                width: 320,
                borderColor: table.color + '40'
              }}
              onClick={() => setSelectedTable(selectedTable === table.name ? null : table.name)}
            >
              {/* Table Header - same height as windows (h-10) */}
              <div 
                className="h-10 px-4 border-b border-white/10 flex items-center justify-between cursor-move"
                style={{ backgroundColor: table.color + '40' }}
              >
                {/* Left side: icon and name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Table className="w-4 h-4 flex-shrink-0" style={{ color: table.color }} />
                  <span className="font-medium text-white text-sm truncate">{table.name}</span>
                  <span className="text-xs text-slate-400">({table.schema})</span>
                  <span className="text-xs text-slate-400 ml-2">{table.columns.length} cols</span>
                </div>
                
                {/* Window controls - same size as windows (w-5 h-5) */}
                <div className="flex items-center space-x-3">
                  <button 
                    className="w-5 h-5 bg-red-500 rounded-full hover:bg-red-600 transition-colors" 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Close table visualization
                    }}
                  />
                  <button 
                    className="w-5 h-5 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Maximize/minimize table
                    }}
                  />
                </div>
              </div>

              {/* Columns */}
              <div className="overflow-y-visible">
                {table.columns.map((column) => {
                  const TypeIcon = getTypeIcon(column.type);
                  return (
                    <div
                      key={column.name}
                      className="px-4 py-1.5 border-b hover:bg-white/[0.05] transition-colors flex items-center gap-2 text-sm"
                      style={{ borderBottomColor: table.color + '40' }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {column.isPrimaryKey && (
                          <Key className="w-3 h-3 text-yellow-400" />
                        )}
                        {column.isForeignKey && (
                          <LinkIcon className="w-3 h-3 text-purple-400" />
                        )}
                        <TypeIcon className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-200">{column.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 uppercase">
                        {column.type}
                      </div>
                      {!column.isNullable && (
                        <div className="w-2 h-2 bg-red-400 rounded-full" title="NOT NULL" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/[0.08] backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="text-sm font-medium text-white mb-2">Template Visual</div>
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Key className="w-3 h-3 text-yellow-400" />
              <span>Chave Primária</span>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon className="w-3 h-3 text-purple-400" />
              <span>Chave Estrangeira</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full" />
              <span>NOT NULL</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-cyan-400" />
              <span>Relacionamento</span>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="absolute bottom-4 right-4 bg-white/[0.08] backdrop-blur-md border border-white/20 rounded-xl p-4 max-w-xs">
          <div className="text-xs text-slate-300 space-y-1">
            <div className="font-medium text-white mb-2">Padrão Visual Aplicado:</div>
            <div>• Fundo com grid pontilhado</div>
            <div>• Cards glassmorphism</div>
            <div>• Tabelas com header colorido por schema</div>
            <div>• Ícones por tipo de dado</div>
            <div>• Relacionamentos com setas</div>
            <div>• Font size 2xl nos nomes</div>
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="font-medium text-white mb-1">Schemas Demonstrados:</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                  <span>public</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#06B6D4' }} />
                  <span>plataforma_core</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
                  <span>produtos_app</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                  <span>estoques_app</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                  <span>loja_app</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6366F1' }} />
                  <span>identidade_app</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EC4899' }} />
                  <span>importacao_app</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}