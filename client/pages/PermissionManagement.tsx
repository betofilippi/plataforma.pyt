import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { usePermissions } from '../contexts/PermissionContext';
import { useToast } from '../components/ui/use-toast';
// import PermissionMatrix from '../components/rbac/PermissionMatrix';
// import RoleSelector from '../components/rbac/RoleSelector';
// import { AdminOnly } from '../components/rbac/PermissionGate';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  userName?: string;
  userEmail?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  roleName?: string;
  roleDisplayName?: string;
  permissionName?: string;
  permissionDisplayName?: string;
  reason?: string;
  performedAt: string;
  moduleName?: string;
}

export const PermissionManagement: React.FC = () => {
  const { isSuperAdmin, hasPermission } = usePermissions();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Audit log state
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const canManageUsers = hasPermission('system.users.admin') || hasPermission('system.users.update');
  const canViewAudit = hasPermission('system.audit.read');
  const canManageRoles = hasPermission('system.roles.admin') || hasPermission('system.roles.update');

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (activeTab === 'audit' && canViewAudit) {
      loadAuditLog();
    }
  }, [activeTab, canViewAudit]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    try {
      setAuditLoading(true);
      const response = await fetch('/api/permission-audit?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load audit log');
      }

      const result = await response.json();
      setAuditLog(result.data || []);
    } catch (error) {
      console.error('Error loading audit log:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit log',
        variant: 'destructive'
      });
    } finally {
      setAuditLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'role_assigned':
        return 'bg-green-100 text-green-800';
      case 'role_revoked':
        return 'bg-red-100 text-red-800';
      case 'permission_granted':
        return 'bg-blue-100 text-blue-800';
      case 'permission_revoked':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isSuperAdmin() && !canManageUsers && !canViewAudit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have permission to access the permission management system.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Permission Management</h1>
        <Badge variant="secondary">
          {isSuperAdmin() ? 'Super Admin' : 'Administrator'}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" disabled={!canManageUsers}>
            User Management
          </TabsTrigger>
          <TabsTrigger value="matrix" disabled={!canManageRoles}>
            Permission Matrix
          </TabsTrigger>
          <TabsTrigger value="roles" disabled={!canManageRoles}>
            Role Management
          </TabsTrigger>
          <TabsTrigger value="audit" disabled={!canViewAudit}>
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <div>
                    <Label htmlFor="search-users">Search Users</Label>
                    <Input
                      id="search-users"
                      placeholder="Search by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4">Loading users...</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedUser?.id === user.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {user.role}
                            </Badge>
                            <Badge
                              variant={user.isActive ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {user.lastLogin && (
                            <div className="text-xs text-gray-500 mt-1">
                              Last login: {formatDate(user.lastLogin)}
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Details and Role Management */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <div className="space-y-6">
                  {/* User Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>User Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Name</Label>
                          <div className="font-medium">{selectedUser.name}</div>
                        </div>
                        <div>
                          <Label>Email</Label>
                          <div className="font-medium">{selectedUser.email}</div>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Badge variant={selectedUser.isActive ? "default" : "destructive"}>
                            {selectedUser.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div>
                          <Label>Created</Label>
                          <div>{formatDate(selectedUser.createdAt)}</div>
                        </div>
                        {selectedUser.lastLogin && (
                          <div>
                            <Label>Last Login</Label>
                            <div>{formatDate(selectedUser.lastLogin)}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Role Management */}
                  {/* <RoleSelector
                    userId={selectedUser.id}
                    onRolesChanged={() => {
                      // Refresh user data or update local state
                      loadUsers();
                    }}
                  /> */}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-gray-500">
                      Select a user to manage their permissions
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          {/* <PermissionMatrix /> */}
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Role creation and editing interface would go here.
                <br />
                This feature requires additional UI components for role CRUD operations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Permission Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-8">Loading audit log...</div>
              ) : (
                <div className="space-y-3">
                  {auditLog.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No audit entries found
                    </div>
                  ) : (
                    auditLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="border rounded p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge className={getActionBadgeColor(entry.action)}>
                              {entry.action.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <div>
                              <div className="font-medium">
                                {entry.userName || 'System'} 
                                {entry.targetUserName && ` → ${entry.targetUserName}`}
                              </div>
                              <div className="text-sm text-gray-600">
                                {entry.userEmail} 
                                {entry.targetUserEmail && ` → ${entry.targetUserEmail}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {formatDate(entry.performedAt)}
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          {entry.roleName && (
                            <div className="text-sm">
                              <span className="font-medium">Role:</span>{' '}
                              {entry.roleDisplayName || entry.roleName}
                            </div>
                          )}
                          {entry.permissionName && (
                            <div className="text-sm">
                              <span className="font-medium">Permission:</span>{' '}
                              {entry.permissionDisplayName || entry.permissionName}
                            </div>
                          )}
                          {entry.moduleName && (
                            <div className="text-sm">
                              <span className="font-medium">Module:</span>{' '}
                              {entry.moduleName}
                            </div>
                          )}
                          {entry.reason && (
                            <div className="text-sm">
                              <span className="font-medium">Reason:</span>{' '}
                              {entry.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionManagement;