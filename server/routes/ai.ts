/**
 * AI API Routes - Comprehensive AI functionality for plataforma.app
 * Production-ready with authentication, rate limiting, validation, and WebSocket streaming
 */

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { createClient } from 'redis';
import OpenAI from 'openai';
import { Pool } from 'pg';
import { createAuthMiddleware, requireAuth, optionalAuth } from '../auth/middleware';
import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';

// Types
interface AIRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
}

interface AIExecution {
  id: string;
  user_id: string;
  endpoint: string;
  request_data: any;
  response_data: any;
  tokens_used: number;
  cost: number;
  duration_ms: number;
  status: 'success' | 'error' | 'processing';
  error_message?: string;
  created_at: Date;
}

interface AITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt_template: string;
  parameters: Record<string, any>;
  is_active: boolean;
}

// Validation Schemas
const generateRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  model: z.string().optional().default('gpt-4'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().min(1).max(4000).optional().default(1000),
  stream: z.boolean().optional().default(false),
  context: z.any().optional(),
  template_id: z.string().optional()
});

const analyzeRequestSchema = z.object({
  data: z.any(),
  analysis_type: z.enum(['pattern', 'anomaly', 'trend', 'classification', 'clustering']),
  parameters: z.record(z.any()).optional().default({}),
  output_format: z.enum(['json', 'text', 'chart']).optional().default('json')
});

const transformRequestSchema = z.object({
  data: z.any(),
  source_format: z.string(),
  target_format: z.string(),
  transformation_rules: z.record(z.any()).optional().default({}),
  preserve_structure: z.boolean().optional().default(true)
});

const batchRequestSchema = z.object({
  operations: z.array(z.object({
    id: z.string(),
    type: z.enum(['generate', 'analyze', 'transform']),
    data: z.any()
  })).min(1).max(100),
  parallel: z.boolean().optional().default(false),
  batch_id: z.string().optional()
});

const workflowRequestSchema = z.object({
  workflow_name: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    type: z.string(),
    parameters: z.record(z.any()),
    depends_on: z.array(z.string()).optional().default([])
  })),
  input_data: z.any().optional()
});

