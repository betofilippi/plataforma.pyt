import { CorsOptions } from 'cors';

/**
 * All registered .app domains for the ecosystem
 */
const APP_DOMAINS = [
  'plataforma.app',
  'planilha.app',
  'admininstrativo.app',
  'estoques.app',
  'faturamento.app',
  'franquias.app',
  'identidade.app',
  'inpi.app',
  'juridico.app',
  'loja.app',
  'montagem.app',
  'pessoal.app',
  'produtos.app',
  'suporte.app',
  'transportadora.app',
  'tributario.app',
];

/**
 * Development origins
 */
const DEV_ORIGINS = [
  'http://localhost:3000', // plataforma.app core
  'http://localhost:3001', // planilha.app
  'http://localhost:3002', // admininstrativo.app (or current Vite)
  'http://localhost:3003', // estoques.app
  'http://localhost:3004', // faturamento.app
  'http://localhost:3005', // franquias.app
  'http://localhost:3006', // identidade.app
  'http://localhost:3008', // inpi.app
  'http://localhost:3009', // juridico.app
  'http://localhost:3010', // loja.app
  'http://localhost:3011', // montagem.app
  'http://localhost:3012', // pessoal.app
  'http://localhost:3013', // produtos.app
  'http://localhost:3014', // suporte.app
  'http://localhost:3015', // transportadora.app
  'http://localhost:3016', // tributario.app
  'http://localhost:3017', // Alternative port when others are busy
  'http://localhost:3018', // Alternative port
  'http://localhost:3019', // Alternative port
  'http://localhost:3020', // Alternative Vite ports
  'http://localhost:3021', // Alternative Vite ports
  'http://localhost:3022', // Alternative Vite ports
  'http://localhost:3023', // Alternative Vite ports
  'http://localhost:3024', // Alternative Vite ports
  'http://localhost:3025', // Alternative Vite ports
  'http://localhost:3026', // Alternative Vite ports
  'http://localhost:3027', // Alternative Vite ports
  'http://localhost:3028', // Alternative Vite ports
  'http://localhost:3029', // Alternative Vite ports
  'http://localhost:3030', // Current Vite port (vite.config.ts)
  'http://localhost:3031', // Alternative Vite ports
  'http://localhost:3032', // Alternative Vite ports
  'http://localhost:3033', // Alternative Vite ports
  'http://localhost:3034', // Alternative Vite ports
  'http://localhost:3035', // Alternative Vite ports
  'http://localhost:3036', // Alternative Vite ports
  'http://localhost:3037', // Alternative Vite ports
  'http://localhost:3038', // Alternative Vite ports
  'http://localhost:3039', // Alternative Vite ports
  'http://localhost:3040', // Alternative Vite ports
  'http://localhost:3041', // Alternative Vite ports
  'http://localhost:3042', // Alternative Vite ports
  'http://localhost:3043', // Alternative Vite ports
  'http://localhost:3044', // Alternative Vite ports
  'http://localhost:3045', // Alternative Vite ports
  'http://localhost:3046', // Alternative Vite ports
  'http://localhost:3047', // Alternative Vite ports
  'http://localhost:3048', // Alternative Vite ports (CURRENT)
  'http://localhost:3049', // Alternative Vite ports
  'http://localhost:3050', // Alternative Vite ports
  'http://localhost:5173', // Vite dev server
];

/**
 * Production origins
 */
const PROD_ORIGINS = [
  ...APP_DOMAINS.map(domain => `https://${domain}`),
  ...APP_DOMAINS.map(domain => `https://www.${domain}`),
];

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // In development, allow all localhost origins + production domains for testing
    return DEV_ORIGINS.includes(origin) || PROD_ORIGINS.includes(origin);
  }

  // In production, only allow registered .app domains
  return PROD_ORIGINS.includes(origin);
}

/**
 * Dynamic CORS configuration for SSO
 */
export const ssoCorsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // Enable cookies for SSO
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-SSO-Token',
    'X-Module-ID',
    'X-Session-ID',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Session-Expires',
    'X-SSO-Status',
  ],
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false,
};

/**
 * Standard CORS configuration (less permissive)
 */
export const standardCorsConfig: CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://plataforma.app', 'https://www.plataforma.app']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

/**
 * Get allowed origins list
 */
export function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  return isDevelopment ? [...DEV_ORIGINS, ...PROD_ORIGINS] : PROD_ORIGINS;
}

/**
 * Check if domain is a registered module domain
 */
export function isModuleDomain(domain: string): boolean {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
  return APP_DOMAINS.includes(cleanDomain);
}

/**
 * Extract domain from origin
 */
export function extractDomain(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname.replace(/^www\./, '');
  } catch (error) {
    return origin.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Get module ID from domain
 */
export function getModuleIdFromDomain(domain: string): string | null {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Handle core domain
  if (cleanDomain === 'plataforma.app') {
    return 'plataforma';
  }

  // Handle module domains
  const match = cleanDomain.match(/^([^.]+)\.app$/);
  if (match && APP_DOMAINS.includes(cleanDomain)) {
    return match[1];
  }

  return null;
}

/**
 * CORS middleware factory for specific modules
 */
export function createModuleCorsConfig(moduleId: string): CorsOptions {
  return {
    ...ssoCorsConfig,
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Allow core domain and specific module domain
      const allowedDomains = [
        'plataforma.app',
        `${moduleId}.app`,
      ];

      const isDevelopment = process.env.NODE_ENV !== 'production';
      const allowedOrigins = isDevelopment
        ? [...DEV_ORIGINS, ...allowedDomains.map(d => `https://${d}`), ...allowedDomains.map(d => `https://www.${d}`)]
        : [...allowedDomains.map(d => `https://${d}`), ...allowedDomains.map(d => `https://www.${d}`)];

      if (allowedOrigins.includes(origin!)) {
        callback(null, true);
      } else {
        console.warn(`Module CORS blocked origin for ${moduleId}: ${origin}`);
        callback(new Error(`Not allowed by CORS policy for module ${moduleId}`));
      }
    },
  };
}

/**
 * Development CORS (very permissive)
 */
export const devCorsConfig: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
};

export default ssoCorsConfig;