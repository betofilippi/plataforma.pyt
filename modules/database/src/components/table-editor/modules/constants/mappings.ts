/**
 * TableEditor Icon Mappings - Phase 1 Safe Extraction
 * 
 * EXTRACTED FROM: TableEditorCanvas.tsx lines 77-99, 185-226
 * RISK LEVEL: 1% - Pure object mappings with imported icons
 * DEPENDENCIES: lucide-react icons (stable external dependency)
 * 
 * These are static mappings that associate schema names and data types
 * with their corresponding icons. Extracted to reduce main component size.
 */

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

// Import icons for data types
import {
  Type,
  Hash,
  Calendar,
  DollarSign,
  Circle,
  FileText,
  Key,
  Calculator
} from 'lucide-react';

// Schema name to icon mapping
export const SCHEMA_ICON_MAP: Record<string, any> = {
  'estoque': EstoqueIcon,
  'montagem': MontagemIcon,
  'vendas': VendasIcon,
  'faturamento': FaturamentoIcon,
  'expedicao': ExpedicaoIcon,
  'rh': RHIcon,
  'administrativo': AdministrativoIcon,
  'suporte': SuporteIcon,
  'comunicacao': ComunicacaoIcon,
  'juridico': JuridicoIcon,
  'financeiro': FinanceiroIcon,
  'tributario': TributarioIcon,
  'marketing': MarketingIcon,
  'produtos': ProdutosIcon,
  'lojas': LojasIcon,
  'cadastros': CadastrosIcon,
  'ia': IAIcon,
  'database': DatabaseIcon,
  'sistema': SistemaIcon
};

// Default icon for unknown schemas
export const DEFAULT_SCHEMA_ICON = DatabaseIcon;

// Data type to icon mapping
export const DATA_TYPE_ICON_MAP: Record<string, any> = {
  // Text types
  'varchar': Type,
  'text': Type,
  'character': Type,
  'char': Type,
  'string': Type,
  
  // Numeric types
  'int': Hash,
  'integer': Hash,
  'serial': Hash,
  'bigint': Hash,
  'smallint': Hash,
  'number': Hash,
  
  // Date/Time types
  'timestamp': Calendar,
  'date': Calendar,
  'time': Calendar,
  'datetime': Calendar,
  
  // Decimal/Float types
  'numeric': DollarSign,
  'decimal': DollarSign,
  'real': DollarSign,
  'double': DollarSign,
  'float': DollarSign,
  'money': DollarSign,
  
  // Boolean types
  'boolean': Circle,
  'bool': Circle,
  
  // JSON types
  'json': FileText,
  'jsonb': FileText,
  
  // UUID types
  'uuid': Key,
};

// Default icon for unknown data types
export const DEFAULT_DATA_TYPE_ICON = Calculator;