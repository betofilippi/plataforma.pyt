/**
 * Tipos compartilhados da plataforma
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
}

export interface Module {
  id: string;
  name: string;
  domain: string;
  icon: string;
  color: string;
  isActive: boolean;
  route: string;
  description?: string;
}

export interface App {
  id: string;
  name: string;
  icon: string;
  route: string;
  category: 'system' | 'module';
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  moduleId?: string;
}