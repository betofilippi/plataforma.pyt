/**
 * TypeScript types for Python Backend API
 * Auto-generated from FastAPI Pydantic schemas
 */

import { ComponentType } from 'react';

// ================================
// BASE TYPES
// ================================

export interface StandardApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: string[];
  timestamp: string;
}

// ================================
// AUTHENTICATION TYPES
// ================================

export interface UserRegistrationRequest {
  email: string;
  password: string;
  password_confirm: string;
  name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  department?: string;
  job_title?: string;
  terms_accepted: boolean;
  privacy_policy_accepted: boolean;
  organization_domain?: string;
  invite_token?: string;
}

export interface UserRegistrationResponse {
  success: boolean;
  message: string;
  user_id?: string;
  email_verification_required: boolean;
  next_steps: string[];
}

export interface UserLoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
  mfa_token?: string;
  mfa_backup_code?: string;
  device_info?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  scope?: string;
}

export interface UserProfileSummary {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified_at?: string;
  last_login_at?: string;
  roles: string[];
  permissions: string[];
  preferences: Record<string, any>;
}

export interface UserLoginResponse {
  success: boolean;
  message: string;
  tokens?: TokenResponse;
  user?: UserProfileSummary;
  mfa_required: boolean;
  mfa_methods: string[];
  session_id?: string;
  warnings: string[];
}

export interface MFALoginRequest {
  login_session_token: string;
  mfa_token?: string;
  mfa_backup_code?: string;
  trust_device?: boolean;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  tokens?: TokenResponse;
  message?: string;
}

export interface TokenValidationRequest {
  token: string;
  token_type?: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  user_id?: string;
  expires_at?: string;
  scopes: string[];
  message?: string;
}

export interface LogoutRequest {
  refresh_token?: string;
  logout_all_sessions?: boolean;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  sessions_revoked: number;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
  revoke_all_sessions?: boolean;
}

export interface PasswordResetRequest {
  email: string;
  return_url?: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  email_sent: boolean;
}

export interface PasswordStrengthCheck {
  password: string;
}

export interface PasswordStrengthResponse {
  valid: boolean;
  strength_score: number;
  errors: string[];
  suggestions: string[];
}

export interface UserProfileDetail {
  id: string;
  email: string;
  email_verified_at?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  job_title?: string;
  timezone: string;
  language: string;
  theme: string;
  is_active: boolean;
  is_locked: boolean;
  must_change_password: boolean;
  mfa_enabled: boolean;
  last_login_at?: string;
  last_password_change_at?: string;
  created_at: string;
  updated_at: string;
  preferences: Record<string, any>;
  organization?: OrganizationSummary;
  roles: RoleSummary[];
  active_sessions_count: number;
}

export interface UserProfileUpdateRequest {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  job_title?: string;
  timezone?: string;
  language?: string;
  theme?: string;
  preferences?: Record<string, any>;
}

// ================================
// USER MANAGEMENT TYPES
// ================================

