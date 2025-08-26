/**
 * MCP Types - Comprehensive TypeScript types for all 52+ MCP services
 * Provides full type safety for MCP integrations
 */

// Base MCP Types
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface MCPExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  service: string;
  tool: string;
  timestamp: Date;
  cost?: number;
  usage?: {
    tokensUsed?: number;
    requestCount: number;
  };
}

// GitHub API Types
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  company?: string;
  location?: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  fork: boolean;
  url: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string;
  size: number;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignee?: GitHubUser;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

// WhatsApp (Z-API) Types
export interface WhatsAppMessage {
  phone: string;
  message: string;
  messageId?: string;
  timestamp?: number;
}

export interface WhatsAppContact {
  phone: string;
  name?: string;
  pushname?: string;
  isUser: boolean;
  isWABusiness: boolean;
}

export interface WhatsAppStatus {
  connected: boolean;
  battery: number;
  plugged: boolean;
  phone: string;
  qrcode?: string;
}

// Bling ERP Types
export interface BlingProduct {
  id?: number;
  codigo?: string;
  descricao: string;
  un: string;
  vlr_unit: number;
  peso_bruto?: number;
  peso_liq?: number;
  class_fiscal?: string;
  marca?: string;
  cest?: string;
  origem?: number;
  situacao?: 'A' | 'I';
}

export interface BlingOrder {
  id?: number;
  numero?: string;
  data: string;
  cliente: {
    id?: number;
    nome: string;
    cpf_cnpj?: string;
    ie_rg?: string;
    endereco?: BlingAddress;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    qtde: number;
    vlr_unit: number;
    vlr_total?: number;
  }>;
  parcelas?: Array<{
    vlr: number;
    data_vencimento: string;
    forma_pagamento?: string;
  }>;
  vlr_total?: number;
  situacao?: 'Aberto' | 'Atendido' | 'Cancelado';
}

export interface BlingAddress {
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  pais?: string;
}

// OpenAI Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface OpenAIChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIImage {
  url: string;
  b64_json?: string;
  revised_prompt?: string;
}

// Google Services Types
export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

export interface GoogleSheetRange {
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
  values: string[][];
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
}

// Brazilian APIs Types
export interface CEPResponse {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
}

export interface CNPJResponse {
  cnpj: string;
  identificador_matriz_filial: number;
  descricao_matriz_filial: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral: number;
  descricao_situacao_cadastral: string;
  data_situacao_cadastral: string;
  motivo_situacao_cadastral: number;
  nome_cidade_exterior?: string;
  codigo_natureza_juridica: number;
  data_inicio_atividade: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  descricao_tipo_logradouro: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  uf: string;
  codigo_municipio: number;
  municipio: string;
  ddd_telefone_1?: string;
  telefone_1?: string;
  ddd_telefone_2?: string;
  telefone_2?: string;
  ddd_fax?: string;
  fax?: string;
  correio_eletronico?: string;
}

export interface CPFValidation {
  cpf: string;
  valid: boolean;
  formatted: string;
}

// Dropbox Types
export interface DropboxFile {
  '.tag': 'file' | 'folder';
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  client_modified?: string;
  server_modified?: string;
  rev?: string;
  size?: number;
  is_downloadable?: boolean;
  content_hash?: string;
}

export interface DropboxUploadResult {
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  client_modified: string;
  server_modified: string;
  rev: string;
  size: number;
}

// PDF Processing Types
export interface PDFProcessingResult {
  url: string;
  pages?: number;
  size?: number;
  format?: string;
}

export interface PDFTextExtraction {
  text: string;
  pages: Array<{
    page: number;
    text: string;
  }>;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}

// Spotify Types
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
    external_urls: {
      spotify: string;
    };
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  tracks: {
    total: number;
    items: Array<{
      track: SpotifyTrack;
      added_at: string;
    }>;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

// Supabase Types
export interface SupabaseTable {
  table_name: string;
  table_schema: string;
  table_type: string;
  comment?: string;
}

export interface SupabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  is_identity: boolean;
  identity_generation?: string;
  is_generated: boolean;
  generation_expression?: string;
}

export interface SupabaseQueryResult<T = any> {
  data: T[];
  count?: number;
  error?: string;
}

