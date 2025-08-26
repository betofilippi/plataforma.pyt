import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  Package, 
  User, 
  Settings, 
  LogOut, 
  Upload,
  Home,
  BarChart3,
  Shield
} from 'lucide-react';

import { Button } from '@plataforma/design-system';
import { useAuth } from '../hooks/useAuth';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Module Registry
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Plataforma.app Marketplace
                </p>
              </div>
            </Link>

            {/* Search Bar - Hidden on small screens */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <SearchBar />
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-2">
              {user ? (
                <>
                  <Button
                    variant={isActive('/') ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to="/">
                      <Home className="w-4 h-4 mr-2" />
                      Home
                    </Link>
                  </Button>

                  <Button
                    variant={isActive('/publish') ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to="/publish">
                      <Upload className="w-4 h-4 mr-2" />
                      Publish
                    </Link>
                  </Button>

                  <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to="/dashboard">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>

                  {user.role === 'admin' && (
                    <Button
                      variant={isActive('/admin') ? 'default' : 'ghost'}
                      size="sm"
                      asChild
                    >
                      <Link to="/admin">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </Link>
                    </Button>
                  )}

                  <UserMenu user={user} />
                </>
              ) : (
                <>
                  <Button
                    variant={isActive('/') ? 'default' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to="/">
                      <Home className="w-4 h-4 mr-2" />
                      Browse
                    </Link>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link to="/login">
                      Sign In
                    </Link>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    asChild
                  >
                    <Link to="/register">
                      Sign Up
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden mt-3">
            <SearchBar />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Module Registry
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Discover, share, and manage modules for the Plataforma.app ecosystem.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Developers
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link 
                    to="/docs/getting-started" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Getting Started
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/docs/publishing" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Publishing Guide
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/docs/api" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    API Reference
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Support
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link 
                    to="/help" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/status" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    System Status
                  </Link>
                </li>
                <li>
                  <a 
                    href="mailto:support@plataforma.app" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Legal
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link 
                    to="/privacy" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/terms" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/security" 
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Security Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/50 dark:border-slate-700/50 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                © 2024 Plataforma.app. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  v1.0.0
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    All systems operational
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;