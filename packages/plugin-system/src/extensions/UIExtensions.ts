import { EventEmitter } from 'eventemitter3';
import React from 'react';

/**
 * UI Extension System
 * Manages plugin-provided UI components and extension slots
 */
export class UIExtensionManager extends EventEmitter {
  private components = new Map<string, ComponentRegistry>();
  private slots = new Map<string, SlotRegistry>();
  private themes = new Map<string, ThemeRegistry>();
  private routes = new Map<string, RouteRegistry>();

  constructor(private readonly options: UIExtensionOptions = {}) {
    super();
    this.initializeBuiltInSlots();
  }

  // Component Management

  /**
   * Register a UI component
   */
  registerComponent(
    pluginId: string,
    componentName: string,
    component: React.ComponentType<any>,
    options: ComponentRegistrationOptions = {}
  ): void {
    const fullName = `${pluginId}.${componentName}`;
    
    if (this.components.has(fullName)) {
      throw new Error(`Component '${fullName}' is already registered`);
    }

    const registration: ComponentRegistry = {
      pluginId,
      componentName,
      fullName,
      component,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.components.set(fullName, registration);
    this.emit('component:registered', { registration });
  }

  /**
   * Unregister a UI component
   */
  unregisterComponent(pluginId: string, componentName: string): void {
    const fullName = `${pluginId}.${componentName}`;
    const registration = this.components.get(fullName);
    
    if (registration) {
      this.components.delete(fullName);
      this.emit('component:unregistered', { registration });
    }
  }

  /**
   * Get registered component
   */
  getComponent(fullName: string): React.ComponentType<any> | undefined {
    const registration = this.components.get(fullName);
    if (registration) {
      registration.usageCount++;
      return registration.component;
    }
    return undefined;
  }

  /**
   * Get all components from a plugin
   */
  getPluginComponents(pluginId: string): ComponentRegistry[] {
    return Array.from(this.components.values())
      .filter(reg => reg.pluginId === pluginId);
  }

  // Slot Management

  /**
   * Register component in a UI slot
   */
  registerSlotComponent(
    pluginId: string,
    slotName: string,
    component: React.ComponentType<any>,
    options: SlotComponentOptions = {}
  ): void {
    if (!this.slots.has(slotName)) {
      // Auto-create slot if it doesn't exist
      this.createSlot(slotName, {
        description: `Auto-created slot for ${slotName}`,
        allowMultiple: true
      });
    }

    const slot = this.slots.get(slotName)!;
    const componentId = `${pluginId}.${slotName}.${Date.now()}`;

    const slotComponent: SlotComponent = {
      id: componentId,
      pluginId,
      component,
      options,
      registeredAt: new Date(),
      priority: options.priority || 0
    };

    slot.components.set(componentId, slotComponent);
    
    // Sort by priority
    this.sortSlotComponents(slot);
    
    this.emit('slot:component:registered', { slotName, component: slotComponent });
  }

  /**
   * Unregister component from slot
   */
  unregisterSlotComponent(pluginId: string, slotName: string, componentId?: string): void {
    const slot = this.slots.get(slotName);
    if (!slot) return;

    if (componentId) {
      const component = slot.components.get(componentId);
      if (component && component.pluginId === pluginId) {
        slot.components.delete(componentId);
        this.emit('slot:component:unregistered', { slotName, component });
      }
    } else {
      // Remove all components from plugin
      const componentsToRemove: string[] = [];
      for (const [id, component] of slot.components) {
        if (component.pluginId === pluginId) {
          componentsToRemove.push(id);
        }
      }
      
      for (const id of componentsToRemove) {
        const component = slot.components.get(id)!;
        slot.components.delete(id);
        this.emit('slot:component:unregistered', { slotName, component });
      }
    }
  }

  /**
   * Create a new UI slot
   */
  createSlot(slotName: string, options: SlotDefinition): void {
    if (this.slots.has(slotName)) {
      throw new Error(`Slot '${slotName}' already exists`);
    }

    const slot: SlotRegistry = {
      name: slotName,
      definition: options,
      components: new Map(),
      createdAt: new Date()
    };

    this.slots.set(slotName, slot);
    this.emit('slot:created', { slot });
  }

  /**
   * Get components for a slot
   */
  getSlotComponents(slotName: string): React.ComponentType<any>[] {
    const slot = this.slots.get(slotName);
    if (!slot) return [];

    return Array.from(slot.components.values())
      .map(comp => comp.component);
  }

  /**
   * Render slot components
   */
  renderSlot(slotName: string, props: any = {}): React.ReactElement[] {
    const slot = this.slots.get(slotName);
    if (!slot) return [];

    return Array.from(slot.components.values()).map((slotComponent, index) => {
      const Component = slotComponent.component;
      return React.createElement(Component, {
        key: slotComponent.id,
        ...props,
        slotProps: {
          slotName,
          pluginId: slotComponent.pluginId,
          index
        }
      });
    });
  }

  // Theme Management

  /**
   * Register a theme
   */
  registerTheme(
    pluginId: string,
    themeName: string,
    theme: UITheme,
    options: ThemeOptions = {}
  ): void {
    const fullName = `${pluginId}.${themeName}`;

    if (this.themes.has(fullName)) {
      throw new Error(`Theme '${fullName}' is already registered`);
    }

    const registration: ThemeRegistry = {
      pluginId,
      themeName,
      fullName,
      theme,
      options,
      registeredAt: new Date()
    };

    this.themes.set(fullName, registration);
    this.emit('theme:registered', { registration });
  }

  /**
   * Unregister a theme
   */
  unregisterTheme(pluginId: string, themeName: string): void {
    const fullName = `${pluginId}.${themeName}`;
    const registration = this.themes.get(fullName);
    
    if (registration) {
      this.themes.delete(fullName);
      this.emit('theme:unregistered', { registration });
    }
  }

  /**
   * Get theme
   */
  getTheme(fullName: string): UITheme | undefined {
    const registration = this.themes.get(fullName);
    return registration?.theme;
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): ThemeInfo[] {
    return Array.from(this.themes.values()).map(reg => ({
      fullName: reg.fullName,
      pluginId: reg.pluginId,
      themeName: reg.themeName,
      displayName: reg.theme.displayName,
      description: reg.theme.description,
      preview: reg.theme.preview
    }));
  }

  // Route Management

  /**
   * Register a route
   */
  registerRoute(
    pluginId: string,
    path: string,
    component: React.ComponentType<any>,
    options: RouteOptions = {}
  ): void {
    if (this.routes.has(path)) {
      throw new Error(`Route '${path}' is already registered`);
    }

    const registration: RouteRegistry = {
      pluginId,
      path,
      component,
      options,
      registeredAt: new Date()
    };

    this.routes.set(path, registration);
    this.emit('route:registered', { registration });
  }

  /**
   * Unregister a route
   */
  unregisterRoute(path: string): void {
    const registration = this.routes.get(path);
    if (registration) {
      this.routes.delete(path);
      this.emit('route:unregistered', { registration });
    }
  }

  /**
   * Get route component
   */
  getRouteComponent(path: string): React.ComponentType<any> | undefined {
    const registration = this.routes.get(path);
    return registration?.component;
  }

  /**
   * Get all plugin routes
   */
  getPluginRoutes(pluginId: string): RouteInfo[] {
    return Array.from(this.routes.values())
      .filter(reg => reg.pluginId === pluginId)
      .map(reg => ({
        path: reg.path,
        pluginId: reg.pluginId,
        title: reg.options.title,
        icon: reg.options.icon,
        requiresAuth: reg.options.requiresAuth || false
      }));
  }

  // Utility Methods

  /**
   * Get extension statistics
   */
  getExtensionStats(): UIExtensionStats {
    const pluginStats: Record<string, PluginUIStats> = {};

    // Count components by plugin
    for (const component of this.components.values()) {
      if (!pluginStats[component.pluginId]) {
        pluginStats[component.pluginId] = {
          components: 0,
          slotComponents: 0,
          themes: 0,
          routes: 0
        };
      }
      pluginStats[component.pluginId].components++;
    }

    // Count slot components by plugin
    for (const slot of this.slots.values()) {
      for (const component of slot.components.values()) {
        if (!pluginStats[component.pluginId]) {
          pluginStats[component.pluginId] = {
            components: 0,
            slotComponents: 0,
            themes: 0,
            routes: 0
          };
        }
        pluginStats[component.pluginId].slotComponents++;
      }
    }

    // Count themes by plugin
    for (const theme of this.themes.values()) {
      if (!pluginStats[theme.pluginId]) {
        pluginStats[theme.pluginId] = {
          components: 0,
          slotComponents: 0,
          themes: 0,
          routes: 0
        };
      }
      pluginStats[theme.pluginId].themes++;
    }

    // Count routes by plugin
    for (const route of this.routes.values()) {
      if (!pluginStats[route.pluginId]) {
        pluginStats[route.pluginId] = {
          components: 0,
          slotComponents: 0,
          themes: 0,
          routes: 0
        };
      }
      pluginStats[route.pluginId].routes++;
    }

    return {
      totalComponents: this.components.size,
      totalSlots: this.slots.size,
      totalThemes: this.themes.size,
      totalRoutes: this.routes.size,
      pluginStats
    };
  }

  /**
   * Clean up extensions for a plugin
   */
  cleanupPlugin(pluginId: string): void {
    // Remove components
    const componentsToRemove = Array.from(this.components.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    for (const name of componentsToRemove) {
      this.components.delete(name);
    }

    // Remove slot components
    for (const slot of this.slots.values()) {
      const componentsToRemove = Array.from(slot.components.entries())
        .filter(([, comp]) => comp.pluginId === pluginId)
        .map(([id]) => id);
      
      for (const id of componentsToRemove) {
        slot.components.delete(id);
      }
    }

    // Remove themes
    const themesToRemove = Array.from(this.themes.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    for (const name of themesToRemove) {
      this.themes.delete(name);
    }

    // Remove routes
    const routesToRemove = Array.from(this.routes.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([path]) => path);
    
    for (const path of routesToRemove) {
      this.routes.delete(path);
    }

    this.emit('plugin:cleanup', { pluginId });
  }

  // Private Methods

  private initializeBuiltInSlots(): void {
    const builtInSlots = [
      {
        name: 'header.left',
        definition: { description: 'Left side of header', allowMultiple: true }
      },
      {
        name: 'header.right',
        definition: { description: 'Right side of header', allowMultiple: true }
      },
      {
        name: 'sidebar.top',
        definition: { description: 'Top of sidebar', allowMultiple: true }
      },
      {
        name: 'sidebar.bottom',
        definition: { description: 'Bottom of sidebar', allowMultiple: true }
      },
      {
        name: 'main.toolbar',
        definition: { description: 'Main content toolbar', allowMultiple: true }
      },
      {
        name: 'main.content',
        definition: { description: 'Main content area', allowMultiple: false }
      },
      {
        name: 'modal.actions',
        definition: { description: 'Modal dialog actions', allowMultiple: true }
      },
      {
        name: 'settings.tabs',
        definition: { description: 'Settings page tabs', allowMultiple: true }
      }
    ];

    for (const { name, definition } of builtInSlots) {
      this.createSlot(name, definition);
    }
  }

  private sortSlotComponents(slot: SlotRegistry): void {
    const sortedEntries = Array.from(slot.components.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);
    
    slot.components.clear();
    
    for (const [id, component] of sortedEntries) {
      slot.components.set(id, component);
    }
  }
}

// Types and Interfaces

export interface UIExtensionOptions {
  strictMode?: boolean;
  maxComponentsPerPlugin?: number;
}

export interface ComponentRegistrationOptions {
  displayName?: string;
  description?: string;
  props?: Record<string, any>;
  lazy?: boolean;
}

export interface ComponentRegistry {
  pluginId: string;
  componentName: string;
  fullName: string;
  component: React.ComponentType<any>;
  options: ComponentRegistrationOptions;
  registeredAt: Date;
  usageCount: number;
}

export interface SlotDefinition {
  description: string;
  allowMultiple: boolean;
  maxComponents?: number;
  requiredProps?: string[];
}

export interface SlotComponentOptions {
  priority?: number;
  condition?: (props: any) => boolean;
  wrapper?: React.ComponentType<any>;
}

export interface SlotComponent {
  id: string;
  pluginId: string;
  component: React.ComponentType<any>;
  options: SlotComponentOptions;
  registeredAt: Date;
  priority: number;
}

export interface SlotRegistry {
  name: string;
  definition: SlotDefinition;
  components: Map<string, SlotComponent>;
  createdAt: Date;
}

export interface UITheme {
  displayName: string;
  description: string;
  colors: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  components?: Record<string, any>;
  preview?: string;
}

export interface ThemeOptions {
  darkMode?: boolean;
  highContrast?: boolean;
}

export interface ThemeRegistry {
  pluginId: string;
  themeName: string;
  fullName: string;
  theme: UITheme;
  options: ThemeOptions;
  registeredAt: Date;
}

export interface ThemeInfo {
  fullName: string;
  pluginId: string;
  themeName: string;
  displayName: string;
  description: string;
  preview?: string;
}

export interface RouteOptions {
  title?: string;
  icon?: string;
  requiresAuth?: boolean;
  exact?: boolean;
}

export interface RouteRegistry {
  pluginId: string;
  path: string;
  component: React.ComponentType<any>;
  options: RouteOptions;
  registeredAt: Date;
}

export interface RouteInfo {
  path: string;
  pluginId: string;
  title?: string;
  icon?: string;
  requiresAuth: boolean;
}

export interface PluginUIStats {
  components: number;
  slotComponents: number;
  themes: number;
  routes: number;
}

export interface UIExtensionStats {
  totalComponents: number;
  totalSlots: number;
  totalThemes: number;
  totalRoutes: number;
  pluginStats: Record<string, PluginUIStats>;
}