// Service-specific tool parameter types
export type MCPServiceParams = {
  // GitHub
  'github': {
    'github_get_authenticated_user': {};
    'github_list_repos': { per_page?: number; page?: number };
    'github_list_user_repos': { username: string; per_page?: number; page?: number };
    'github_create_repo': { 
      name: string; 
      description?: string; 
      private?: boolean; 
      auto_init?: boolean;
    };
    'github_get_repo': { owner: string; repo: string };
    'github_create_issue': {
      owner: string;
      repo: string;
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    };
  };

  // WhatsApp (Z-API)
  'z-api': {
    'send_message': { phone: string; message: string };
    'send_image': { phone: string; imageUrl: string; caption?: string };
    'get_status': {};
    'get_contacts': {};
    'get_chats': {};
  };

  // Bling
  'bling-nxt': {
    'list_products': { filters?: Record<string, any> };
    'create_product': BlingProduct;
    'update_product': BlingProduct & { id: number };
    'list_orders': { filters?: Record<string, any> };
    'create_order': BlingOrder;
  };

  // OpenAI
  'openai': {
    'chat_completion': {
      messages: OpenAIMessage[];
      model?: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    };
    'generate_image': {
      prompt: string;
      n?: number;
      size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
      style?: 'vivid' | 'natural';
    };
  };

  // Google
  'google': {
    'search': { query: string; num?: number; start?: number };
    'drive_list': { folderId?: string };
    'sheets_read': { spreadsheetId: string; range: string };
    'sheets_write': { spreadsheetId: string; range: string; values: string[][] };
    'calendar_list_events': { calendarId?: string; timeMin?: string; timeMax?: string };
  };

  // Brazilian APIs
  'hubdodesenvolvedor': {
    'consultar_cep': { cep: string };
  };
  'hubdodesenvolvedor-cnpj': {
    'consultar_cnpj': { cnpj: string };
  };
  'hubdodesenvolvedor-cpf': {
    'validar_cpf': { cpf: string };
  };

  // Dropbox
  'dropbox': {
    'list_files': { path?: string };
    'upload_file': { path: string; content: string | ArrayBuffer };
    'download_file': { path: string };
    'delete_file': { path: string };
    'create_folder': { path: string };
  };

  // PDF Processing
  'pdf4me': {
    'merge_pdfs': { pdfUrls: string[] };
    'split_pdf': { pdfUrl: string; ranges?: Array<{ start: number; end: number }> };
    'extract_text': { pdfUrl: string };
    'convert_to_pdf': { fileUrl: string; fromFormat: string };
  };

  // Spotify
  'spotify': {
    'search_tracks': { query: string; limit?: number; offset?: number };
    'get_current_track': {};
    'play_track': { uri: string };
    'pause_playback': {};
    'skip_to_next': {};
    'skip_to_previous': {};
    'create_playlist': { name: string; description?: string; public?: boolean };
  };
};

// Service return types
export type MCPServiceReturns = {
  'github': {
    'github_get_authenticated_user': GitHubUser;
    'github_list_repos': GitHubRepository[];
    'github_list_user_repos': GitHubRepository[];
    'github_create_repo': GitHubRepository;
    'github_get_repo': GitHubRepository;
    'github_create_issue': GitHubIssue;
  };

  'z-api': {
    'send_message': { messageId: string };
    'send_image': { messageId: string };
    'get_status': WhatsAppStatus;
    'get_contacts': WhatsAppContact[];
    'get_chats': Array<{ phone: string; name?: string; lastMessage?: string }>;
  };

  'bling-nxt': {
    'list_products': { produtos: BlingProduct[] };
    'create_product': { produto: BlingProduct };
    'update_product': { produto: BlingProduct };
    'list_orders': { pedidos: BlingOrder[] };
    'create_order': { pedido: BlingOrder };
  };

  'openai': {
    'chat_completion': OpenAIChatCompletion;
    'generate_image': { data: OpenAIImage[] };
  };

  'google': {
    'search': { items: GoogleSearchResult[] };
    'drive_list': { files: GoogleDriveFile[] };
    'sheets_read': GoogleSheetRange;
    'sheets_write': { updatedCells: number };
    'calendar_list_events': { items: GoogleCalendarEvent[] };
  };

  'hubdodesenvolvedor': {
    'consultar_cep': CEPResponse;
  };
  'hubdodesenvolvedor-cnpj': {
    'consultar_cnpj': CNPJResponse;
  };
  'hubdodesenvolvedor-cpf': {
    'validar_cpf': CPFValidation;
  };

  'dropbox': {
    'list_files': { entries: DropboxFile[] };
    'upload_file': DropboxUploadResult;
    'download_file': { content: string | ArrayBuffer };
    'delete_file': { deleted: boolean };
    'create_folder': DropboxFile;
  };

  'pdf4me': {
    'merge_pdfs': PDFProcessingResult;
    'split_pdf': PDFProcessingResult[];
    'extract_text': PDFTextExtraction;
    'convert_to_pdf': PDFProcessingResult;
  };

  'spotify': {
    'search_tracks': { tracks: { items: SpotifyTrack[] } };
    'get_current_track': SpotifyTrack | null;
    'play_track': { success: boolean };
    'pause_playbook': { success: boolean };
    'skip_to_next': { success: boolean };
    'skip_to_previous': { success: boolean };
    'create_playlist': SpotifyPlaylist;
  };
};

// Utility type for extracting tool parameters
export type MCPToolParams<
  TService extends keyof MCPServiceParams,
  TTool extends keyof MCPServiceParams[TService]
> = MCPServiceParams[TService][TTool];

// Utility type for extracting tool return types
export type MCPToolReturn<
  TService extends keyof MCPServiceReturns,
  TTool extends keyof MCPServiceReturns[TService]
> = MCPServiceReturns[TService][TTool];

// Generic MCP execution function type
export type MCPExecutor = <
  TService extends keyof MCPServiceParams,
  TTool extends keyof MCPServiceParams[TService]
>(
  service: TService,
  tool: TTool,
  params: MCPToolParams<TService, TTool>,
  options?: {
    timeout?: number;
    retries?: number;
    skipRateLimit?: boolean;
    skipCache?: boolean;
  }
) => Promise<MCPExecutionResult<MCPToolReturn<TService, TTool>>>;

export default MCPServiceParams;