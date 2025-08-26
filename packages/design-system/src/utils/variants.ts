import { cn } from './cn';

/**
 * Variant creator utility for creating component variants
 */
export interface VariantConfig {
  base?: string;
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<{
    conditions: Record<string, string | boolean>;
    className: string;
  }>;
}

export function createVariant(config: VariantConfig) {
  return function getVariantClasses(props: Record<string, any> = {}) {
    const { base = '', variants = {}, defaultVariants = {}, compoundVariants = [] } = config;
    
    // Start with base classes
    let classes = [base];
    
    // Apply variants
    Object.keys(variants).forEach((variantKey) => {
      const variantValue = props[variantKey] ?? defaultVariants[variantKey];
      
      if (variantValue && variants[variantKey][variantValue]) {
        classes.push(variants[variantKey][variantValue]);
      }
    });
    
    // Apply compound variants
    compoundVariants.forEach(({ conditions, className }) => {
      const allConditionsMet = Object.keys(conditions).every(
        (key) => props[key] === conditions[key]
      );
      
      if (allConditionsMet) {
        classes.push(className);
      }
    });
    
    // Merge with any additional classes
    return cn(...classes, props.className);
  };
}

// Example button variants using the variant creator
export const buttonVariants = createVariant({
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2',
  variants: {
    variant: {
      primary: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg',
      ghost: 'hover:bg-white/10 text-white',
      outline: 'border-2 border-white/20 hover:bg-white/10 text-white',
    },
    size: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: 'false',
  },
  compoundVariants: [
    {
      conditions: { variant: 'ghost', size: 'sm' },
      className: 'px-2 py-1',
    },
  ],
});

// Input variants
export const inputVariants = createVariant({
  base: 'w-full rounded-lg text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2',
  variants: {
    variant: {
      default: 'bg-white/10 border border-white/20',
      filled: 'bg-white/20 border-0',
      outlined: 'bg-transparent border-2 border-white/30',
    },
    size: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-3 text-base',
    },
    state: {
      default: 'focus:ring-purple-500',
      error: 'border-red-400 focus:ring-red-500',
      success: 'border-green-400 focus:ring-green-500',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    state: 'default',
  },
});

// Card variants
export const cardVariants = createVariant({
  base: 'rounded-xl',
  variants: {
    variant: {
      default: 'bg-white/10 backdrop-blur-xl border border-white/20',
      subtle: 'bg-white/5 backdrop-blur-md border border-white/10',
      strong: 'bg-white/15 backdrop-blur-2xl border border-white/30',
      solid: 'bg-gray-800 border border-gray-700',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
    shadow: {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'lg',
    shadow: 'xl',
  },
});