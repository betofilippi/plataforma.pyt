import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Check,
  X,
  Search,
  Filter,
  Settings,
  Shield,
  Eye,
  Edit3,
  Trash2,
  UserPlus,
  RefreshCw,
  Download,
  Upload,
  MoreHorizontal,
  Clock,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

// Types for admin functionality
interface AdminUser {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  email_verified_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  permissions_required: string[];
}

interface UserModulePermission {
  user_id: string;
  module_id: string;
  granted: boolean;
  granted_at?: string;
  granted_by?: string;
}

// Mock data - In real app, this would come from API
const mockUsers: AdminUser[] = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Smith',
    first_name: 'John',
    last_name: 'Smith',
    roles: ['user'],
    permissions: ['read:profile'],
    is_active: true,
    status: 'pending',
    created_at: '2024-08-20T10:00:00Z',
    updated_at: '2024-08-20T10:00:00Z',
  },
  {
    id: '2',
    email: 'sarah@example.com',
    name: 'Sarah Johnson',
    first_name: 'Sarah',
    last_name: 'Johnson',
    roles: ['admin'],
    permissions: ['read:users', 'write:users', 'delete:users'],
    is_active: true,
    status: 'active',
    last_login_at: '2024-08-27T15:30:00Z',
    created_at: '2024-08-15T08:00:00Z',
    updated_at: '2024-08-27T15:30:00Z',
  },
  {
    id: '3',
    email: 'mike@example.com',
    name: 'Mike Wilson',
    first_name: 'Mike',
    last_name: 'Wilson',
    roles: ['user'],
    permissions: ['read:profile'],
    is_active: false,
    status: 'rejected',
    created_at: '2024-08-18T12:00:00Z',
    updated_at: '2024-08-19T09:00:00Z',
  },
];

const mockModules: Module[] = [
  {
    id: 'documents',
    name: 'Document Management',
    description: 'Manage and organize documents',
    category: 'Content',
    is_active: true,
    permissions_required: ['read:documents', 'write:documents'],
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'View system analytics and reports',
    category: 'Analytics',
    is_active: true,
    permissions_required: ['read:analytics'],
  },
  {
    id: 'settings',
    name: 'System Settings',
    description: 'Configure system settings',
    category: 'System',
    is_active: true,
    permissions_required: ['read:settings', 'write:settings'],
  },
  {
    id: 'billing',
    name: 'Billing Management',
    description: 'Manage billing and subscriptions',
    category: 'Finance',
    is_active: false,
    permissions_required: ['read:billing', 'write:billing'],
  },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [modules] = useState<Module[]>(mockModules);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  // Check if current user is admin
  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      pending: users.filter(u => u.status === 'pending').length,
      active: users.filter(u => u.status === 'active').length,
      rejected: users.filter(u => u.status === 'rejected').length,
      suspended: users.filter(u => u.status === 'suspended').length,
    };
  }, [users]);

  const handleUserAction = (userId: string, action: 'approve' | 'reject' | 'suspend' | 'activate') => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { 
            ...user, 
            status: action === 'approve' ? 'active' : 
                   action === 'reject' ? 'rejected' :
                   action === 'suspend' ? 'suspended' : 'active',
            updated_at: new Date().toISOString(),
          }
        : user
    ));
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    
    const action = bulkAction as 'approve' | 'reject' | 'suspend' | 'activate';
    selectedUsers.forEach(userId => {
      handleUserAction(userId, action);
    });
    
    setSelectedUsers([]);
    setBulkAction('');
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length 
        ? [] 
        : filteredUsers.map(user => user.id)
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
    };
    
    return (
      <Badge variant="secondary" className={colors[status as keyof typeof colors] || ''}>
        <div className="flex items-center gap-1">
          {getStatusIcon(status)}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </Badge>
    );
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">You need administrator privileges to access this panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-gray-600">Manage users, permissions, and system modules</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.suspended}</p>
                <p className="text-sm text-gray-600">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="permissions">Module Permissions</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Bulk Actions */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-4 mt-4 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedUsers.length} user(s) selected
                  </span>
                  
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Choose action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve Users</SelectItem>
                      <SelectItem value="reject">Reject Users</SelectItem>
                      <SelectItem value="suspend">Suspend Users</SelectItem>
                      <SelectItem value="activate">Activate Users</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleBulkAction} disabled={!bulkAction}>
                    Apply Action
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAllUsers}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} alt={user.name} />
                            <AvatarFallback>
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.first_name} {user.last_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.roles.join(', ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell>
                        {user.last_login_at 
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserAction(user.id, 'approve')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserAction(user.id, 'reject')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedUserForEdit(user);
                                setShowUserModal(true);
                              }}>
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'suspend')}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Suspend
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Module Permissions Matrix</CardTitle>
              <p className="text-sm text-gray-600">
                Manage which modules each user can access
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Active modules list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.filter(m => m.is_active).map(module => (
                    <Card key={module.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{module.name}</h3>
                          <Badge variant="outline">{module.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {module.permissions_required.map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Permission assignment would go here */}
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Permission Matrix</h3>
                  <p className="text-gray-600 mb-4">
                    This feature allows you to assign modules to specific users.
                  </p>
                  <Button variant="outline">
                    Configure Permissions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">User Registration</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-approve">Auto-approve new users</Label>
                    <Switch id="auto-approve" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-verification">Require email verification</Label>
                    <Switch id="email-verification" defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Security Settings</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="two-factor">Require 2FA for admins</Label>
                    <Switch id="two-factor" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="session-timeout">Auto session timeout</Label>
                    <Switch id="session-timeout" defaultChecked />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">System Maintenance</h3>
                <div className="flex gap-4">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Users
                  </Button>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Users
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUserForEdit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input 
                    id="first-name" 
                    defaultValue={selectedUserForEdit.first_name || ''} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input 
                    id="last-name" 
                    defaultValue={selectedUserForEdit.last_name || ''} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  defaultValue={selectedUserForEdit.email} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roles">Roles</Label>
                <Select defaultValue={selectedUserForEdit.roles[0]}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is-active" 
                  defaultChecked={selectedUserForEdit.is_active}
                />
                <Label htmlFor="is-active">Active User</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowUserModal(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}