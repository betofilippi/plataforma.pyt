import { z } from "zod";

// ===== AI-OPTIMIZED DATA SCHEMA =====
// Designed for optimal AI consumption while maintaining all spreadsheet functionality

export interface AISpreadsheetSchema {
  // Metadata for AI context
  metadata: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    lastModified: string;
    version: string;
    tags: string[];
    category: string;
    owner: string;
    language: string;
    encoding: 'utf-8';
  };

  // Schema definition for AI understanding
  schema: {
    columns: AIColumnSchema[];
    relationships: AIRelationship[];
    constraints: AIConstraint[];
    businessRules: AIBusinessRule[];
  };

  // Actual data in normalized format
  data: {
    rows: AIRow[];
    totalRows: number;
    statistics: AIDataStatistics;
  };

  // Context for AI interpretation
  context: {
    domain: string; // e.g., "finance", "hr", "sales", "inventory"
    purpose: string; // e.g., "analysis", "reporting", "planning"
    audience: string; // e.g., "executives", "analysts", "operations"
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
    compliance: string[]; // e.g., ["GDPR", "SOX", "HIPAA"]
  };

  // AI processing hints
  aiHints: {
    primaryKeys: string[];
    foreignKeys: string[];
    calculatedFields: string[];
    timeSeriesColumns: string[];
    categoricalColumns: string[];
    numericalColumns: string[];
    textColumns: string[];
    booleanColumns: string[];
    dateColumns: string[];
    geographicColumns: string[];
    currencyColumns: string[];
    percentageColumns: string[];
  };
}

export interface AIColumnSchema {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: AIDataType;
  semanticType: AISemanticType;
  format?: string;
  unit?: string;
  currency?: string;
  precision?: number;
  scale?: number;
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];
  pattern?: string;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  searchable: boolean;
  aggregatable: boolean;
  examples: any[];
  defaultValue?: any;
  businessMeaning: string;
  calculationFormula?: string;
  dependencies: string[];
  qualityScore: number; // 0-1 indicating data quality
}

export type AIDataType = 
  | 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'time'
  | 'decimal' | 'integer' | 'float' | 'currency' | 'percentage'
  | 'email' | 'url' | 'phone' | 'json' | 'array' | 'object';

export type AISemanticType =
  | 'identifier' | 'name' | 'description' | 'category' | 'status'
  | 'amount' | 'quantity' | 'rate' | 'score' | 'rating'
  | 'timestamp' | 'duration' | 'period' | 'frequency'
  | 'address' | 'location' | 'coordinates' | 'region'
  | 'contact' | 'reference' | 'link' | 'attachment'
  | 'measurement' | 'metric' | 'kpi' | 'dimension'
  | 'calculated' | 'aggregated' | 'derived' | 'forecast';

export interface AIRelationship {
  id: string;
  name: string;
  description: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  fromColumn: string;
  toColumn: string;
  toTable?: string;
  strength: 'weak' | 'strong' | 'identifying';
  businessRule: string;
}

