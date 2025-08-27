// ===== MODELOS TYPESCRIPT PARA BANCO DE DADOS =====

export interface Worksheet {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  owner_id?: string;
  is_active: boolean;
  settings: Record<string, any>;
  metadata: Record<string, any>;
}

export interface Cell {
  worksheet_id: string;
  row_num: number;
  col_name: string;
  value?: string;
  data_type: string;
  formula?: string;
  display_value?: string;
  style: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  version: number;
}

export interface ColumnConfig {
  id: string;
  worksheet_id: string;
  col_name: string;
  name?: string;
  width: number;
  data_type: string;
  is_required: boolean;
  is_unique: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  created_at: Date;
}

export interface Relationship {
  id: string;
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  source_worksheet_id: string;
  source_column: string;
  target_worksheet_id: string;
  target_column: string;
  is_active: boolean;
  created_at: Date;
}

export interface FormulaCache {
  worksheet_id: string;
  row_num: number;
  col_name: string;
  formula: string;
  result?: string;
  dependencies: string[];
  last_calculated: Date;
}

// ===== TIPOS PARA APIs =====
export interface CellUpdate {
  worksheet_id: string;
  row_num: number;
  col_name: string;
  value?: string;
  data_type?: string;
  formula?: string;
  style?: Record<string, any>;
}

export interface CellsChunk {
  cells: Cell[];
  total_rows: number;
  total_cells: number;
  start_row: number;
  end_row: number;
  columns: string[];
}

export interface WorksheetStats {
  id: string;
  name: string;
  total_cells: number;
  total_rows: number;
  total_columns: number;
  max_row: number;
  updated_at: Date;
}

// ===== QUERY PARAMETERS =====
export interface GetCellsParams {
  worksheet_id: string;
  start_row?: number;
  end_row?: number;
  columns?: string[];
  include_empty?: boolean;
}

export interface SearchParams {
  worksheet_id: string;
  query: string;
  columns?: string[];
  data_types?: string[];
  limit?: number;
  offset?: number;
}

// ===== VALIDAÇÃO =====
export const DATA_TYPES = [
  'text', 'number', 'currency', 'date', 'boolean',
  'formula', 'lookup', 'reference', 'file', 'image'
] as const;

export type DataType = typeof DATA_TYPES[number];

export const RELATIONSHIP_TYPES = [
  'one-to-one', 'one-to-many', 'many-to-many'
] as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[number];

// ===== CONSTRAINTS =====
export const MAX_ROWS = 100000;
export const MAX_COLUMNS = 1000;
export const MAX_CELL_VALUE_LENGTH = 32768; // 32KB por célula
export const CHUNK_SIZE = 1000; // Linhas por chunk
export const CACHE_TTL = 300; // 5 minutos

// ===== FUNÇÕES DE VALIDAÇÃO =====
export function validateCellPosition(row: number, col: string): boolean {
  return row >= 1 && row <= MAX_ROWS && col.length <= 10;
}

export function validateDataType(dataType: string): dataType is DataType {
  return DATA_TYPES.includes(dataType as DataType);
}

export function validateRelationshipType(type: string): type is RelationshipType {
  return RELATIONSHIP_TYPES.includes(type as RelationshipType);
}

export function validateCellValue(value: string): boolean {
  return value.length <= MAX_CELL_VALUE_LENGTH;
}

// ===== UTILITÁRIOS =====
export function getCellId(row: number, col: string): string {
  return `${col}${row}`;
}

export function parseCellId(cellId: string): { row: number; col: string } | null {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  return {
    col: match[1],
    row: parseInt(match[2])
  };
}

export function getColumnIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result;
}