// Router factory
export function createAIRoutes(pool: Pool, redisClient: ReturnType<typeof createClient>) {
  const router = Router();
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  // AI providers configuration
  const AI_PROVIDERS = {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      costs: {
        'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 }
      }
    },
    claude: {
      baseURL: 'https://api.anthropic.com/v1',
      models: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
      costs: {
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-opus': { input: 0.015, output: 0.075 }
      }
    }
  };

  // Rate limiting configurations
  const aiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many AI requests, please try again later',
      code: 'AI_RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  const batchRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit batch processing
    message: {
      success: false,
      message: 'Too many batch requests, please try again later',
      code: 'BATCH_RATE_LIMITED'
    }
  });

  // Middleware for request validation
  function validateRequest(schema: z.ZodSchema) {
    return (req: any, res: any, next: any) => {
      try {
        req.validatedData = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request data',
            errors: error.errors,
            code: 'VALIDATION_ERROR'
          });
        }
        next(error);
      }
    };
  }

  // Cost calculation helper
  function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const provider = model.startsWith('claude') ? AI_PROVIDERS.claude : AI_PROVIDERS.openai;
    const costs = provider.costs[model as keyof typeof provider.costs];
    
    if (!costs) return 0;
    
    return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);
  }

  // Execution logging helper
  async function logAIExecution(execution: Partial<AIExecution>): Promise<string> {
    const id = execution.id || randomUUID();
    
    try {
      await pool.query(`
        INSERT INTO plataforma_core.ai_executions 
        (id, user_id, endpoint, request_data, response_data, tokens_used, cost, duration_ms, status, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          response_data = EXCLUDED.response_data,
          tokens_used = EXCLUDED.tokens_used,
          cost = EXCLUDED.cost,
          duration_ms = EXCLUDED.duration_ms,
          status = EXCLUDED.status,
          error_message = EXCLUDED.error_message
      `, [
        id,
        execution.user_id,
        execution.endpoint,
        JSON.stringify(execution.request_data),
        JSON.stringify(execution.response_data),
        execution.tokens_used || 0,
        execution.cost || 0,
        execution.duration_ms || 0,
        execution.status || 'processing',
        execution.error_message,
        execution.created_at || new Date()
      ]);
      
      return id;
    } catch (error) {
      console.error('Failed to log AI execution:', error);
      return id;
    }
  }

  // Cache helpers
  async function getCachedResponse(key: string): Promise<any | null> {
    try {
      const cached = await redisClient.get(`ai:cache:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async function setCachedResponse(key: string, data: any, ttl: number = 3600): Promise<void> {
    try {
      await redisClient.setEx(`ai:cache:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Generate cache key
  function generateCacheKey(endpoint: string, data: any): string {
    return `${endpoint}:${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 50)}`;
  }

  // Routes

  // POST /api/ai/generate - Generate content with AI
  router.post('/generate', 
    aiRateLimit,
    requireAuth(pool) as any,
    validateRequest(generateRequestSchema),
    async (req: any, res: any) => {
      const startTime = Date.now();
      const executionId = randomUUID();
      
      try {
        const { prompt, model, temperature, max_tokens, stream, context, template_id } = req.validatedData;
        
        // Check cache first (only for non-streaming requests)
        if (!stream) {
          const cacheKey = generateCacheKey('generate', { prompt, model, temperature, max_tokens });
          const cached = await getCachedResponse(cacheKey);
          if (cached) {
            return res.json({
              success: true,
              ...cached,
              cached: true,
              execution_id: executionId
            });
          }
        }

        // Apply template if specified
        let finalPrompt = prompt;
        if (template_id) {
          const templateResult = await pool.query(
            'SELECT prompt_template, parameters FROM plataforma_core.ai_templates WHERE id = $1 AND is_active = true',
            [template_id]
          );
          
          if (templateResult.rows.length > 0) {
            const template = templateResult.rows[0];
            finalPrompt = template.prompt_template.replace('{{prompt}}', prompt);
            // Apply template parameters
            for (const [key, value] of Object.entries(template.parameters)) {
              finalPrompt = finalPrompt.replace(`{{${key}}}`, value);
            }
          }
        }

        // Prepare messages
        const messages = [
          { role: 'system', content: 'You are a helpful AI assistant integrated into plataforma.app, an AI-first business platform.' },
          ...(context ? [{ role: 'user', content: `Context: ${JSON.stringify(context)}` }] : []),
          { role: 'user', content: finalPrompt }
        ];

        // Log execution start
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'generate',
          request_data: { prompt, model, temperature, max_tokens, stream, context, template_id },
          status: 'processing',
          created_at: new Date()
        });

        // Handle streaming
        if (stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          });

          try {
            const stream = await openai.chat.completions.create({
              model,
              messages: messages as any,
              temperature,
              max_tokens,
              stream: true
            });

            let fullContent = '';
            let totalTokens = 0;

            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              fullContent += content;
              
              res.write(`data: ${JSON.stringify({ 
                content, 
                done: false,
                execution_id: executionId
              })}\n\n`);
            }

            // Send final message
            res.write(`data: ${JSON.stringify({ 
              content: '',
              done: true,
              full_content: fullContent,
              execution_id: executionId
            })}\n\n`);
            
            res.end();

            // Log completion
            const duration = Date.now() - startTime;
            const cost = calculateCost(model, 0, totalTokens); // Approximate
            
            await logAIExecution({
              id: executionId,
              user_id: req.user.userId,
              endpoint: 'generate',
              request_data: { prompt, model, temperature, max_tokens, stream, context, template_id },
              response_data: { content: fullContent },
              tokens_used: totalTokens,
              cost,
              duration_ms: duration,
              status: 'success'
            });

          } catch (error: any) {
            res.write(`data: ${JSON.stringify({ 
              error: error.message,
              done: true,
              execution_id: executionId
            })}\n\n`);
            res.end();

            await logAIExecution({
              id: executionId,
              user_id: req.user.userId,
              endpoint: 'generate',
              request_data: { prompt, model, temperature, max_tokens, stream, context, template_id },
              status: 'error',
              error_message: error.message,
              duration_ms: Date.now() - startTime
            });
          }
          
          return;
        }

        // Non-streaming generation
        const completion = await openai.chat.completions.create({
          model,
          messages: messages as any,
          temperature,
          max_tokens,
          stream: false
        });

        const content = completion.choices[0]?.message?.content || '';
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
        const duration = Date.now() - startTime;

        const response = {
          content,
          model,
          usage,
          cost: parseFloat(cost.toFixed(6)),
          duration_ms: duration,
          execution_id: executionId
        };

        // Cache response
        const cacheKey = generateCacheKey('generate', { prompt, model, temperature, max_tokens });
        await setCachedResponse(cacheKey, response);

        // Log completion
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'generate',
          request_data: { prompt, model, temperature, max_tokens, stream, context, template_id },
          response_data: { content },
          tokens_used: usage.total_tokens,
          cost,
          duration_ms: duration,
          status: 'success'
        });

        res.json({
          success: true,
          ...response
        });

      } catch (error: any) {
        console.error('Generate error:', error);
        
        const duration = Date.now() - startTime;
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'generate',
          request_data: req.validatedData,
          status: 'error',
          error_message: error.message,
          duration_ms: duration
        });

        res.status(500).json({
          success: false,
          message: error.message || 'AI generation failed',
          code: 'GENERATION_ERROR',
          execution_id: executionId
        });
      }
    }
  );

  // POST /api/ai/analyze - Analyze data patterns
  router.post('/analyze',
    aiRateLimit,
    requireAuth(pool) as any,
    validateRequest(analyzeRequestSchema),
    async (req: any, res: any) => {
      const startTime = Date.now();
      const executionId = randomUUID();

      try {
        const { data, analysis_type, parameters, output_format } = req.validatedData;

        // Check cache
        const cacheKey = generateCacheKey('analyze', req.validatedData);
        const cached = await getCachedResponse(cacheKey);
        if (cached) {
          return res.json({
            success: true,
            ...cached,
            cached: true,
            execution_id: executionId
          });
        }

        // Create analysis prompt based on type
        const analysisPrompts = {
          pattern: `Analyze the following data and identify patterns, trends, and insights. Look for recurring themes, correlations, and significant changes over time.`,
          anomaly: `Analyze the following data to detect anomalies, outliers, and unusual patterns. Highlight any data points that deviate significantly from the norm.`,
          trend: `Analyze the following data to identify trends, growth patterns, and directional changes. Provide insights on trajectory and future implications.`,
          classification: `Classify and categorize the following data. Group similar items together and explain the classification criteria used.`,
          clustering: `Perform clustering analysis on the following data. Identify natural groupings and explain the characteristics of each cluster.`
        };

        const prompt = `${analysisPrompts[analysis_type]}

Data to analyze:
${JSON.stringify(data, null, 2)}

Analysis parameters: ${JSON.stringify(parameters)}

Please provide your analysis in ${output_format} format. Be thorough, specific, and actionable in your insights.`;

        const messages = [
          { role: 'system', content: 'You are an expert data analyst. Provide comprehensive, accurate analysis with actionable insights.' },
          { role: 'user', content: prompt }
        ];

        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'analyze',
          request_data: req.validatedData,
          status: 'processing',
          created_at: new Date()
        });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: messages as any,
          temperature: 0.3,
          max_tokens: 3000
        });

        const analysis = completion.choices[0]?.message?.content || '';
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const cost = calculateCost('gpt-4', usage.prompt_tokens, usage.completion_tokens);
        const duration = Date.now() - startTime;

        // Parse result if JSON format requested
        let parsedAnalysis = analysis;
        if (output_format === 'json') {
          try {
            parsedAnalysis = JSON.parse(analysis);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        const response = {
          analysis: parsedAnalysis,
          analysis_type,
          output_format,
          usage,
          cost: parseFloat(cost.toFixed(6)),
          duration_ms: duration,
          execution_id: executionId
        };

        // Cache response
        await setCachedResponse(cacheKey, response, 1800); // 30 minutes

        // Log completion
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'analyze',
          request_data: req.validatedData,
          response_data: { analysis: parsedAnalysis },
          tokens_used: usage.total_tokens,
          cost,
          duration_ms: duration,
          status: 'success'
        });

        res.json({
          success: true,
          ...response
        });

      } catch (error: any) {
        console.error('Analyze error:', error);
        
        const duration = Date.now() - startTime;
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'analyze',
          request_data: req.validatedData,
          status: 'error',
          error_message: error.message,
          duration_ms: duration
        });

        res.status(500).json({
          success: false,
          message: error.message || 'Analysis failed',
          code: 'ANALYSIS_ERROR',
          execution_id: executionId
        });
      }
    }
  );

  // POST /api/ai/transform - Transform data formats
  router.post('/transform',
    aiRateLimit,
    requireAuth(pool) as any,
    validateRequest(transformRequestSchema),
    async (req: any, res: any) => {
      const startTime = Date.now();
      const executionId = randomUUID();

      try {
        const { data, source_format, target_format, transformation_rules, preserve_structure } = req.validatedData;

        // Check cache
        const cacheKey = generateCacheKey('transform', req.validatedData);
        const cached = await getCachedResponse(cacheKey);
        if (cached) {
          return res.json({
            success: true,
            ...cached,
            cached: true,
            execution_id: executionId
          });
        }

        const prompt = `Transform the following data from ${source_format} format to ${target_format} format.

Source data:
${JSON.stringify(data, null, 2)}

Transformation rules: ${JSON.stringify(transformation_rules)}
Preserve structure: ${preserve_structure}

Requirements:
1. Maintain data integrity during transformation
2. Follow the specified transformation rules
3. ${preserve_structure ? 'Preserve the original data structure as much as possible' : 'Optimize the structure for the target format'}
4. Return only the transformed data in valid ${target_format} format
5. Handle any data type conversions appropriately

Return the transformed data directly without explanation.`;

        const messages = [
          { role: 'system', content: 'You are an expert in data transformation. Transform data accurately while maintaining integrity.' },
          { role: 'user', content: prompt }
        ];

        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'transform',
          request_data: req.validatedData,
          status: 'processing',
          created_at: new Date()
        });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: messages as any,
          temperature: 0.1, // Low temperature for consistent transformations
          max_tokens: 3000
        });

        const transformedData = completion.choices[0]?.message?.content || '';
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const cost = calculateCost('gpt-4', usage.prompt_tokens, usage.completion_tokens);
        const duration = Date.now() - startTime;

        // Try to parse the result based on target format
        let parsedData = transformedData;
        if (target_format.toLowerCase().includes('json')) {
          try {
            parsedData = JSON.parse(transformedData);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        const response = {
          transformed_data: parsedData,
          source_format,
          target_format,
          transformation_rules,
          usage,
          cost: parseFloat(cost.toFixed(6)),
          duration_ms: duration,
          execution_id: executionId
        };

        // Cache response
        await setCachedResponse(cacheKey, response, 3600); // 1 hour

        // Log completion
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'transform',
          request_data: req.validatedData,
          response_data: { transformed_data: parsedData },
          tokens_used: usage.total_tokens,
          cost,
          duration_ms: duration,
          status: 'success'
        });

        res.json({
          success: true,
          ...response
        });

      } catch (error: any) {
        console.error('Transform error:', error);
        
        const duration = Date.now() - startTime;
        await logAIExecution({
          id: executionId,
          user_id: req.user.userId,
          endpoint: 'transform',
          request_data: req.validatedData,
          status: 'error',
          error_message: error.message,
          duration_ms: duration
        });

        res.status(500).json({
          success: false,
          message: error.message || 'Transformation failed',
          code: 'TRANSFORMATION_ERROR',
          execution_id: executionId
        });
      }
    }
  );

  // POST /api/ai/batch - Process multiple operations
  router.post('/batch',
    batchRateLimit,
    requireAuth(pool) as any,
    validateRequest(batchRequestSchema),
    async (req: any, res: any) => {
      const startTime = Date.now();
      const batchId = req.validatedData.batch_id || randomUUID();

      try {
        const { operations, parallel } = req.validatedData;
        const results = [];

        await logAIExecution({
          id: batchId,
          user_id: req.user.userId,
          endpoint: 'batch',
          request_data: { operations: operations.length, parallel },
          status: 'processing',
          created_at: new Date()
        });

        // Process operations
        if (parallel) {
          // Parallel processing
          const promises = operations.map(async (operation: any) => {
            try {
              const result = await processOperation(operation, req.user.userId);
              return { id: operation.id, success: true, result };
            } catch (error: any) {
              return { id: operation.id, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
        } else {
          // Sequential processing
          for (const operation of operations) {
            try {
              const result = await processOperation(operation, req.user.userId);
              results.push({ id: operation.id, success: true, result });
            } catch (error: any) {
              results.push({ id: operation.id, success: false, error: error.message });
            }
          }
        }

        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const totalCost = results.reduce((sum, r) => sum + (r.result?.cost || 0), 0);
        const totalTokens = results.reduce((sum, r) => sum + (r.result?.usage?.total_tokens || 0), 0);

        const response = {
          batch_id: batchId,
          total_operations: operations.length,
          successful: successCount,
          failed: operations.length - successCount,
          results,
          total_cost: parseFloat(totalCost.toFixed(6)),
          total_tokens: totalTokens,
          duration_ms: duration,
          parallel
        };

        // Log completion
        await logAIExecution({
          id: batchId,
          user_id: req.user.userId,
          endpoint: 'batch',
          request_data: req.validatedData,
          response_data: { 
            total_operations: operations.length, 
            successful: successCount, 
            failed: operations.length - successCount 
          },
          tokens_used: totalTokens,
          cost: totalCost,
          duration_ms: duration,
          status: 'success'
        });

        res.json({
          success: true,
          ...response
        });

      } catch (error: any) {
        console.error('Batch error:', error);
        
        const duration = Date.now() - startTime;
        await logAIExecution({
          id: batchId,
          user_id: req.user.userId,
          endpoint: 'batch',
          request_data: req.validatedData,
          status: 'error',
          error_message: error.message,
          duration_ms: duration
        });

        res.status(500).json({
          success: false,
          message: error.message || 'Batch processing failed',
          code: 'BATCH_ERROR',
          batch_id: batchId
        });
      }
    }
  );

  // Helper function to process individual operations
  async function processOperation(operation: any, userId: string): Promise<any> {
    const { type, data } = operation;
    
    switch (type) {
      case 'generate':
        const generateResult = await openai.chat.completions.create({
          model: data.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: data.prompt }],
          temperature: data.temperature || 0.7,
          max_tokens: data.max_tokens || 1000
        });
        
        const content = generateResult.choices[0]?.message?.content || '';
        const usage = generateResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const cost = calculateCost(data.model || 'gpt-3.5-turbo', usage.prompt_tokens, usage.completion_tokens);
        
        return { content, usage, cost };
        
      case 'analyze':
        // Simplified analysis for batch processing
        const analysisResult = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ 
            role: 'user', 
            content: `Analyze this data for ${data.analysis_type}: ${JSON.stringify(data.data)}` 
          }],
          temperature: 0.3,
          max_tokens: 1500
        });
        
        const analysis = analysisResult.choices[0]?.message?.content || '';
        const analysisUsage = analysisResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const analysisCost = calculateCost('gpt-4', analysisUsage.prompt_tokens, analysisUsage.completion_tokens);
        
        return { analysis, usage: analysisUsage, cost: analysisCost };
        
      case 'transform':
        // Simplified transformation for batch processing
        const transformResult = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ 
            role: 'user', 
            content: `Transform this data from ${data.source_format} to ${data.target_format}: ${JSON.stringify(data.data)}` 
          }],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        const transformedData = transformResult.choices[0]?.message?.content || '';
        const transformUsage = transformResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const transformCost = calculateCost('gpt-4', transformUsage.prompt_tokens, transformUsage.completion_tokens);
        
        return { transformed_data: transformedData, usage: transformUsage, cost: transformCost };
        
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  // GET /api/ai/history - Get execution history
  router.get('/history',
    requireAuth(pool) as any,
    async (req: any, res: any) => {
      try {
        const { page = 1, limit = 50, endpoint, status, start_date, end_date } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereConditions = ['user_id = $1'];
        const values = [req.user.userId];
        let paramCount = 1;

        if (endpoint) {
          paramCount++;
          whereConditions.push(`endpoint = $${paramCount}`);
          values.push(endpoint);
        }

        if (status) {
          paramCount++;
          whereConditions.push(`status = $${paramCount}`);
          values.push(status);
        }

        if (start_date) {
          paramCount++;
          whereConditions.push(`created_at >= $${paramCount}`);
          values.push(start_date);
        }

        if (end_date) {
          paramCount++;
          whereConditions.push(`created_at <= $${paramCount}`);
          values.push(end_date);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countResult = await pool.query(
          `SELECT COUNT(*) as total FROM plataforma_core.ai_executions WHERE ${whereClause}`,
          values
        );

        // Get paginated results
        const result = await pool.query(`
          SELECT id, endpoint, tokens_used, cost, duration_ms, status, error_message, created_at
          FROM plataforma_core.ai_executions 
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...values, parseInt(limit), offset]);

        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / parseInt(limit));

        // Calculate summary statistics
        const statsResult = await pool.query(`
          SELECT 
            COUNT(*) as total_executions,
            SUM(tokens_used) as total_tokens,
            SUM(cost) as total_cost,
            AVG(duration_ms) as avg_duration,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
            COUNT(CASE WHEN status = 'error' THEN 1 END) as failed
          FROM plataforma_core.ai_executions 
          WHERE ${whereClause}
        `, values);

        const stats = statsResult.rows[0];

        res.json({
          success: true,
          data: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            total_pages: totalPages,
            has_next: parseInt(page) < totalPages,
            has_prev: parseInt(page) > 1
          },
          statistics: {
            total_executions: parseInt(stats.total_executions),
            total_tokens: parseInt(stats.total_tokens || 0),
            total_cost: parseFloat((stats.total_cost || 0).toFixed(6)),
            avg_duration: parseFloat((stats.avg_duration || 0).toFixed(2)),
            successful: parseInt(stats.successful || 0),
            failed: parseInt(stats.failed || 0),
            success_rate: stats.total_executions > 0 
              ? parseFloat(((stats.successful / stats.total_executions) * 100).toFixed(2))
              : 0
          }
        });

      } catch (error: any) {
        console.error('History error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to fetch history',
          code: 'HISTORY_ERROR'
        });
      }
    }
  );

  // GET /api/ai/templates - Get available templates
  router.get('/templates',
    optionalAuth(pool) as any,
    async (req: any, res: any) => {
      try {
        const { category, search } = req.query;
        
        let whereConditions = ['is_active = true'];
        const values: any[] = [];
        let paramCount = 0;

        if (category) {
          paramCount++;
          whereConditions.push(`category = $${paramCount}`);
          values.push(category);
        }

        if (search) {
          paramCount++;
          whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
          values.push(`%${search}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        const result = await pool.query(`
          SELECT id, name, description, category, prompt_template, parameters
          FROM plataforma_core.ai_templates 
          WHERE ${whereClause}
          ORDER BY category, name
        `, values);

        // Group by category
        const groupedTemplates = result.rows.reduce((acc: any, template: any) => {
          const category = template.category || 'general';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(template);
          return acc;
        }, {});

        res.json({
          success: true,
          templates: groupedTemplates,
          total: result.rows.length
        });

      } catch (error: any) {
        console.error('Templates error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to fetch templates',
          code: 'TEMPLATES_ERROR'
        });
      }
    }
  );

  // POST /api/ai/workflow - Execute workflow
  router.post('/workflow',
    aiRateLimit,
    requireAuth(pool) as any,
    validateRequest(workflowRequestSchema),
    async (req: any, res: any) => {
      const startTime = Date.now();
      const workflowId = randomUUID();

      try {
        const { workflow_name, steps, input_data } = req.validatedData;
        const results: any = {};
        const executionOrder: string[] = [];

        // Topological sort to determine execution order
        const sortedSteps = topologicalSort(steps);
        
        await logAIExecution({
          id: workflowId,
          user_id: req.user.userId,
          endpoint: 'workflow',
          request_data: { workflow_name, steps: steps.length, input_data },
          status: 'processing',
          created_at: new Date()
        });

        // Execute steps in order
        for (const step of sortedSteps) {
          try {
            // Get input data for this step
            let stepInput = input_data;
            
            // Merge outputs from dependent steps
            if (step.depends_on && step.depends_on.length > 0) {
              stepInput = {
                ...stepInput,
                ...step.depends_on.reduce((acc, depId) => {
                  acc[depId] = results[depId];
                  return acc;
                }, {} as any)
              };
            }

            // Execute the step
            const stepResult = await executeWorkflowStep(step, stepInput);
            results[step.id] = stepResult;
            executionOrder.push(step.id);

          } catch (error: any) {
            results[step.id] = { error: error.message };
            console.error(`Workflow step ${step.id} failed:`, error);
          }
        }

        const duration = Date.now() - startTime;
        const successful = Object.values(results).filter((r: any) => !r.error).length;
        const totalCost = Object.values(results).reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
        const totalTokens = Object.values(results).reduce((sum: number, r: any) => sum + (r.usage?.total_tokens || 0), 0);

        const response = {
          workflow_id: workflowId,
          workflow_name,
          execution_order: executionOrder,
          results,
          summary: {
            total_steps: steps.length,
            successful,
            failed: steps.length - successful,
            total_cost: parseFloat(totalCost.toFixed(6)),
            total_tokens: totalTokens,
            duration_ms: duration
          }
        };

        // Log completion
        await logAIExecution({
          id: workflowId,
          user_id: req.user.userId,
          endpoint: 'workflow',
          request_data: req.validatedData,
          response_data: response.summary,
          tokens_used: totalTokens,
          cost: totalCost,
          duration_ms: duration,
          status: 'success'
        });

        res.json({
          success: true,
          ...response
        });

      } catch (error: any) {
        console.error('Workflow error:', error);
        
        const duration = Date.now() - startTime;
        await logAIExecution({
          id: workflowId,
          user_id: req.user.userId,
          endpoint: 'workflow',
          request_data: req.validatedData,
          status: 'error',
          error_message: error.message,
          duration_ms: duration
        });

        res.status(500).json({
          success: false,
          message: error.message || 'Workflow execution failed',
          code: 'WORKFLOW_ERROR',
          workflow_id: workflowId
        });
      }
    }
  );

  // Helper function for topological sort
  function topologicalSort(steps: any[]): any[] {
    const graph = new Map();
    const inDegree = new Map();
    
    // Initialize graph and in-degree
    steps.forEach(step => {
      graph.set(step.id, step.depends_on || []);
      inDegree.set(step.id, 0);
    });
    
    // Calculate in-degrees
    steps.forEach(step => {
      (step.depends_on || []).forEach((depId: string) => {
        if (inDegree.has(depId)) {
          inDegree.set(step.id, inDegree.get(step.id) + 1);
        }
      });
    });
    
    // Kahn's algorithm
    const queue = [];
    const result = [];
    
    inDegree.forEach((degree, stepId) => {
      if (degree === 0) {
        queue.push(stepId);
      }
    });
    
    while (queue.length > 0) {
      const current = queue.shift();
      const step = steps.find(s => s.id === current);
      if (step) {
        result.push(step);
      }
      
      steps.forEach(step => {
        if ((step.depends_on || []).includes(current)) {
          inDegree.set(step.id, inDegree.get(step.id) - 1);
          if (inDegree.get(step.id) === 0) {
            queue.push(step.id);
          }
        }
      });
    }
    
    return result;
  }

  // Helper function to execute workflow step
  async function executeWorkflowStep(step: any, input: any): Promise<any> {
    const { type, parameters } = step;
    
    switch (type) {
      case 'generate':
        const prompt = parameters.prompt_template?.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
          return input[key] || match;
        }) || parameters.prompt;
        
        const generateResult = await openai.chat.completions.create({
          model: parameters.model || 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: parameters.temperature || 0.7,
          max_tokens: parameters.max_tokens || 1000
        });
        
        const content = generateResult.choices[0]?.message?.content || '';
        const usage = generateResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const cost = calculateCost(parameters.model || 'gpt-4', usage.prompt_tokens, usage.completion_tokens);
        
        return { content, usage, cost };
        
      case 'analyze':
        const analysisPrompt = `Analyze the following data: ${JSON.stringify(input)}`;
        
        const analysisResult = await openai.chat.completions.create({
          model: parameters.model || 'gpt-4',
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.3,
          max_tokens: parameters.max_tokens || 2000
        });
        
        const analysis = analysisResult.choices[0]?.message?.content || '';
        const analysisUsage = analysisResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const analysisCost = calculateCost(parameters.model || 'gpt-4', analysisUsage.prompt_tokens, analysisUsage.completion_tokens);
        
        return { analysis, usage: analysisUsage, cost: analysisCost };
        
      case 'transform':
        const transformPrompt = `Transform this data: ${JSON.stringify(input)}`;
        
        const transformResult = await openai.chat.completions.create({
          model: parameters.model || 'gpt-4',
          messages: [{ role: 'user', content: transformPrompt }],
          temperature: 0.1,
          max_tokens: parameters.max_tokens || 2000
        });
        
        const transformedData = transformResult.choices[0]?.message?.content || '';
        const transformUsage = transformResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const transformCost = calculateCost(parameters.model || 'gpt-4', transformUsage.prompt_tokens, transformUsage.completion_tokens);
        
        return { transformed_data: transformedData, usage: transformUsage, cost: transformCost };
        
      default:
        throw new Error(`Unsupported workflow step type: ${type}`);
    }
  }

  // GET /api/ai/costs - Get cost analytics
  router.get('/costs',
    requireAuth(pool) as any,
    async (req: any, res: any) => {
      try {
        const { period = '30d', group_by = 'day' } = req.query;
        
        let dateFilter = '';
        let groupByClause = '';
        
        // Set date filter based on period
        switch (period) {
          case '24h':
            dateFilter = "created_at >= NOW() - INTERVAL '24 hours'";
            groupByClause = "DATE_TRUNC('hour', created_at)";
            break;
          case '7d':
            dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
            groupByClause = "DATE_TRUNC('day', created_at)";
            break;
          case '30d':
            dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
            groupByClause = "DATE_TRUNC('day', created_at)";
            break;
          case '90d':
            dateFilter = "created_at >= NOW() - INTERVAL '90 days'";
            groupByClause = "DATE_TRUNC('week', created_at)";
            break;
          default:
            dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
            groupByClause = "DATE_TRUNC('day', created_at)";
        }

        // Get cost breakdown by time
        const timeSeriesResult = await pool.query(`
          SELECT 
            ${groupByClause} as period,
            SUM(cost) as total_cost,
            SUM(tokens_used) as total_tokens,
            COUNT(*) as executions,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful
          FROM plataforma_core.ai_executions 
          WHERE user_id = $1 AND ${dateFilter}
          GROUP BY ${groupByClause}
          ORDER BY period DESC
        `, [req.user.userId]);

        // Get cost breakdown by endpoint
        const endpointResult = await pool.query(`
          SELECT 
            endpoint,
            SUM(cost) as total_cost,
            SUM(tokens_used) as total_tokens,
            COUNT(*) as executions,
            AVG(duration_ms) as avg_duration
          FROM plataforma_core.ai_executions 
          WHERE user_id = $1 AND ${dateFilter}
          GROUP BY endpoint
          ORDER BY total_cost DESC
        `, [req.user.userId]);

        // Get overall statistics
        const overallResult = await pool.query(`
          SELECT 
            SUM(cost) as total_cost,
            SUM(tokens_used) as total_tokens,
            COUNT(*) as total_executions,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
            AVG(cost) as avg_cost_per_request,
            AVG(tokens_used) as avg_tokens_per_request,
            AVG(duration_ms) as avg_duration
          FROM plataforma_core.ai_executions 
          WHERE user_id = $1 AND ${dateFilter}
        `, [req.user.userId]);

        const overall = overallResult.rows[0];

        res.json({
          success: true,
          period,
          group_by,
          time_series: timeSeriesResult.rows.map(row => ({
            period: row.period,
            cost: parseFloat((row.total_cost || 0).toFixed(6)),
            tokens: parseInt(row.total_tokens || 0),
            executions: parseInt(row.executions || 0),
            successful: parseInt(row.successful || 0)
          })),
          by_endpoint: endpointResult.rows.map(row => ({
            endpoint: row.endpoint,
            cost: parseFloat((row.total_cost || 0).toFixed(6)),
            tokens: parseInt(row.total_tokens || 0),
            executions: parseInt(row.executions || 0),
            avg_duration: parseFloat((row.avg_duration || 0).toFixed(2))
          })),
          summary: {
            total_cost: parseFloat((overall.total_cost || 0).toFixed(6)),
            total_tokens: parseInt(overall.total_tokens || 0),
            total_executions: parseInt(overall.total_executions || 0),
            successful_executions: parseInt(overall.successful_executions || 0),
            success_rate: overall.total_executions > 0 
              ? parseFloat(((overall.successful_executions / overall.total_executions) * 100).toFixed(2))
              : 0,
            avg_cost_per_request: parseFloat((overall.avg_cost_per_request || 0).toFixed(6)),
            avg_tokens_per_request: parseFloat((overall.avg_tokens_per_request || 0).toFixed(0)),
            avg_duration: parseFloat((overall.avg_duration || 0).toFixed(2))
          }
        });

      } catch (error: any) {
        console.error('Costs error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to fetch cost analytics',
          code: 'COSTS_ERROR'
        });
      }
    }
  );

  return router;
}