export interface AIConstraint {
  id: string;
  type: 'check' | 'range' | 'format' | 'uniqueness' | 'reference';
  columns: string[];
  rule: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AIBusinessRule {
  id: string;
  name: string;
  description: string;
  type: 'validation' | 'calculation' | 'automation' | 'workflow';
  condition: string;
  action: string;
  priority: number;
  active: boolean;
}

export interface AIRow {
  id: string;
  values: Record<string, any>;
  metadata: {
    createdAt: string;
    lastModified: string;
    version: number;
    source: string;
    confidence: number; // 0-1 indicating data confidence
    flags: string[]; // e.g., ["estimated", "verified", "computed"]
  };
}

export interface AIDataStatistics {
  completeness: Record<string, number>; // percentage complete per column
  uniqueness: Record<string, number>; // percentage unique per column
  validity: Record<string, number>; // percentage valid per column
  consistency: Record<string, number>; // consistency score per column
  distribution: Record<string, any>; // value distribution per column
  correlations: Record<string, Record<string, number>>; // inter-column correlations
  trends: Record<string, any>; // time-based trends for relevant columns
  outliers: Record<string, any[]>; // detected outliers per column
  patterns: Record<string, string[]>; // detected patterns per column
}

// Zod validation schema for runtime validation
export const AISpreadsheetSchemaValidator = z.object({
  metadata: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    createdAt: z.string(),
    lastModified: z.string(),
    version: z.string(),
    tags: z.array(z.string()),
    category: z.string(),
    owner: z.string(),
    language: z.string(),
    encoding: z.literal('utf-8'),
  }),
  schema: z.object({
    columns: z.array(z.object({
      id: z.string(),
      name: z.string(),
      displayName: z.string(),
      description: z.string(),
      dataType: z.enum(['string', 'number', 'boolean', 'date', 'datetime', 'time', 'decimal', 'integer', 'float', 'currency', 'percentage', 'email', 'url', 'phone', 'json', 'array', 'object']),
      semanticType: z.enum(['identifier', 'name', 'description', 'category', 'status', 'amount', 'quantity', 'rate', 'score', 'rating', 'timestamp', 'duration', 'period', 'frequency', 'address', 'location', 'coordinates', 'region', 'contact', 'reference', 'link', 'attachment', 'measurement', 'metric', 'kpi', 'dimension', 'calculated', 'aggregated', 'derived', 'forecast']),
      required: z.boolean(),
      unique: z.boolean(),
      indexed: z.boolean(),
      searchable: z.boolean(),
      aggregatable: z.boolean(),
      examples: z.array(z.any()),
      businessMeaning: z.string(),
      dependencies: z.array(z.string()),
      qualityScore: z.number().min(0).max(1),
    })),
    relationships: z.array(z.any()),
    constraints: z.array(z.any()),
    businessRules: z.array(z.any()),
  }),
  data: z.object({
    rows: z.array(z.any()),
    totalRows: z.number(),
    statistics: z.any(),
  }),
  context: z.object({
    domain: z.string(),
    purpose: z.string(),
    audience: z.string(),
    sensitivity: z.enum(['public', 'internal', 'confidential', 'restricted']),
    compliance: z.array(z.string()),
  }),
  aiHints: z.object({
    primaryKeys: z.array(z.string()),
    foreignKeys: z.array(z.string()),
    calculatedFields: z.array(z.string()),
    timeSeriesColumns: z.array(z.string()),
    categoricalColumns: z.array(z.string()),
    numericalColumns: z.array(z.string()),
    textColumns: z.array(z.string()),
    booleanColumns: z.array(z.string()),
    dateColumns: z.array(z.string()),
    geographicColumns: z.array(z.string()),
    currencyColumns: z.array(z.string()),
    percentageColumns: z.array(z.string()),
  }),
});

// Utility functions for AI data processing
export class AIDataProcessor {
  static detectSemanticType(columnName: string, values: any[]): AISemanticType {
    const name = columnName.toLowerCase();
    const sampleValues = values.slice(0, 10).filter(v => v != null);
    
    // Pattern-based detection
    if (name.includes('id') || name.includes('key')) return 'identifier';
    if (name.includes('name') || name.includes('title')) return 'name';
    if (name.includes('desc') || name.includes('comment')) return 'description';
    if (name.includes('category') || name.includes('type')) return 'category';
    if (name.includes('status') || name.includes('state')) return 'status';
    if (name.includes('amount') || name.includes('value') || name.includes('price')) return 'amount';
    if (name.includes('qty') || name.includes('quantity') || name.includes('count')) return 'quantity';
    if (name.includes('rate') || name.includes('ratio')) return 'rate';
    if (name.includes('score') || name.includes('rating')) return 'score';
    if (name.includes('date') || name.includes('time')) return 'timestamp';
    if (name.includes('address') || name.includes('location')) return 'address';
    if (name.includes('email')) return 'contact';
    if (name.includes('phone')) return 'contact';
    if (name.includes('url') || name.includes('link')) return 'link';
    
    // Value-based detection
    if (sampleValues.length > 0) {
      const firstValue = sampleValues[0];
      if (typeof firstValue === 'number' && name.includes('%')) return 'rate';
      if (typeof firstValue === 'string' && firstValue.includes('@')) return 'contact';
      if (typeof firstValue === 'string' && firstValue.startsWith('http')) return 'link';
    }
    
    return 'description'; // default
  }

