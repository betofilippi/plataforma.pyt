import { EventEmitter } from 'eventemitter3';

/**
 * Data Extension System
 * Manages data transformation hooks, validators, and processors
 */
export class DataExtensionManager extends EventEmitter {
  private transformers = new Map<string, DataTransformerRegistry>();
  private validators = new Map<string, DataValidatorRegistry>();
  private processors = new Map<string, DataProcessorRegistry>();
  private formatters = new Map<string, DataFormatterRegistry>();
  private aggregators = new Map<string, DataAggregatorRegistry>();

  constructor(private readonly options: DataExtensionOptions = {}) {
    super();
    this.initializeBuiltInExtensions();
  }

  // Data Transformers

  /**
   * Register a data transformer
   */
  registerTransformer(
    pluginId: string,
    name: string,
    transformer: DataTransformer,
    options: TransformerOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.transformers.has(fullName)) {
      throw new Error(`Data transformer '${fullName}' is already registered`);
    }

    const registration: DataTransformerRegistry = {
      pluginId,
      name,
      fullName,
      transformer,
      options,
      registeredAt: new Date(),
      usageCount: 0,
      lastUsed: null
    };

    this.transformers.set(fullName, registration);
    this.emit('transformer:registered', { registration });
  }

  /**
   * Unregister a data transformer
   */
  unregisterTransformer(pluginId: string, name: string): void {
    const fullName = `${pluginId}.${name}`;
    const registration = this.transformers.get(fullName);
    
    if (registration) {
      this.transformers.delete(fullName);
      this.emit('transformer:unregistered', { registration });
    }
  }

  /**
   * Apply data transformation
   */
  async transform(
    transformerName: string,
    data: any,
    context?: DataTransformContext
  ): Promise<DataTransformResult> {
    const registration = this.transformers.get(transformerName);
    if (!registration) {
      throw new Error(`Data transformer '${transformerName}' not found`);
    }

    try {
      registration.usageCount++;
      registration.lastUsed = new Date();

      const startTime = Date.now();
      const result = await registration.transformer.transform(data, context || {});
      const endTime = Date.now();

      this.emit('transformer:used', {
        transformerName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        success: true
      });

      return {
        success: true,
        data: result,
        transformer: transformerName,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('transformer:error', {
        transformerName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transformer: transformerName
      };
    }
  }

  /**
   * Apply multiple transformers in sequence
   */
  async transformPipeline(
    transformerNames: string[],
    data: any,
    context?: DataTransformContext
  ): Promise<DataTransformResult> {
    let currentData = data;
    let totalTime = 0;
    const appliedTransformers: string[] = [];

    for (const transformerName of transformerNames) {
      const result = await this.transform(transformerName, currentData, context);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          transformer: transformerName,
          appliedTransformers
        };
      }
      
      currentData = result.data;
      totalTime += result.executionTime || 0;
      appliedTransformers.push(transformerName);
    }

    return {
      success: true,
      data: currentData,
      executionTime: totalTime,
      appliedTransformers
    };
  }

  // Data Validators

  /**
   * Register a data validator
   */
  registerValidator(
    pluginId: string,
    name: string,
    validator: DataValidator,
    options: ValidatorOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.validators.has(fullName)) {
      throw new Error(`Data validator '${fullName}' is already registered`);
    }

    const registration: DataValidatorRegistry = {
      pluginId,
      name,
      fullName,
      validator,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.validators.set(fullName, registration);
    this.emit('validator:registered', { registration });
  }

  /**
   * Validate data
   */
  async validate(
    validatorName: string,
    data: any,
    context?: DataValidationContext
  ): Promise<DataValidationResult> {
    const registration = this.validators.get(validatorName);
    if (!registration) {
      throw new Error(`Data validator '${validatorName}' not found`);
    }

    try {
      registration.usageCount++;
      
      const startTime = Date.now();
      const result = await registration.validator.validate(data, context || {});
      const endTime = Date.now();

      this.emit('validator:used', {
        validatorName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        valid: result.valid
      });

      return {
        ...result,
        validator: validatorName,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('validator:error', {
        validatorName,
        pluginId: registration.pluginId,
        error
      });

      return {
        valid: false,
        errors: [`Validator error: ${error instanceof Error ? error.message : String(error)}`],
        validator: validatorName
      };
    }
  }

  /**
   * Validate with multiple validators
   */
  async validateAll(
    validatorNames: string[],
    data: any,
    context?: DataValidationContext
  ): Promise<DataValidationResult> {
    const results = await Promise.all(
      validatorNames.map(name => this.validate(name, data, context))
    );

    const allErrors = results.flatMap(r => r.errors || []);
    const allWarnings = results.flatMap(r => r.warnings || []);
    const isValid = results.every(r => r.valid);

    return {
      valid: isValid,
      errors: allErrors,
      warnings: allWarnings,
      validators: validatorNames
    };
  }

  // Data Processors

  /**
   * Register a data processor
   */
  registerProcessor(
    pluginId: string,
    name: string,
    processor: DataProcessor,
    options: ProcessorOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.processors.has(fullName)) {
      throw new Error(`Data processor '${fullName}' is already registered`);
    }

    const registration: DataProcessorRegistry = {
      pluginId,
      name,
      fullName,
      processor,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.processors.set(fullName, registration);
    this.emit('processor:registered', { registration });
  }

  /**
   * Process data
   */
  async process(
    processorName: string,
    data: any[],
    context?: DataProcessingContext
  ): Promise<DataProcessingResult> {
    const registration = this.processors.get(processorName);
    if (!registration) {
      throw new Error(`Data processor '${processorName}' not found`);
    }

    try {
      registration.usageCount++;
      
      const startTime = Date.now();
      const result = await registration.processor.process(data, context || {});
      const endTime = Date.now();

      this.emit('processor:used', {
        processorName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        inputCount: data.length,
        outputCount: result.length
      });

      return {
        success: true,
        data: result,
        processor: processorName,
        executionTime: endTime - startTime,
        inputCount: data.length,
        outputCount: result.length
      };
    } catch (error) {
      this.emit('processor:error', {
        processorName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processor: processorName
      };
    }
  }

  // Data Formatters

  /**
   * Register a data formatter
   */
  registerFormatter(
    pluginId: string,
    name: string,
    formatter: DataFormatter,
    options: FormatterOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.formatters.has(fullName)) {
      throw new Error(`Data formatter '${fullName}' is already registered`);
    }

    const registration: DataFormatterRegistry = {
      pluginId,
      name,
      fullName,
      formatter,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.formatters.set(fullName, registration);
    this.emit('formatter:registered', { registration });
  }

  /**
   * Format data
   */
  async format(
    formatterName: string,
    data: any,
    format: string,
    context?: DataFormatContext
  ): Promise<DataFormatResult> {
    const registration = this.formatters.get(formatterName);
    if (!registration) {
      throw new Error(`Data formatter '${formatterName}' not found`);
    }

    try {
      registration.usageCount++;
      
      const startTime = Date.now();
      const result = await registration.formatter.format(data, format, context || {});
      const endTime = Date.now();

      this.emit('formatter:used', {
        formatterName,
        pluginId: registration.pluginId,
        format,
        executionTime: endTime - startTime
      });

      return {
        success: true,
        data: result,
        formatter: formatterName,
        format,
        executionTime: endTime - startTime
      };
    } catch (error) {
      this.emit('formatter:error', {
        formatterName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        formatter: formatterName,
        format
      };
    }
  }

  // Data Aggregators

  /**
   * Register a data aggregator
   */
  registerAggregator(
    pluginId: string,
    name: string,
    aggregator: DataAggregator,
    options: AggregatorOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.aggregators.has(fullName)) {
      throw new Error(`Data aggregator '${fullName}' is already registered`);
    }

    const registration: DataAggregatorRegistry = {
      pluginId,
      name,
      fullName,
      aggregator,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.aggregators.set(fullName, registration);
    this.emit('aggregator:registered', { registration });
  }

  /**
   * Aggregate data
   */
  async aggregate(
    aggregatorName: string,
    data: any[],
    groupBy?: string | string[],
    context?: DataAggregationContext
  ): Promise<DataAggregationResult> {
    const registration = this.aggregators.get(aggregatorName);
    if (!registration) {
      throw new Error(`Data aggregator '${aggregatorName}' not found`);
    }

    try {
      registration.usageCount++;
      
      const startTime = Date.now();
      const result = await registration.aggregator.aggregate(data, groupBy, context || {});
      const endTime = Date.now();

      this.emit('aggregator:used', {
        aggregatorName,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        inputCount: data.length,
        outputCount: result.length
      });

      return {
        success: true,
        data: result,
        aggregator: aggregatorName,
        executionTime: endTime - startTime,
        inputCount: data.length,
        outputCount: result.length
      };
    } catch (error) {
      this.emit('aggregator:error', {
        aggregatorName,
        pluginId: registration.pluginId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        aggregator: aggregatorName
      };
    }
  }

  // Utility Methods

  /**
   * Get available extensions
   */
  getAvailableExtensions(): DataExtensionInfo {
    return {
      transformers: Array.from(this.transformers.keys()),
      validators: Array.from(this.validators.keys()),
      processors: Array.from(this.processors.keys()),
      formatters: Array.from(this.formatters.keys()),
      aggregators: Array.from(this.aggregators.keys())
    };
  }

  /**
   * Get extension statistics
   */
  getExtensionStats(): DataExtensionStats {
    const stats: DataExtensionStats = {
      totalTransformers: this.transformers.size,
      totalValidators: this.validators.size,
      totalProcessors: this.processors.size,
      totalFormatters: this.formatters.size,
      totalAggregators: this.aggregators.size,
      pluginStats: {}
    };

    // Aggregate stats by plugin
    const allRegistries = [
      ...this.transformers.values(),
      ...this.validators.values(),
      ...this.processors.values(),
      ...this.formatters.values(),
      ...this.aggregators.values()
    ];

    for (const registry of allRegistries) {
      if (!stats.pluginStats[registry.pluginId]) {
        stats.pluginStats[registry.pluginId] = {
          transformers: 0,
          validators: 0,
          processors: 0,
          formatters: 0,
          aggregators: 0,
          totalUsage: 0
        };
      }

      const pluginStats = stats.pluginStats[registry.pluginId];
      pluginStats.totalUsage += registry.usageCount;

      if (this.transformers.has(registry.fullName)) {
        pluginStats.transformers++;
      } else if (this.validators.has(registry.fullName)) {
        pluginStats.validators++;
      } else if (this.processors.has(registry.fullName)) {
        pluginStats.processors++;
      } else if (this.formatters.has(registry.fullName)) {
        pluginStats.formatters++;
      } else if (this.aggregators.has(registry.fullName)) {
        pluginStats.aggregators++;
      }
    }

    return stats;
  }

  /**
   * Clean up extensions for a plugin
   */
  cleanupPlugin(pluginId: string): void {
    // Remove transformers
    const transformersToRemove = Array.from(this.transformers.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    transformersToRemove.forEach(name => this.transformers.delete(name));

    // Remove validators
    const validatorsToRemove = Array.from(this.validators.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    validatorsToRemove.forEach(name => this.validators.delete(name));

    // Remove processors
    const processorsToRemove = Array.from(this.processors.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    processorsToRemove.forEach(name => this.processors.delete(name));

    // Remove formatters
    const formattersToRemove = Array.from(this.formatters.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    formattersToRemove.forEach(name => this.formatters.delete(name));

    // Remove aggregators
    const aggregatorsToRemove = Array.from(this.aggregators.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    aggregatorsToRemove.forEach(name => this.aggregators.delete(name));

    this.emit('plugin:cleanup', { pluginId });
  }

  // Private Methods

  private initializeBuiltInExtensions(): void {
    // Built-in transformers
    this.registerTransformer('system', 'lowercase', {
      transform: async (data: string) => data.toLowerCase()
    });

    this.registerTransformer('system', 'uppercase', {
      transform: async (data: string) => data.toUpperCase()
    });

    this.registerTransformer('system', 'trim', {
      transform: async (data: string) => data.trim()
    });

    this.registerTransformer('system', 'json_parse', {
      transform: async (data: string) => JSON.parse(data)
    });

    this.registerTransformer('system', 'json_stringify', {
      transform: async (data: any) => JSON.stringify(data)
    });

    // Built-in validators
    this.registerValidator('system', 'required', {
      validate: async (data: any) => ({
        valid: data !== null && data !== undefined && data !== '',
        errors: data === null || data === undefined || data === '' ? ['Field is required'] : []
      })
    });

    this.registerValidator('system', 'email', {
      validate: async (data: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          valid: emailRegex.test(data),
          errors: emailRegex.test(data) ? [] : ['Invalid email format']
        };
      }
    });

    this.registerValidator('system', 'url', {
      validate: async (data: string) => {
        try {
          new URL(data);
          return { valid: true, errors: [] };
        } catch {
          return { valid: false, errors: ['Invalid URL format'] };
        }
      }
    });

    // Built-in formatters
    this.registerFormatter('system', 'number', {
      format: async (data: number, format: string) => {
        switch (format) {
          case 'currency':
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(data);
          case 'percentage':
            return new Intl.NumberFormat('en-US', {
              style: 'percent',
              minimumFractionDigits: 2
            }).format(data);
          default:
            return data.toString();
        }
      }
    });

    this.registerFormatter('system', 'date', {
      format: async (data: Date | string, format: string) => {
        const date = new Date(data);
        switch (format) {
          case 'short':
            return date.toLocaleDateString();
          case 'long':
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          case 'iso':
            return date.toISOString();
          default:
            return date.toString();
        }
      }
    });

    // Built-in aggregators
    this.registerAggregator('system', 'sum', {
      aggregate: async (data: number[]) => [data.reduce((sum, val) => sum + val, 0)]
    });

    this.registerAggregator('system', 'average', {
      aggregate: async (data: number[]) => [data.reduce((sum, val) => sum + val, 0) / data.length]
    });

    this.registerAggregator('system', 'count', {
      aggregate: async (data: any[]) => [data.length]
    });
  }
}

// Types and Interfaces

export interface DataExtensionOptions {
  maxConcurrentTransforms?: number;
  transformTimeout?: number;
}

// Data Transformer Types
export interface DataTransformer {
  transform(data: any, context: DataTransformContext): Promise<any>;
}

export interface TransformerOptions {
  description?: string;
  inputType?: string;
  outputType?: string;
  cacheable?: boolean;
}

export interface DataTransformContext {
  pluginId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface DataTransformResult {
  success: boolean;
  data?: any;
  error?: string;
  transformer?: string;
  executionTime?: number;
  appliedTransformers?: string[];
}

export interface DataTransformerRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  transformer: DataTransformer;
  options: TransformerOptions;
  registeredAt: Date;
  usageCount: number;
  lastUsed: Date | null;
}

// Data Validator Types
export interface DataValidator {
  validate(data: any, context: DataValidationContext): Promise<DataValidationResult>;
}

export interface ValidatorOptions {
  description?: string;
  inputType?: string;
  async?: boolean;
}

export interface DataValidationContext {
  field?: string;
  schema?: any;
  metadata?: Record<string, any>;
}

export interface DataValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  validator?: string;
  validators?: string[];
  executionTime?: number;
}

export interface DataValidatorRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  validator: DataValidator;
  options: ValidatorOptions;
  registeredAt: Date;
  usageCount: number;
}

// Data Processor Types
export interface DataProcessor {
  process(data: any[], context: DataProcessingContext): Promise<any[]>;
}

export interface ProcessorOptions {
  description?: string;
  inputType?: string;
  outputType?: string;
  streaming?: boolean;
}

export interface DataProcessingContext {
  batchSize?: number;
  parallel?: boolean;
  metadata?: Record<string, any>;
}

export interface DataProcessingResult {
  success: boolean;
  data?: any[];
  error?: string;
  processor?: string;
  executionTime?: number;
  inputCount?: number;
  outputCount?: number;
}

export interface DataProcessorRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  processor: DataProcessor;
  options: ProcessorOptions;
  registeredAt: Date;
  usageCount: number;
}

// Data Formatter Types
export interface DataFormatter {
  format(data: any, format: string, context: DataFormatContext): Promise<string>;
}

export interface FormatterOptions {
  description?: string;
  supportedFormats: string[];
  inputType?: string;
}

export interface DataFormatContext {
  locale?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

export interface DataFormatResult {
  success: boolean;
  data?: string;
  error?: string;
  formatter?: string;
  format?: string;
  executionTime?: number;
}

export interface DataFormatterRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  formatter: DataFormatter;
  options: FormatterOptions;
  registeredAt: Date;
  usageCount: number;
}

// Data Aggregator Types
export interface DataAggregator {
  aggregate(
    data: any[],
    groupBy?: string | string[],
    context?: DataAggregationContext
  ): Promise<any[]>;
}

export interface AggregatorOptions {
  description?: string;
  inputType?: string;
  outputType?: string;
  supportedOperations: string[];
}

export interface DataAggregationContext {
  operation?: string;
  metadata?: Record<string, any>;
}

export interface DataAggregationResult {
  success: boolean;
  data?: any[];
  error?: string;
  aggregator?: string;
  executionTime?: number;
  inputCount?: number;
  outputCount?: number;
}

export interface DataAggregatorRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  aggregator: DataAggregator;
  options: AggregatorOptions;
  registeredAt: Date;
  usageCount: number;
}

// Statistics Types
export interface DataExtensionInfo {
  transformers: string[];
  validators: string[];
  processors: string[];
  formatters: string[];
  aggregators: string[];
}

export interface PluginDataStats {
  transformers: number;
  validators: number;
  processors: number;
  formatters: number;
  aggregators: number;
  totalUsage: number;
}

export interface DataExtensionStats {
  totalTransformers: number;
  totalValidators: number;
  totalProcessors: number;
  totalFormatters: number;
  totalAggregators: number;
  pluginStats: Record<string, PluginDataStats>;
}