export type UserRole = 'admin' | 'user' | 'moderator' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserBase {
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface UserCreate extends UserBase {
  password: string;
  confirm_password: string;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  role?: UserRole;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UserPasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UserResponse extends UserBase {
  id: number;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  active_sessions: number;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  metadata?: Record<string, any>;
  preferences?: Record<string, any>;
  statistics?: Record<string, any>;
}

export interface UserSession {
  id: string;
  user_id: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface UserSearchFilters {
  search?: string;
  role?: UserRole;
  is_active?: boolean;
  created_after?: string;
  created_before?: string;
  has_active_sessions?: boolean;
}

export type UserSortOption = 
  | 'created_asc' 
  | 'created_desc' 
  | 'name_asc' 
  | 'name_desc' 
  | 'email_asc' 
  | 'email_desc' 
  | 'last_login_asc' 
  | 'last_login_desc';

export interface UserListParams {
  page?: number;
  page_size?: number;
  sort?: UserSortOption;
  filters?: UserSearchFilters;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  users_by_role: Record<string, number>;
  active_sessions: number;
  login_activity: Record<string, any>[];
}

export interface UserActivityLog {
  id: number;
  user_id: number;
  action: string;
  resource?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type UserBulkAction = 
  | 'activate' 
  | 'deactivate' 
  | 'delete' 
  | 'change_role' 
  | 'send_email';

export interface UserBulkOperation {
  user_ids: number[];
  action: UserBulkAction;
  parameters?: Record<string, any>;
}

export interface UserBulkOperationResponse {
  success_count: number;
  failed_count: number;
  errors: Record<string, any>[];
  processed_ids: number[];
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: Record<string, boolean>;
  dashboard_settings?: Record<string, any>;
  privacy_settings?: Record<string, boolean>;
}

export interface UserPreferencesUpdate {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: Record<string, boolean>;
  dashboard_settings?: Record<string, any>;
  privacy_settings?: Record<string, boolean>;
}

// ================================
// DASHBOARD TYPES
// ================================

export type WidgetType = 
  | 'chart' 
  | 'metric' 
  | 'table' 
  | 'text' 
  | 'image' 
  | 'map' 
  | 'gauge' 
  | 'progress' 
  | 'list' 
  | 'custom';

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'area' 
  | 'pie' 
  | 'doughnut' 
  | 'scatter' 
  | 'bubble' 
  | 'radar';

export type DashboardPermissionLevel = 'owner' | 'editor' | 'viewer' | 'public';

export type RefreshInterval = 
  | 'manual' 
  | 'real_time' 
  | '5s' 
  | '10s' 
  | '30s' 
  | '1m' 
  | '5m' 
  | '15m' 
  | '30m' 
  | '1h';

export interface DashboardBase {
  name: string;
  description?: string;
  is_public: boolean;
  refresh_interval: RefreshInterval;
  layout: Record<string, any>;
  theme: string;
  metadata?: Record<string, any>;
}

export interface DashboardCreate extends DashboardBase {
  folder_id?: number;
  tags: string[];
}

export interface DashboardUpdate {
  name?: string;
  description?: string;
  is_public?: boolean;
  refresh_interval?: RefreshInterval;
  layout?: Record<string, any>;
  theme?: string;
  metadata?: Record<string, any>;
  folder_id?: number;
  tags?: string[];
}

export interface WidgetBase {
  title: string;
  widget_type: WidgetType;
  config: Record<string, any>;
  position: Record<string, number>;
  data_source?: string;
  refresh_interval?: RefreshInterval;
  is_visible: boolean;
}

export interface WidgetCreate extends WidgetBase {
  dashboard_id: number;
}

export interface WidgetUpdate {
  title?: string;
  widget_type?: WidgetType;
  config?: Record<string, any>;
  position?: Record<string, number>;
  data_source?: string;
  refresh_interval?: RefreshInterval;
  is_visible?: boolean;
}

export interface WidgetResponse extends WidgetBase {
  id: number;
  dashboard_id: number;
  created_at: string;
  updated_at?: string;
  last_data_update?: string;
}

export interface DashboardResponse extends DashboardBase {
  id: number;
  slug: string;
  owner_id: number;
  folder_id?: number;
  created_at: string;
  updated_at?: string;
  last_viewed?: string;
  view_count: number;
  tags: string[];
}

export interface DashboardDetail extends DashboardResponse {
  widgets: WidgetResponse[];
  permissions: Record<string, any>[];
  shared_users: Record<string, any>[];
  statistics?: Record<string, any>;
}

export interface KPIMetric {
  id: string;
  name: string;
  value: number | string;
  previous_value?: number;
  change?: number;
  trend?: string;
  format: string;
  unit?: string;
  color?: string;
  icon?: string;
}

export interface KPIResponse {
  metrics: KPIMetric[];
  timestamp: string;
  refresh_interval: number;
}

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: ChartType;
}

export interface ChartData {
  series: ChartSeries[];
  categories?: string[];
  chart_type: ChartType;
  options: Record<string, any>;
  timestamp: string;
}

export interface ChartResponse {
  success: boolean;
  data: ChartData;
  type: string;
  period: string;
  timestamp: string;
}

export interface DashboardStatistics {
  total_dashboards: number;
  public_dashboards: number;
  private_dashboards: number;
  total_widgets: number;
  widgets_by_type: Record<string, number>;
  most_viewed: Record<string, any>[];
  recent_activity: Record<string, any>[];
  popular_themes: Record<string, number>;
}

export interface SystemHealth {
  status: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  response_time: number;
  uptime: number;
  last_check: string;
  issues: string[];
}

export interface DashboardSearchFilters {
  search?: string;
  owner_id?: number;
  folder_id?: number;
  is_public?: boolean;
  tags?: string[];
  theme?: string;
  created_after?: string;
  created_before?: string;
}

export type DashboardSortOption = 
  | 'created_asc' 
  | 'created_desc' 
  | 'name_asc' 
  | 'name_desc' 
  | 'views_asc' 
  | 'views_desc' 
  | 'updated_asc' 
  | 'updated_desc';

export interface DashboardListParams {
  page?: number;
  page_size?: number;
  sort?: DashboardSortOption;
  filters?: DashboardSearchFilters;
}

export interface DashboardListResponse {
  dashboards: DashboardResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ================================
// ORGANIZATION AND ROLES
// ================================

export interface OrganizationSummary {
  id: string;
  name: string;
  domain?: string;
  logo_url?: string;
  is_active: boolean;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  logo_url?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count: number;
  role_count: number;
}

export interface PermissionSummary {
  id: string;
  name: string;
  description?: string;
  category: string;
  resource?: string;
  action: string;
  module_name?: string;
  is_system_permission: boolean;
}

export interface RoleSummary {
  id: string;
  name: string;
  description?: string;
  level: number;
  color: string;
  icon?: string;
  is_system_role: boolean;
  permission_count: number;
}

export interface RoleDetail {
  id: string;
  name: string;
  description?: string;
  level: number;
  color: string;
  icon?: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization: OrganizationSummary;
  parent_role?: RoleSummary;
  child_roles: RoleSummary[];
  permissions: PermissionSummary[];
  user_count: number;
}

// ================================
// SESSION MANAGEMENT
// ================================

export interface SessionSummary {
  id: string;
  token_family: string;
  ip_address?: string;
  user_agent?: string;
  device_info: Record<string, any>;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_current: boolean;
  is_active: boolean;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
  total_sessions: number;
  active_sessions: number;
}

export interface SessionRevokeRequest {
  session_ids?: string[];
  revoke_all_except_current?: boolean;
  revoke_all?: boolean;
}

export interface SessionRevokeResponse {
  success: boolean;
  message: string;
  revoked_sessions: number;
  remaining_sessions: number;
}

// ================================
// MFA TYPES
// ================================

export interface MFASetupRequest {
  method: 'totp' | 'sms' | 'email';
  phone_number?: string;
}

export interface MFASetupResponse {
  success: boolean;
  method: string;
  secret?: string;
  qr_code_url?: string;
  backup_codes?: string[];
  message: string;
}

export interface MFAVerifyRequest {
  token: string;
}

export interface MFAVerifyResponse {
  success: boolean;
  message: string;
}

export interface MFADisableRequest {
  current_password: string;
  mfa_token?: string;
}

export interface MFADisableResponse {
  success: boolean;
  message: string;
}

export interface MFABackupCodesResponse {
  backup_codes: string[];
  message: string;
}

// ================================
// WEBSOCKET TYPES
// ================================

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  user_id?: string;
  session_id?: string;
}

export interface WebSocketAuthMessage {
  token: string;
  user_id: string;
}

export interface WebSocketStatusMessage {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
  user_count?: number;
}

export interface DashboardRealtimeUpdate {
  dashboard_id: number;
  update_type: string;
  data: Record<string, any>;
  timestamp: string;
  user_id?: number;
}

export interface WidgetDataUpdate {
  widget_id: number;
  data: Record<string, any>;
  timestamp: string;
  source: string;
}

// ================================
// API CLIENT TYPES
// ================================

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface RequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  response?: any;
  originalMessage?: string;
}

// ================================
// HEALTH CHECK TYPES
// ================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: number;
  services?: {
    redis?: {
      status: 'healthy' | 'unhealthy' | 'disabled';
      url?: string;
      error?: string;
    };
    database?: {
      status: 'healthy' | 'unhealthy';
      url?: string;
      error?: string;
    };
  };
}

export interface MetricsResponse {
  app_info: {
    name: string;
    version: string;
    debug: boolean;
  };
  system_info: {
    redis_enabled: boolean;
    database_connected: boolean;
  };
  timestamp: number;
}

// ================================
// AUDIT AND SECURITY
// ================================

export interface LoginAttemptSummary {
  id: string;
  email: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
  attempted_at: string;
}

export interface SecurityLogEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface SecurityLogResponse {
  logs: SecurityLogEntry[];
  total: number;
  page: number;
  per_page: number;
}

// ================================
// UTILITY TYPES
// ================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint {
  method: ApiMethod;
  path: string;
  authenticated?: boolean;
  description?: string;
}

export type ApiEndpoints = Record<string, ApiEndpoint>;

// Export all types as a namespace for easy importing
export * from './api-types';