# API Reference Documentation

Complete reference for all Plataforma.dev APIs, including REST endpoints, WebSocket events, and SDK methods.

## 📋 Table of Contents

- [Authentication API](#authentication-api)
- [Module Management API](#module-management-api)
- [Database API](#database-api)
- [File Storage API](#file-storage-api)
- [User Management API](#user-management-api)
- [Permissions API](#permissions-api)
- [Real-time API](#real-time-api)
- [WebSocket Events](#websocket-events)
- [SDK Reference](#sdk-reference)
- [Error Handling](#error-handling)

## 🔐 Authentication API

Base URL: `https://your-domain.com/api/auth`

### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Response
interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
  expiresAt: string;
}
```

**Example**:
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
```

### Refresh Token

**POST** `/auth/refresh`

Refresh an expired JWT token.

```typescript
// Request
interface RefreshRequest {
  refreshToken: string;
}

// Response
interface RefreshResponse {
  success: boolean;
  token: string;
  expiresAt: string;
}
```

### Logout

**POST** `/auth/logout`

Invalidate current session and token.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Response
interface LogoutResponse {
  success: boolean;
  message: string;
}
```

### Social Authentication

**GET** `/auth/social/{provider}`

Initiate OAuth flow for social providers.

**Parameters**:
- `provider`: `google` | `microsoft` | `github`
- `redirect_uri`: URL to redirect after authentication

### Verify Token

**GET** `/auth/verify`

Verify if current token is valid.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Response
interface VerifyResponse {
  valid: boolean;
  user?: User;
  expiresAt?: string;
}
```

## 🧩 Module Management API

Base URL: `https://your-domain.com/api/modules`

### List Modules

**GET** `/modules`

Get list of available modules for current user.

**Headers**: `Authorization: Bearer <token>`

```typescript
interface Module {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  permissions: string[];
  isActive: boolean;
  lastUpdated: string;
}

// Response
interface ModulesResponse {
  modules: Module[];
  total: number;
}
```

### Get Module Details

**GET** `/modules/{moduleId}`

Get detailed information about a specific module.

**Parameters**:
- `moduleId`: Module identifier

```typescript
interface ModuleDetails extends Module {
  author: {
    name: string;
    email: string;
  };
  dependencies: string[];
  config: object;
  api: {
    endpoints: string[];
    events: string[];
  };
  screenshots: string[];
  changelog: ChangelogEntry[];
}
```

### Install Module

**POST** `/modules/{moduleId}/install`

Install a module for the current organization.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface InstallRequest {
  version?: string;
  config?: object;
}

// Response
interface InstallResponse {
  success: boolean;
  moduleId: string;
  installedVersion: string;
  message: string;
}
```

### Update Module

**PUT** `/modules/{moduleId}`

Update an installed module.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface UpdateRequest {
  version: string;
  config?: object;
}
```

### Uninstall Module

**DELETE** `/modules/{moduleId}`

Remove a module from the organization.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Response
interface UninstallResponse {
  success: boolean;
  message: string;
}
```

## 🗄️ Database API

Base URL: `https://your-domain.com/api/database`

### List Schemas

**GET** `/database/schemas`

Get list of database schemas accessible to current user.

**Headers**: `Authorization: Bearer <token>`

```typescript
interface Schema {
  name: string;
  tables: number;
  owner: string;
  created_at: string;
}

// Response
interface SchemasResponse {
  schemas: Schema[];
}
```

### List Tables

**GET** `/database/tables`

Get list of tables in specified schema.

**Query Parameters**:
- `schema`: Schema name (optional, defaults to public)

```typescript
interface Table {
  name: string;
  schema: string;
  columns: number;
  rows: number;
  size: string;
  created_at: string;
}

// Response
interface TablesResponse {
  tables: Table[];
  schema: string;
}
```

### Get Table Schema

**GET** `/database/tables/{tableName}/schema`

Get detailed schema information for a table.

**Parameters**:
- `tableName`: Name of the table
- `schema`: Schema name (query parameter)

```typescript
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default_value?: any;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_key_table?: string;
  foreign_key_column?: string;
}

interface TableSchema {
  table_name: string;
  schema: string;
  columns: Column[];
  indexes: Index[];
  constraints: Constraint[];
}
```

### Query Data

**POST** `/database/query`

Execute SQL query with results.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface QueryRequest {
  sql: string;
  parameters?: any[];
  schema?: string;
  limit?: number;
  offset?: number;
}

// Response
interface QueryResponse {
  success: boolean;
  data: any[];
  columns: string[];
  total_rows: number;
  execution_time_ms: number;
  affected_rows?: number;
}
```

### Get Table Data

**GET** `/database/tables/{tableName}/data`

Get data from a specific table with pagination and filtering.

**Query Parameters**:
- `schema`: Schema name
- `limit`: Number of rows (default: 50, max: 1000)
- `offset`: Skip rows (default: 0)
- `orderBy`: Column to sort by
- `orderDirection`: `asc` | `desc`
- `filter`: JSON filter conditions

```typescript
interface TableDataResponse {
  data: any[];
  columns: Column[];
  total: number;
  page: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

### Insert Row

**POST** `/database/tables/{tableName}/rows`

Insert new row into table.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface InsertRequest {
  data: object;
  schema?: string;
}

// Response
interface InsertResponse {
  success: boolean;
  id?: any;
  data: object;
}
```

### Update Row

**PUT** `/database/tables/{tableName}/rows/{rowId}`

Update existing row in table.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface UpdateRequest {
  data: object;
  schema?: string;
}

// Response
interface UpdateResponse {
  success: boolean;
  data: object;
  affected_rows: number;
}
```

### Delete Row

**DELETE** `/database/tables/{tableName}/rows/{rowId}`

Delete row from table.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Response
interface DeleteResponse {
  success: boolean;
  affected_rows: number;
}
```

## 📁 File Storage API

Base URL: `https://your-domain.com/api/storage`

### Upload File

**POST** `/storage/upload`

Upload file to object storage.

**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body**: Form data with file field

```typescript
// Response
interface UploadResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    bucket: string;
    path: string;
  };
}
```

### List Files

**GET** `/storage/files`

List files in storage bucket.

**Query Parameters**:
- `bucket`: Storage bucket name
- `prefix`: File path prefix
- `limit`: Number of files (default: 50)
- `offset`: Skip files (default: 0)

```typescript
interface StorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  updated_at: string;
}

// Response
interface FilesResponse {
  files: StorageFile[];
  total: number;
}
```

### Download File

**GET** `/storage/files/{fileId}/download`

Get download URL for file.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Response
interface DownloadResponse {
  download_url: string;
  expires_at: string;
}
```

### Delete File

**DELETE** `/storage/files/{fileId}`

Delete file from storage.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Response
interface DeleteFileResponse {
  success: boolean;
  message: string;
}
```

## 👥 User Management API

Base URL: `https://your-domain.com/api/users`

### Get Current User

**GET** `/users/me`

Get current user profile.

**Headers**: `Authorization: Bearer <token>`

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  preferences: object;
  created_at: string;
  last_login: string;
}
```

### Update Profile

**PUT** `/users/me`

Update current user profile.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
  preferences?: object;
}
```

### List Users (Admin)

**GET** `/users`

List all users (admin only).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit`: Number of users (default: 50)
- `offset`: Skip users (default: 0)
- `search`: Search query
- `role`: Filter by role

```typescript
// Response
interface UsersResponse {
  users: User[];
  total: number;
}
```

### Create User (Admin)

**POST** `/users`

Create new user (admin only).

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  roles?: string[];
}
```

### Update User (Admin)

**PUT** `/users/{userId}`

Update user information (admin only).

**Headers**: `Authorization: Bearer <token>`

### Delete User (Admin)

**DELETE** `/users/{userId}`

Delete user account (admin only).

**Headers**: `Authorization: Bearer <token>`

## 🔒 Permissions API

Base URL: `https://your-domain.com/api/permissions`

### Get User Permissions

**GET** `/permissions/me`

Get current user's permissions.

**Headers**: `Authorization: Bearer <token>`

```typescript
interface Permission {
  resource: string;
  action: string;
  scope: 'own' | 'team' | 'all';
  conditions?: object;
}

// Response
interface PermissionsResponse {
  permissions: Permission[];
  roles: string[];
}
```

### Check Permission

**POST** `/permissions/check`

Check if user has specific permission.

**Headers**: `Authorization: Bearer <token>`

```typescript
// Request
interface PermissionCheckRequest {
  resource: string;
  action: string;
  resourceId?: string;
}

// Response
interface PermissionCheckResponse {
  allowed: boolean;
  reason?: string;
}
```

### List Roles

**GET** `/permissions/roles`

Get available roles (admin only).

**Headers**: `Authorization: Bearer <token>`

```typescript
interface Role {
  name: string;
  description: string;
  permissions: Permission[];
  users_count: number;
}

// Response
interface RolesResponse {
  roles: Role[];
}
```

## ⚡ Real-time API

Base URL: `wss://your-domain.com/ws`

### WebSocket Connection

Connect to real-time updates via WebSocket.

```typescript
const ws = new WebSocket('wss://your-domain.com/ws');

// Authentication after connection
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

### Subscribe to Channel

```typescript
// Subscribe to table changes
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'table:users',
  schema: 'public'
}));

// Subscribe to module events
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'module:sales'
}));
```

### Message Format

```typescript
interface WebSocketMessage {
  type: 'insert' | 'update' | 'delete' | 'event';
  channel: string;
  payload: any;
  timestamp: string;
}
```

## 🌐 WebSocket Events

### Database Events

```typescript
// Table row inserted
{
  type: 'insert',
  channel: 'table:customers',
  payload: {
    table: 'customers',
    schema: 'sales',
    record: { id: '123', name: 'John Doe', ... },
    user_id: 'user-456'
  }
}

// Table row updated
{
  type: 'update', 
  channel: 'table:customers',
  payload: {
    table: 'customers',
    schema: 'sales',
    old_record: { id: '123', name: 'John', ... },
    record: { id: '123', name: 'John Doe', ... },
    user_id: 'user-456'
  }
}

// Table row deleted
{
  type: 'delete',
  channel: 'table:customers', 
  payload: {
    table: 'customers',
    schema: 'sales',
    old_record: { id: '123', name: 'John Doe', ... },
    user_id: 'user-456'
  }
}
```

### Module Events

```typescript
// Module activated
{
  type: 'event',
  channel: 'module:sales',
  payload: {
    event: 'module.activated',
    module_id: 'sales',
    user_id: 'user-123'
  }
}

// Custom business event
{
  type: 'event',
  channel: 'module:sales',
  payload: {
    event: 'sale.completed',
    sale_id: 'sale-789',
    amount: 1500.00,
    customer_id: 'customer-456'
  }
}
```

### System Events

```typescript
// User login
{
  type: 'event',
  channel: 'system',
  payload: {
    event: 'user.login',
    user_id: 'user-123',
    timestamp: '2024-08-26T10:30:00Z'
  }
}

// Module installed
{
  type: 'event',
  channel: 'system',
  payload: {
    event: 'module.installed',
    module_id: 'new-module',
    version: '1.0.0',
    installed_by: 'admin-user'
  }
}
```

## 🛠️ SDK Reference

### Core SDK

```typescript
import { PlatformSDK } from '@plataforma/sdk';

const platform = new PlatformSDK({
  baseUrl: 'https://your-domain.com',
  token: 'your-jwt-token'
});
```

### Authentication

```typescript
// Login
const session = await platform.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Logout
await platform.auth.logout();

// Check authentication status
const isAuthenticated = platform.auth.isAuthenticated();
```

### Database Operations

```typescript
// Query database
const result = await platform.database.query({
  sql: 'SELECT * FROM customers WHERE status = $1',
  parameters: ['active']
});

// Get table data
const customers = await platform.database.getTableData('customers', {
  schema: 'sales',
  limit: 100,
  orderBy: 'created_at',
  orderDirection: 'desc'
});

// Insert record
const newCustomer = await platform.database.insert('customers', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Module Management

```typescript
// List modules
const modules = await platform.modules.list();

// Install module
await platform.modules.install('sales-module', {
  version: '1.2.0'
});

// Get module API
const salesAPI = platform.modules.getAPI('sales-module');
const customers = await salesAPI.getCustomers();
```

### Real-time Subscriptions

```typescript
// Subscribe to database changes
platform.realtime.subscribe('table:customers', (event) => {
  console.log('Customer updated:', event.payload);
});

// Subscribe to module events
platform.realtime.subscribe('module:sales', (event) => {
  if (event.payload.event === 'sale.completed') {
    console.log('New sale:', event.payload);
  }
});

// Unsubscribe
platform.realtime.unsubscribe('table:customers');
```

### File Storage

```typescript
// Upload file
const uploadResult = await platform.storage.upload(file, {
  bucket: 'documents',
  path: 'customers/documents'
});

// List files
const files = await platform.storage.list({
  bucket: 'documents',
  prefix: 'customers/'
});

// Download file
const downloadUrl = await platform.storage.getDownloadUrl(fileId);
```

## ❌ Error Handling

### Error Response Format

All API errors follow this format:

```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| `200` | Success | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Invalid or missing authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (duplicate, etc.) |
| `422` | Validation Error | Request validation failed |
| `429` | Rate Limited | Too many requests |
| `500` | Server Error | Internal server error |

### Common Error Codes

```typescript
enum ErrorCodes {
  // Authentication
  INVALID_CREDENTIALS = 'AUTH001',
  TOKEN_EXPIRED = 'AUTH002',
  TOKEN_INVALID = 'AUTH003',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS = 'PERM001',
  RESOURCE_FORBIDDEN = 'PERM002',
  
  // Validation
  VALIDATION_FAILED = 'VAL001',
  REQUIRED_FIELD = 'VAL002',
  INVALID_FORMAT = 'VAL003',
  
  // Resources
  RESOURCE_NOT_FOUND = 'RES001',
  RESOURCE_CONFLICT = 'RES002',
  RESOURCE_LOCKED = 'RES003',
  
  // Database
  DATABASE_ERROR = 'DB001',
  QUERY_TIMEOUT = 'DB002',
  CONNECTION_FAILED = 'DB003',
  
  // Modules
  MODULE_NOT_FOUND = 'MOD001',
  MODULE_INSTALL_FAILED = 'MOD002',
  MODULE_DEPENDENCY_ERROR = 'MOD003'
}
```

### SDK Error Handling

```typescript
try {
  const result = await platform.database.query({ sql: 'SELECT * FROM users' });
} catch (error) {
  if (error instanceof PlatformError) {
    switch (error.code) {
      case 'AUTH002':
        // Token expired, refresh token
        await platform.auth.refresh();
        break;
      case 'PERM001':
        // Insufficient permissions
        console.error('Access denied');
        break;
      default:
        console.error('API Error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Rate Limiting

API endpoints are rate limited:

```typescript
// Rate limit headers in response
{
  'X-RateLimit-Limit': '1000',      // Requests per hour
  'X-RateLimit-Remaining': '950',   // Remaining requests
  'X-RateLimit-Reset': '1640995200' // Reset timestamp
}

// Rate limit exceeded error
{
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded. Please try again later.',
    details: {
      limit: 1000,
      window: '1h',
      retry_after: 3600
    }
  }
}
```

---

This API reference provides comprehensive documentation for all Plataforma.dev APIs. For specific use cases and examples, refer to the [Module Development Guide](./MODULE_DEVELOPMENT.md) and browse the [Developer Portal](./developers/) for interactive examples.