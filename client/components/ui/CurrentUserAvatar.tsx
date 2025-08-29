import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut, UserCog, Mail, Calendar, Shield, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface CurrentUserAvatarProps {
  size?: "sm" | "md" | "lg";
  showDropdown?: boolean;
  showName?: boolean;
  className?: string;
}

export function CurrentUserAvatar({ 
  size = "md", 
  showDropdown = true, 
  showName = false,
  className = "" 
}: CurrentUserAvatarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Size variants
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (!user) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-700 rounded-full flex items-center justify-center ${className}`}>
        <User className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} text-gray-400`} />
      </div>
    );
  }

  // Generate initials from name or email
  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const initials = getInitials(user.name || '', user.email);

  // Generate avatar URL or fallback to initials
  const avatarUrl = user.avatarUrl || 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}&backgroundColor=6366f1&textColor=ffffff`;

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      await logout();
      navigate("/login");
    }
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    const roleStr = String(role || 'user').toLowerCase();
    switch (roleStr) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'developer': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!showDropdown) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${sizeClasses[size]} relative group`}>
          {/* Gradient background */}
          <div className={`${sizeClasses[size]} absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full opacity-90`}></div>
          
          {/* Avatar container */}
          <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border-2 border-gray-700/50`}>
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.name || user.email}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <UserCircle2 className={`text-white ${size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}`} />
              </div>
            )}
          </div>
          
          {/* Online status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
        </div>
        {showName && (
          <div className="hidden md:block">
            <div className={`font-medium text-gray-900 ${textSizes[size]}`}>
              {user.name || user.email.split('@')[0]}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className={`flex items-center space-x-2 hover:bg-gray-700/30 rounded-lg p-1 transition-all duration-200 focus:outline-none ${className}`}>
        <div className={`${sizeClasses[size]} relative group cursor-pointer`}>
          {/* Gradient background with animation */}
          <div className={`${sizeClasses[size]} absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full opacity-90 group-hover:opacity-100 transition-opacity duration-200`}></div>
          
          {/* Avatar container */}
          <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border-2 border-gray-700/50 group-hover:border-gray-600/50 transition-colors`}>
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.name || user.email}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <UserCircle2 className={`text-white ${size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}`} />
              </div>
            )}
          </div>
          
          {/* Online status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
        </div>
        {showName && (
          <div className="hidden md:block">
            <div className={`font-medium text-gray-900 ${textSizes[size]}`}>
              {user.name || user.email.split('@')[0]}
            </div>
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* User Info Header */}
        <DropdownMenuLabel className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 relative">
              <div className="h-12 w-12 absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full opacity-90"></div>
              <div className="h-12 w-12 relative rounded-full overflow-hidden border-2 border-gray-200">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name || user.email}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <UserCircle2 className="text-white w-7 h-7" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="text-sm text-gray-500 truncate flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {user.email}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {String(user.role || 'user')}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Account Info */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Criado em
              </span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            {user.lastLogin && (
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>Último acesso</span>
                <span>{formatDate(user.lastLogin)}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem 
          onClick={() => navigate('/profile')}
          className="cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Meu Perfil
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </DropdownMenuItem>

        {(user.role === 'admin' || user.role === 'developer') && (
          <DropdownMenuItem 
            onClick={() => navigate('/admin/settings')}
            className="cursor-pointer"
          >
            <UserCog className="w-4 h-4 mr-2" />
            Admin
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CurrentUserAvatar;