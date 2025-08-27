/**
 * User Management Page - Complete RBAC User Management UI
 * Admin interface for managing users, roles, and permissions
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus,
  Settings,
  Lock,
  Unlock,
  Crown,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { WindowCard, WindowButton, WindowInput, WindowToggle } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { UserWithRoles, Role, UserStats, CreateUserRequest, UpdateUserRequest } from '../../types/rbac';

interface UserManagementState {
  users: UserWithRoles[];
  roles: Role[];
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  selectedUsers: string[];
  filters: {
    search: string;
    role: string;
    department: string;
    status: 'all' | 'active' | 'inactive' | 'locked';
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  modals: {
    createUser: boolean;
    editUser: boolean;
    deleteUser: boolean;
    assignRole: boolean;
    bulkActions: boolean;
  };
  selectedUser: UserWithRoles | null;
}

export function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  
  const [state, setState] = useState<UserManagementState>({
    users: [],
    roles: [],
    stats: null,
    loading: false,
    error: null,
    selectedUsers: [],
    filters: {
      search: '',
      role: '',
      department: '',
      status: 'all'
    },
    pagination: {
      page: 1,
      limit: 25,
      total: 0,
      pages: 0
    },
    modals: {
      createUser: false,
      editUser: false,
      deleteUser: false,
      assignRole: false,
      bulkActions: false
    },
    selectedUser: null
  });

  // Check permissions
  const canCreateUsers = hasPermission('users:create');
  const canUpdateUsers = hasPermission('users:update');
  const canDeleteUsers = hasPermission('users:delete');
  const canManageRoles = hasPermission('users:manage_roles');
  const canViewStats = hasPermission('system:admin_panel');

  useEffect(() => {
    loadUsers();
    loadRoles();
    if (canViewStats) {
      loadStats();
    }
  }, [state.filters, state.pagination.page]);

  // =====================================================================
  // DATA LOADING
  // =====================================================================

  const loadUsers = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const queryParams = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
        ...(state.filters.search && { search: state.filters.search }),
        ...(state.filters.role && { role: state.filters.role }),
        ...(state.filters.department && { department: state.filters.department }),
        ...(state.filters.status !== 'all' && { 
          isActive: state.filters.status === 'active' ? 'true' : 'false',
          ...(state.filters.status === 'locked' && { isLocked: 'true' })
        })
      });

      const response = await fetch(`/api/rbac/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load users');

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        users: data.data,
        pagination: data.pagination,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load users',
        loading: false
      }));
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/rbac/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load roles');

      const data = await response.json();
      setState(prev => ({ ...prev, roles: data.data }));
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/rbac/stats/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setState(prev => ({ ...prev, stats: data.data }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // =====================================================================
  // USER OPERATIONS
  // =====================================================================

  const createUser = async (userData: CreateUserRequest) => {
    try {
      const response = await fetch('/api/rbac/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Failed to create user');

      await loadUsers();
      setState(prev => ({
        ...prev,
        modals: { ...prev.modals, createUser: false }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create user'
      }));
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserRequest) => {
    try {
      const response = await fetch(`/api/rbac/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Failed to update user');

      await loadUsers();
      setState(prev => ({
        ...prev,
        modals: { ...prev.modals, editUser: false },
        selectedUser: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update user'
      }));
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await updateUser(userId, { isActive: !isActive });
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/rbac/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ roleId })
      });

      if (!response.ok) throw new Error('Failed to assign role');

      await loadUsers();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      }));
    }
  };

  // =====================================================================
  // UI HELPERS
  // =====================================================================

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      'super_admin': 'bg-red-100 text-red-800 border-red-200',
      'admin': 'bg-orange-100 text-orange-800 border-orange-200',
      'manager': 'bg-blue-100 text-blue-800 border-blue-200',
      'user': 'bg-green-100 text-green-800 border-green-200',
      'readonly': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (user: UserWithRoles) => {
    if (user.isLocked) {
      return <Badge variant="destructive" className="text-xs">Locked</Badge>;
    }
    if (!user.isActive) {
      return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
    }
    return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Active</Badge>;
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  if (!hasPermission('users:read')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-6">
        <WindowCard title="Access Denied" className="max-w-md mx-auto mt-20">
          <div className="text-center py-8">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Insufficient Permissions
            </h3>
            <p className="text-gray-300">
              You don't have permission to access user management.
            </p>
          </div>
        </WindowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-gray-300">Manage users, roles, and permissions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <WindowButton
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={loadUsers}
              disabled={state.loading}
            >
              Refresh
            </WindowButton>
            
            {canCreateUsers && (
              <WindowButton
                variant="primary"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => setState(prev => ({
                  ...prev,
                  modals: { ...prev.modals, createUser: true }
                }))}
              >
                Add User
              </WindowButton>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {canViewStats && state.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <WindowCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{state.stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </WindowCard>
            
            <WindowCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-400">{state.stats.activeUsers}</p>
                </div>
                <Shield className="w-8 h-8 text-green-400" />
              </div>
            </WindowCard>
            
            <WindowCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Locked</p>
                  <p className="text-2xl font-bold text-red-400">{state.stats.lockedUsers}</p>
                </div>
                <Lock className="w-8 h-8 text-red-400" />
              </div>
            </WindowCard>
            
            <WindowCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Recent Logins</p>
                  <p className="text-2xl font-bold text-yellow-400">{state.stats.recentLogins}</p>
                </div>
                <Eye className="w-8 h-8 text-yellow-400" />
              </div>
            </WindowCard>
            
            <WindowCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">MFA Enabled</p>
                  <p className="text-2xl font-bold text-purple-400">{state.stats.usersWithMfa}</p>
                </div>
                <Crown className="w-8 h-8 text-purple-400" />
              </div>
            </WindowCard>
          </div>
        )}

        {/* Filters */}
        <WindowCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <WindowInput
                placeholder="Search users..."
                value={state.filters.search}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, search: e.target.value }
                }))}
                className="pl-10"
              />
            </div>
            
            <select
              value={state.filters.role}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, role: e.target.value }
              }))}
              className="px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-white/30 focus:outline-none"
            >
              <option value="">All Roles</option>
              {state.roles.map(role => (
                <option key={role.id} value={role.name}>{role.displayName}</option>
              ))}
            </select>
            
            <WindowInput
              placeholder="Department"
              value={state.filters.department}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, department: e.target.value }
              }))}
            />
            
            <select
              value={state.filters.status}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, status: e.target.value as any }
              }))}
              className="px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-white/30 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </WindowCard>

        {/* Users Table */}
        <WindowCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/20 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-semibold">User</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Roles</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Department</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Last Login</th>
                  <th className="text-right p-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                        <span className="text-gray-400">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : state.users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400">No users found</p>
                    </td>
                  </tr>
                ) : (
                  state.users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.slice(0, 2).map((role) => (
                            <Badge
                              key={role.id}
                              variant="outline"
                              className={`text-xs ${getRoleBadgeColor(role.name)}`}
                            >
                              {role.displayName}
                            </Badge>
                          ))}
                          {user.roles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.roles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300">{user.department || '-'}</span>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300">
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <WindowButton variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </WindowButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setState(prev => ({
                                  ...prev,
                                  selectedUser: user,
                                  modals: { ...prev.modals, editUser: true }
                                }));
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            
                            {canManageRoles && (
                              <DropdownMenuItem>
                                <Shield className="w-4 h-4 mr-2" />
                                Manage Roles
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {canUpdateUsers && (
                              <DropdownMenuItem
                                onClick={() => toggleUserStatus(user.id, user.isActive)}
                              >
                                {user.isActive ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            
                            {canDeleteUsers && user.id !== currentUser?.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    setState(prev => ({
                                      ...prev,
                                      selectedUser: user,
                                      modals: { ...prev.modals, deleteUser: true }
                                    }));
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {state.pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <p className="text-sm text-gray-400">
                Showing {((state.pagination.page - 1) * state.pagination.limit) + 1} to{' '}
                {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)} of{' '}
                {state.pagination.total} results
              </p>
              
              <div className="flex items-center space-x-2">
                <WindowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setState(prev => ({
                    ...prev,
                    pagination: { ...prev.pagination, page: prev.pagination.page - 1 }
                  }))}
                  disabled={state.pagination.page === 1}
                >
                  Previous
                </WindowButton>
                
                {Array.from({ length: Math.min(5, state.pagination.pages) }, (_, i) => {
                  const page = state.pagination.page <= 3 ? i + 1 : state.pagination.page - 2 + i;
                  if (page > state.pagination.pages) return null;
                  
                  return (
                    <WindowButton
                      key={page}
                      variant={page === state.pagination.page ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setState(prev => ({
                        ...prev,
                        pagination: { ...prev.pagination, page }
                      }))}
                    >
                      {page}
                    </WindowButton>
                  );
                })}
                
                <WindowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setState(prev => ({
                    ...prev,
                    pagination: { ...prev.pagination, page: prev.pagination.page + 1 }
                  }))}
                  disabled={state.pagination.page === state.pagination.pages}
                >
                  Next
                </WindowButton>
              </div>
            </div>
          )}
        </WindowCard>

        {/* Error Display */}
        {state.error && (
          <WindowCard className="bg-red-500/10 border-red-500/20">
            <div className="p-4 flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-red-200">{state.error}</p>
              <WindowButton
                variant="ghost"
                size="sm"
                onClick={() => setState(prev => ({ ...prev, error: null }))}
              >
                Dismiss
              </WindowButton>
            </div>
          </WindowCard>
        )}
      </div>

      {/* Create User Modal */}
      <Dialog 
        open={state.modals.createUser} 
        onOpenChange={(open) => setState(prev => ({
          ...prev,
          modals: { ...prev.modals, createUser: open }
        }))}
      >
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create New User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new user to the system with appropriate roles and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <CreateUserForm
            onSubmit={createUser}
            roles={state.roles}
            onCancel={() => setState(prev => ({
              ...prev,
              modals: { ...prev.modals, createUser: false }
            }))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
// CREATE USER FORM COMPONENT
// =====================================================================

interface CreateUserFormProps {
  onSubmit: (data: CreateUserRequest) => void;
  onCancel: () => void;
  roles: Role[];
}

function CreateUserForm({ onSubmit, onCancel, roles }: CreateUserFormProps) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    jobTitle: '',
    password: '',
    mustChangePassword: true,
    roleIds: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <WindowInput
          label="First Name"
          value={formData.firstName || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
        />
        <WindowInput
          label="Last Name"
          value={formData.lastName || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
        />
      </div>
      
      <WindowInput
        label="Full Name *"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      
      <WindowInput
        label="Email *"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
        <WindowInput
          label="Phone"
          value={formData.phone || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
        <WindowInput
          label="Department"
          value={formData.department || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
        />
      </div>
      
      <WindowInput
        label="Job Title"
        value={formData.jobTitle || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
      />
      
      <WindowInput
        label="Temporary Password"
        type="password"
        value={formData.password || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        placeholder="Leave empty to send invitation email"
      />
      
      <div className="flex items-center space-x-2">
        <WindowToggle
          checked={formData.mustChangePassword}
          onChange={(checked) => setFormData(prev => ({ ...prev, mustChangePassword: checked }))}
        />
        <label className="text-sm text-gray-300">Require password change on first login</label>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Roles</label>
        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`role-${role.id}`}
                checked={formData.roleIds?.includes(role.id) || false}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      roleIds: [...(prev.roleIds || []), role.id]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      roleIds: prev.roleIds?.filter(id => id !== role.id) || []
                    }));
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`role-${role.id}`} className="text-sm text-gray-300">
                {role.displayName}
                {role.description && (
                  <span className="text-xs text-gray-500 ml-2">({role.description})</span>
                )}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <DialogFooter>
        <WindowButton variant="ghost" onClick={onCancel}>
          Cancel
        </WindowButton>
        <WindowButton variant="primary" type="submit">
          Create User
        </WindowButton>
      </DialogFooter>
    </form>
  );
}

export default UserManagement;