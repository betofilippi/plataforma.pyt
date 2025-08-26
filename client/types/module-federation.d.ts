/**
 * TypeScript declarations for Module Federation
 */

declare module '@remote/*' {
  const component: any;
  export = component;
}

declare module '\0virtual:remote-*' {
  const component: any;
  export = component;
}

declare module '\0virtual:shared-*' {
  const dependency: any;
  export = dependency;
}

declare global {
  interface ImportMeta {
    env: {
      DEV?: boolean;
      PROD?: boolean;
      [key: string]: any;
    };
    hot?: {
      accept: (callback?: () => void) => void;
      on: (event: string, callback: (data: any) => void) => void;
    };
  }

  interface Window {
    __PLATAFORMA_MODULE_FEDERATION__?: {
      registry: import('@plataforma/vite-plugin-module-federation').ModuleRegistry;
      shared: Record<string, any>;
      version: string;
    };
    
    __PLATAFORMA_SHARED__?: {
      dependencies: Record<string, any>;
      resolved: Map<string, any>;
      resolve: (name: string, version?: string) => any;
      register: (name: string, module: any) => void;
    };
    
    __PLATAFORMA_MODULE_LOADER__?: import('@plataforma/vite-plugin-module-federation').ModuleRegistry;
  }
}

export {};