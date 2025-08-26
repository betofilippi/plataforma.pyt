/**
 * AI Assistant API Routes - Supabase Platform Kit
 * Handles AI-powered SQL generation and assistance
 */

import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Alternative AI providers configuration
const AI_PROVIDERS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo']
  },
  claude: {
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3', 'claude-3.5-sonnet']
  }
};

// AI Assistant endpoint
router.post('/assistant', async (req, res) => {
  try {
    const { 
      model = 'gpt-4', 
      messages, 
      temperature = 0.1, 
      max_tokens = 2000 
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Messages array is required'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    // Make OpenAI API call
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return res.status(500).json({
        error: 'AI response error',
        message: 'No response generated'
      });
    }

    res.json({
      success: true,
      content: response,
      model,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('AI Assistant error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'OpenAI API quota exceeded. Please check your billing.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'OpenAI API key is invalid or expired.'
      });
    }

    res.status(500).json({
      error: 'AI processing failed',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// SQL Generation endpoint (legacy compatibility)
router.post('/sql', async (req, res) => {
  try {
    const { prompt, projectRef, schema = 'public' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Prompt is required'
      });
    }

    const systemPrompt = `You are a PostgreSQL expert. Generate accurate SQL queries based on natural language requests.

Rules:
1. Return ONLY the SQL query, no explanation
2. Use PostgreSQL syntax and features
3. Use proper table and column names
4. Include appropriate WHERE clauses when filtering is implied
5. Use LIMIT when fetching large datasets unless specifically asked for all
6. Use proper JOINs when multiple tables are referenced
7. Use aggregate functions when summation/counting is requested
8. Always end with semicolon

Current schema: ${schema}
Project: ${projectRef}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a PostgreSQL query for: ${prompt}` }
    ];

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.1,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return res.status(500).json({
        error: 'AI response error',
        message: 'No SQL generated'
      });
    }

    // Clean up the response to extract just the SQL
    const sql = response
      .replace(/```sql\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^sql\n/g, '')
      .trim();

    res.json({
      success: true,
      sql,
      prompt,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('SQL generation error:', error);
    
    res.status(500).json({
      error: 'SQL generation failed',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Query explanation endpoint
router.post('/explain', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'SQL query is required'
      });
    }

    const systemPrompt = `You are a PostgreSQL expert. Explain SQL queries in clear, non-technical language.

Rules:
1. Break down the query step by step
2. Explain what each clause does
3. Mention any performance considerations
4. Use simple language that non-technical users can understand
5. If there are potential issues, mention them`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Explain this PostgreSQL query:\n\n${query}` }
    ];

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.2,
      max_tokens: 1500
    });

    const explanation = completion.choices[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({
        error: 'AI response error',
        message: 'No explanation generated'
      });
    }

    res.json({
      success: true,
      explanation,
      query,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('Query explanation error:', error);
    
    res.status(500).json({
      error: 'Query explanation failed',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Query optimization endpoint
router.post('/optimize', async (req, res) => {
  try {
    const { query, schema = 'public' } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'SQL query is required'
      });
    }

    const systemPrompt = `You are a PostgreSQL performance expert. Optimize SQL queries for better performance.

Optimization focus:
1. Use appropriate indexes (suggest them in comments)
2. Optimize JOINs
3. Improve WHERE clauses
4. Use EXPLAIN ANALYZE suggestions
5. Reduce subqueries where possible
6. Use appropriate LIMIT clauses
7. Consider partitioning for large tables

Return the optimized query with comments explaining the improvements.

Current schema: ${schema}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Optimize this PostgreSQL query:\n\n${query}` }
    ];

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.1,
      max_tokens: 2000
    });

    const optimizedQuery = completion.choices[0]?.message?.content;

    if (!optimizedQuery) {
      return res.status(500).json({
        error: 'AI response error',
        message: 'No optimization generated'
      });
    }

    res.json({
      success: true,
      optimizedQuery,
      originalQuery: query,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('Query optimization error:', error);
    
    res.status(500).json({
      error: 'Query optimization failed',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Debug SQL errors endpoint
router.post('/debug', async (req, res) => {
  try {
    const { query, error: errorMessage } = req.body;

    if (!query || !errorMessage) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Both query and error message are required'
      });
    }

    const systemPrompt = `You are a PostgreSQL debugging expert. Help fix SQL errors.

Rules:
1. Identify the root cause of the error
2. Provide a corrected version of the query
3. Explain what was wrong and why
4. Give tips to avoid similar errors in the future
5. Be concise but thorough`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Fix this PostgreSQL query error:

Query:
${query}

Error:
${errorMessage}

Provide the corrected query and explain the fix.`
      }
    ];

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.1,
      max_tokens: 1500
    });

    const debugResponse = completion.choices[0]?.message?.content;

    if (!debugResponse) {
      return res.status(500).json({
        error: 'AI response error',
        message: 'No debug response generated'
      });
    }

    res.json({
      success: true,
      debugResponse,
      originalQuery: query,
      originalError: errorMessage,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('Query debug error:', error);
    
    res.status(500).json({
      error: 'Query debug failed',
      message: error.message || 'Unknown error occurred'
    });
  }
});

export default router;