// WebSocket setup for streaming
export function setupAIWebSocket(server: Server, pool: Pool) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/ai/stream'
  });

  wss.on('connection', (ws, req) => {
    console.log('AI WebSocket connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, payload, auth_token } = data;

        // Authenticate WebSocket connection
        if (auth_token) {
          // TODO: Verify JWT token and attach user to ws
        }

        switch (type) {
          case 'generate_stream':
            await handleStreamGeneration(ws, payload, pool);
            break;
            
          case 'batch_status':
            await handleBatchStatus(ws, payload, pool);
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error: any) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    ws.on('close', () => {
      console.log('AI WebSocket disconnected');
    });
  });
}

async function handleStreamGeneration(ws: any, payload: any, pool: Pool) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  try {
    const { prompt, model = 'gpt-4', temperature = 0.7, max_tokens = 1000 } = payload;

    const stream = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens,
      stream: true
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      
      ws.send(JSON.stringify({
        type: 'content_chunk',
        content,
        done: false
      }));
    }

    ws.send(JSON.stringify({
      type: 'generation_complete',
      full_content: fullContent,
      done: true
    }));

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

async function handleBatchStatus(ws: any, payload: any, pool: Pool) {
  const { batch_id } = payload;
  
  try {
    const result = await pool.query(
      'SELECT status, response_data FROM plataforma_core.ai_executions WHERE id = $1',
      [batch_id]
    );

    if (result.rows.length > 0) {
      ws.send(JSON.stringify({
        type: 'batch_status',
        batch_id,
        status: result.rows[0].status,
        data: result.rows[0].response_data
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Batch not found'
      }));
    }
  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

export default createAIRoutes;