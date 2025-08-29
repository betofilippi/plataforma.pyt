import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  UserPlus,
  Shield,
  Eye,
  Edit3,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Calendar,
  Activity,
  Settings,
  Download,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { 
  WindowButton as Button, 
  WindowInput as Input, 
  StandardCard,
  AdminCard,
  StatusBadge,
  RoleBadge,
  PermissionBadge,
  ModuleBadge 
} from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface User {
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
  modules_access?: string[];
  login_count?: number;
  last_ip?: string;
  metadata?: Record<string, any>;
}

interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  permissions_required: string[];
  icon?: string;
}

interface UserManagementProps {
  users?: User[];
  modules?: Module[];
  onUserUpdate?: (user: User) => void;
  onUserDelete?: (userId: string) => void;
  onModuleAssign?: (userId: string, moduleIds: string[]) => void;
  readonly?: boolean;
}

// Mock data for demo
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'Admin User',
    first_name: 'Admin',
    last_name: 'User',
    roles: ['admin', 'super_admin'],
    permissions: ['*'],
    is_active: true,
    status: 'active',
    email_verified_at: '2024-01-15T10:00:00Z',
    last_login_at: '2024-08-28T08:30:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-08-28T08:30:00Z',
    modules_access: ['all'],
    login_count: 156,
    last_ip: '192.168.1.100',
  },
  {
    id: '2',
    email: 'john.doe@company.com',
    name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    roles: ['user', 'manager'],
    permissions: ['read:documents', 'write:documents', 'read:reports'],
    is_active: true,
    status: 'active',
    email_verified_at: '2024-02-20T14:00:00Z',
    last_login_at: '2024-08-27T16:45:00Z',
    created_at: '2024-02-20T14:00:00Z',
    updated_at: '2024-08-27T16:45:00Z',
    modules_access: ['documents', 'reports', 'dashboard'],
    login_count: 89,
    last_ip: '192.168.1.102',
  },
  {
    id: '3',
    email: 'sarah.wilson@company.com',
    name: 'Sarah Wilson',
    first_name: 'Sarah',
    last_name: 'Wilson',
    roles: ['user'],
    permissions: ['read:profile', 'write:profile'],
    is_active: true,
    status: 'pending',
    created_at: '2024-08-25T09:15:00Z',
    updated_at: '2024-08-25T09:15:00Z',
    modules_access: ['profile'],
    login_count: 0,
  },
  {
    id: '4',
    email: 'mike.brown@company.com',
    name: 'Mike Brown',
    first_name: 'Mike',
    last_name: 'Brown',
    roles: ['user'],
    permissions: [],
    is_active: false,
    status: 'suspended',
    email_verified_at: '2024-03-10T11:30:00Z',
    last_login_at: '2024-08-15T12:00:00Z',
    created_at: '2024-03-10T11:30:00Z',
    updated_at: '2024-08-20T10:30:00Z',
    modules_access: [],
    login_count: 23,
    last_ip: '192.168.1.105',
  },
];

const mockModules: Module[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with system overview',
    category: 'Core',
    is_active: true,
    permissions_required: ['read:dashboard'],
    icon: 'LayoutDashboard',
  },
  {
    id: 'documents',
    name: 'Document Management',
    description: 'Manage and organize documents',
    category: 'Content',
    is_active: true,
    permissions_required: ['read:documents', 'write:documents'],
    icon: 'FileText',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Generate and view reports',
    category: 'Analytics',
    is_active: true,
    permissions_required: ['read:reports'],
    icon: 'BarChart3',
  },
  {
    id: 'settings',
    name: 'System Settings',
    description: 'Configure system preferences',
    category: 'Administration',
    is_active: true,
    permissions_required: ['read:settings', 'write:settings'],
    icon: 'Settings',
  },
  {
    id: 'billing',
    name: 'Billing & Invoices',
    description: 'Manage billing and payments',
    category: 'Finance',
    is_active: false,
    permissions_required: ['read:billing', 'write:billing'],
    icon: 'CreditCard',
  },
];