  static analyzeDataQuality(values: any[]): number {
    const total = values.length;
    if (total === 0) return 0;
    
    const nonNull = values.filter(v => v != null && v !== '').length;
    const completeness = nonNull / total;
    
    // Additional quality checks could be added here
    return completeness;
  }

  static generateStatistics(data: AIRow[], columns: AIColumnSchema[]): AIDataStatistics {
    const stats: AIDataStatistics = {
      completeness: {},
      uniqueness: {},
      validity: {},
      consistency: {},
      distribution: {},
      correlations: {},
      trends: {},
      outliers: {},
      patterns: {},
    };

    columns.forEach(column => {
      const values = data.map(row => row.values[column.id]);
      const nonNullValues = values.filter(v => v != null && v !== '');
      
      // Completeness
      stats.completeness[column.id] = nonNullValues.length / values.length;
      
      // Uniqueness
      const uniqueValues = new Set(nonNullValues);
      stats.uniqueness[column.id] = uniqueValues.size / nonNullValues.length;
      
      // Basic distribution
      if (column.dataType === 'number') {
        const numValues = nonNullValues.map(Number).filter(n => !isNaN(n));
        if (numValues.length > 0) {
          stats.distribution[column.id] = {
            min: Math.min(...numValues),
            max: Math.max(...numValues),
            avg: numValues.reduce((a, b) => a + b, 0) / numValues.length,
            median: numValues.sort((a, b) => a - b)[Math.floor(numValues.length / 2)],
          };
        }
      } else {
        const freq: Record<string, number> = {};
        nonNullValues.forEach(value => {
          const key = String(value);
          freq[key] = (freq[key] || 0) + 1;
        });
        stats.distribution[column.id] = freq;
      }
    });

    return stats;
  }
}

// Export utility for converting existing spreadsheet data to AI format
export class SpreadsheetToAIConverter {
  static convert(spreadsheet: any): AISpreadsheetSchema {
    // This will be implemented to convert existing spreadsheet format
    // to the new AI-optimized format while preserving all functionality
    
    const now = new Date().toISOString();
    
    return {
      metadata: {
        id: spreadsheet.id || 'unknown',
        name: spreadsheet.name || 'Untitled',
        description: spreadsheet.description || '',
        createdAt: spreadsheet.createdAt || now,
        lastModified: now,
        version: '1.0.0',
        tags: spreadsheet.tags || [],
        category: spreadsheet.category || 'general',
        owner: spreadsheet.owner || 'system',
        language: 'pt-BR',
        encoding: 'utf-8',
      },
      schema: {
        columns: [],
        relationships: [],
        constraints: [],
        businessRules: [],
      },
      data: {
        rows: [],
        totalRows: 0,
        statistics: {
          completeness: {},
          uniqueness: {},
          validity: {},
          consistency: {},
          distribution: {},
          correlations: {},
          trends: {},
          outliers: {},
          patterns: {},
        },
      },
      context: {
        domain: 'business',
        purpose: 'analysis',
        audience: 'general',
        sensitivity: 'internal',
        compliance: [],
      },
      aiHints: {
        primaryKeys: [],
        foreignKeys: [],
        calculatedFields: [],
        timeSeriesColumns: [],
        categoricalColumns: [],
        numericalColumns: [],
        textColumns: [],
        booleanColumns: [],
        dateColumns: [],
        geographicColumns: [],
        currencyColumns: [],
        percentageColumns: [],
      },
    };
  }
}