export function getColumnName(index: number): string {
  let result = '';
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

// ===== NOTIFICAÇÕES =====
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: 'system' | 'module' | 'security' | 'workflow' | 'user';
  module_name?: string;
  source_id?: string; // ID da entidade que gerou a notificação
  source_type?: string; // Tipo da entidade (worksheet, user, etc)
  data?: Record<string, any>; // Dados específicos da notificação
  read: boolean;
  read_at?: Date;
  archived: boolean;
  archived_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: 'system' | 'module' | 'security' | 'workflow' | 'user';
  module_name?: string;
  variables: string[]; // Lista de variáveis que podem ser substituídas
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: 'system' | 'module' | 'security' | 'workflow' | 'user';
  module_name?: string;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  desktop_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationChannel {
  id: string;
  user_id: string;
  type: 'email' | 'push' | 'webhook' | 'sms';
  endpoint: string; // Email, webhook URL, etc
  is_verified: boolean;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ===== TIPOS PARA NOTIFICAÇÕES EM TEMPO REAL =====
export interface NotificationEvent {
  type: 'notification_created' | 'notification_read' | 'notification_archived' | 'notification_deleted';
  notification: Notification;
  user_id: string;
  timestamp: Date;
}

export interface NotificationStats {
  user_id: string;
  total: number;
  unread: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  recent_activity: Date;
}

// ===== PARÂMETROS DE CONSULTA PARA NOTIFICAÇÕES =====
export interface GetNotificationsParams {
  user_id: string;
  read?: boolean;
  archived?: boolean;
  category?: 'system' | 'module' | 'security' | 'workflow' | 'user';
  type?: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  module_name?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'priority' | 'type';
  sort_order?: 'asc' | 'desc';
}

export interface CreateNotificationParams {
  user_id: string | string[]; // Pode ser um usuário ou lista de usuários
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: 'system' | 'module' | 'security' | 'workflow' | 'user';
  module_name?: string;
  source_id?: string;
  source_type?: string;
  data?: Record<string, any>;
  expires_at?: Date;
}

// ===== VALIDAÇÃO DE NOTIFICAÇÕES =====
export const NOTIFICATION_TYPES = [
  'info', 'success', 'warning', 'error', 'critical'
] as const;

export const NOTIFICATION_PRIORITIES = [
  'low', 'normal', 'high', 'critical'
] as const;

export const NOTIFICATION_CATEGORIES = [
  'system', 'module', 'security', 'workflow', 'user'
] as const;

export const NOTIFICATION_CHANNEL_TYPES = [
  'email', 'push', 'webhook', 'sms'
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];
export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[number];
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];
export type NotificationChannelType = typeof NOTIFICATION_CHANNEL_TYPES[number];

// ===== FUNÇÕES DE VALIDAÇÃO PARA NOTIFICAÇÕES =====
export function validateNotificationType(type: string): type is NotificationType {
  return NOTIFICATION_TYPES.includes(type as NotificationType);
}

export function validateNotificationPriority(priority: string): priority is NotificationPriority {
  return NOTIFICATION_PRIORITIES.includes(priority as NotificationPriority);
}

export function validateNotificationCategory(category: string): category is NotificationCategory {
  return NOTIFICATION_CATEGORIES.includes(category as NotificationCategory);
}

export function validateNotificationChannelType(type: string): type is NotificationChannelType {
  return NOTIFICATION_CHANNEL_TYPES.includes(type as NotificationChannelType);
}

// ===== CONSTANTES PARA NOTIFICAÇÕES =====
export const MAX_NOTIFICATIONS_PER_USER = 10000;
export const MAX_NOTIFICATION_TITLE_LENGTH = 200;
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 2000;
export const NOTIFICATION_DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias em ms
export const CRITICAL_NOTIFICATION_TTL = 90 * 24 * 60 * 60 * 1000; // 90 dias em ms

// ===== CACHE KEYS =====
export const CacheKeys = {
  worksheet: (id: string) => `worksheet:${id}`,
  cells: (worksheetId: string, startRow: number, endRow: number) => 
    `cells:${worksheetId}:${startRow}-${endRow}`,
  cellsColumn: (worksheetId: string, col: string) => 
    `cells:${worksheetId}:col:${col}`,
  columnConfigs: (worksheetId: string) => `column_configs:${worksheetId}`,
  relationships: (worksheetId: string) => `relationships:${worksheetId}`,
  stats: (worksheetId: string) => `stats:${worksheetId}`,
  // Notificações
  userNotifications: (userId: string) => `notifications:user:${userId}`,
  notificationStats: (userId: string) => `notification_stats:${userId}`,
  userPreferences: (userId: string) => `notification_preferences:${userId}`,
  notificationTemplates: () => 'notification_templates',
  liveNotifications: (userId: string) => `live_notifications:${userId}`
} as const;