export default function UserManagement({
  users = mockUsers,
  modules = mockModules,
  onUserUpdate,
  onUserDelete,
  onModuleAssign,
  readonly = false,
}: UserManagementProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created_at' | 'last_login_at' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.roles.some(role => role === roleFilter);
      
      return matchesSearch && matchesStatus && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'last_login_at':
          aValue = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
          bValue = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, statusFilter, roleFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      pending: users.filter(u => u.status === 'pending').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      rejected: users.filter(u => u.status === 'rejected').length,
      adminUsers: users.filter(u => u.roles.includes('admin')).length,
      recentLogins: users.filter(u => 
        u.last_login_at && 
        new Date(u.last_login_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length,
    };
  }, [users]);

  const getStatusIconComponent = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'rejected':
        return XCircle;
      case 'suspended':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getStatusBadge = (status: string) => {
    const StatusIcon = getStatusIconComponent(status);
    return (
      <StatusBadge 
        status={status as 'active' | 'pending' | 'suspended' | 'rejected'}
      >
        <div className="flex items-center gap-1">
          <StatusIcon size={12} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </StatusBadge>
    );
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(user => user.id));
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <AdminCard padding="sm">
          <div className="text-center">
            <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-300">Total Users</div>
          </div>
        </AdminCard>
        
        <AdminCard padding="sm">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.active}</div>
            <div className="text-sm text-gray-300">Active</div>
          </div>
        </AdminCard>
        
        <AdminCard padding="sm">
          <div className="text-center">
            <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
            <div className="text-sm text-gray-300">Pending</div>
          </div>
        </AdminCard>
        
        <AdminCard padding="sm">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.suspended}</div>
            <div className="text-sm text-gray-300">Suspended</div>
          </div>
        </AdminCard>
        
        <AdminCard padding="sm">
          <div className="text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.rejected}</div>
            <div className="text-sm text-gray-300">Rejected</div>
          </div>
        </AdminCard>
        
        <AdminCard padding="sm">
          <div className="text-center">
            <Shield className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.adminUsers}</div>
            <div className="text-sm text-gray-300">Admins</div>
          </div>
        </AdminCard>
        
        <AdminCard padding="sm">
          <div className="text-center">
            <Activity className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.recentLogins}</div>
            <div className="text-sm text-gray-300">Recent Logins</div>
          </div>
        </AdminCard>
      </div>

      {/* Filters and Actions */}
      <AdminCard title="Filters & Actions">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="email">Sort by Email</SelectItem>
                <SelectItem value="created_at">Sort by Created</SelectItem>
                <SelectItem value="last_login_at">Sort by Login</SelectItem>
                <SelectItem value="status">Sort by Status</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPermissionMatrix(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Permissions
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedUserIds.length} user(s) selected
              </span>
              <Button size="sm" variant="outline">
                <UserCheck className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button size="sm" variant="outline">
                <UserX className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button size="sm" variant="outline">
                <AlertCircle className="h-4 w-4 mr-2" />
                Suspend
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedUserIds([])}>
                Clear
              </Button>
            </div>
          )}
      </AdminCard>

      {/* Users Table */}
      <AdminCard 
        title={
          <div className="flex items-center justify-between">
            <span>Users ({filteredUsers.length})</span>
            {!readonly && (
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        }
      >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role & Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => handleUserSelect(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} alt={user.name} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {user.email_verified_at && (
                            <StatusBadge status="active" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              Verified
                            </StatusBadge>
                          )}
                          {user.login_count !== undefined && (
                            <span className="text-xs text-gray-500">
                              {user.login_count} logins
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <RoleBadge key={role} role={role} className="text-xs" />
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.permissions.length} permissions
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.modules_access ? (
                        <div className="flex flex-wrap gap-1">
                          {user.modules_access.slice(0, 2).map(moduleId => {
                            const module = modules.find(m => m.id === moduleId);
                            return (
                              <ModuleBadge key={moduleId} module={module?.name || moduleId} className="text-xs" />
                            );
                          })}
                          {user.modules_access.length > 2 && (
                            <ModuleBadge module={`+${user.modules_access.length - 2} more`} className="text-xs" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No modules assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.last_login_at ? (
                        <>
                          <div>{new Date(user.last_login_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(user.last_login_at).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">Never logged in</span>
                      )}
                      {user.last_ip && (
                        <div className="text-xs text-gray-500 mt-1">
                          IP: {user.last_ip}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openUserDetails(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openUserDetails(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {!readonly && (
                            <>
                              <DropdownMenuItem>
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" />
                                Manage Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Assign Modules
                              </DropdownMenuItem>
                              <Separator />
                              <DropdownMenuItem className="text-red-600">
                                <UserX className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
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
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No users have been added yet.'
                }
              </p>
            </div>
          )}
      </AdminCard>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedUser && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.name} />
                    <AvatarFallback>
                      {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                    <p className="text-sm">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="text-sm">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Roles</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedUser.roles.map(role => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created</Label>
                    <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Last Login</Label>
                    <p className="text-sm">
                      {selectedUser.last_login_at 
                        ? new Date(selectedUser.last_login_at).toLocaleString()
                        : 'Never logged in'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Login Count</Label>
                    <p className="text-sm">{selectedUser.login_count || 0} times</p>
                  </div>
                  {selectedUser.last_ip && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Last IP Address</Label>
                      <p className="text-sm">{selectedUser.last_ip}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Permissions & Module Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 mb-3 block">
                        System Permissions
                      </Label>
                      <div className="space-y-2">
                        {selectedUser.permissions.length > 0 ? (
                          selectedUser.permissions.map(permission => (
                            <PermissionBadge key={permission} permission={permission} />
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No system permissions assigned</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600 mb-3 block">
                        Module Access
                      </Label>
                      <div className="space-y-2">
                        {selectedUser.modules_access && selectedUser.modules_access.length > 0 ? (
                          selectedUser.modules_access.map(moduleId => {
                            const module = modules.find(m => m.id === moduleId);
                            return (
                              <div key={moduleId} className="flex items-center gap-2">
                                <ModuleBadge module={module?.name || moduleId} />
                                {module && (
                                  <span className="text-xs text-gray-500">
                                    {module.description}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500">No module access assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetails(false)}>
              Close
            </Button>
            {!readonly && selectedUser && (
              <Button onClick={() => {
                // Handle edit action
                console.log('Edit user:', selectedUser.id);
              }}>
                Edit User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Matrix Modal */}
      <Dialog open={showPermissionMatrix} onOpenChange={setShowPermissionMatrix}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Module Permission Matrix</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Manage which modules each user can access. Changes are saved automatically.
            </div>
            
            {/* Matrix Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">User</TableHead>
                    {modules.filter(m => m.is_active).map(module => (
                      <TableHead key={module.id} className="text-center min-w-32">
                        <div>
                          <div className="font-medium">{module.name}</div>
                          <div className="text-xs text-gray-500">{module.category}</div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      {modules.filter(m => m.is_active).map(module => (
                        <TableCell key={module.id} className="text-center">
                          <Checkbox
                            checked={user.modules_access?.includes(module.id) || false}
                            onCheckedChange={(checked) => {
                              if (onModuleAssign && !readonly) {
                                const currentModules = user.modules_access || [];
                                const newModules = checked
                                  ? [...currentModules, module.id]
                                  : currentModules.filter(id => id !== module.id);
                                onModuleAssign(user.id, newModules);
                              }
                            }}
                            disabled={readonly}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionMatrix(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}