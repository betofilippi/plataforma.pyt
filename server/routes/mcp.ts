/**
 * MCP API Routes - RESTful endpoints for MCP service integration
 */

import { Router, Request, Response } from 'express';
import { mcpService, MCPExecutionResult } from '../services/mcp-service';
import { requireAuth } from '../auth/middleware';
import { createDatabasePool } from '../routes/auth';

const router = Router();
const dbPool = createDatabasePool();

// Apply authentication middleware to all MCP routes
router.use(requireAuth(dbPool));

/**
 * GET /api/mcp/services
 * Get all available MCP services with their configurations
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const services = mcpService.getServices();
    res.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Error getting MCP services:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get services'
    });
  }
});

/**
 * GET /api/mcp/categories
 * Get all available service categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = mcpService.getCategories();
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error getting MCP categories:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    });
  }
});

/**
 * GET /api/mcp/services/:serviceName/tools
 * Get tools for a specific service
 */
router.get('/services/:serviceName/tools', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const tools = await mcpService.getServiceTools(serviceName);
    
    res.json({
      success: true,
      tools
    });
  } catch (error) {
    console.error('Error getting service tools:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service tools'
    });
  }
});

/**
 * GET /api/mcp/services/:serviceName/auth-status
 * Check authentication status for a service
 */
router.get('/services/:serviceName/auth-status', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const authStatus = mcpService.checkAuthentication(serviceName);
    
    res.json({
      success: true,
      ...authStatus
    });
  } catch (error) {
    console.error('Error checking authentication:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check authentication'
    });
  }
});

/**
 * POST /api/mcp/execute
 * Execute a single MCP tool
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { service, tool, params = {}, options = {} } = req.body;

    if (!service || !tool) {
      return res.status(400).json({
        success: false,
        error: 'Service and tool parameters are required'
      });
    }

    const result = await mcpService.executeTool(service, tool, params, options);
    
    // Return appropriate status code based on success
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('Error executing MCP tool:', error);
    
    let statusCode = 500;
    let errorMessage = 'Tool execution failed';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Set appropriate status codes for specific error types
      if (error.message.includes('Authentication')) {
        statusCode = 401;
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      service: req.body.service,
      tool: req.body.tool,
      timestamp: new Date(),
      executionTime: 0
    } as MCPExecutionResult);
  }
});

/**
 * POST /api/mcp/execute/parallel
 * Execute multiple tools in parallel
 */
router.post('/execute/parallel', async (req: Request, res: Response) => {
  try {
    const { executions } = req.body;

    if (!Array.isArray(executions) || executions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Executions array is required and cannot be empty'
      });
    }

    const results = await mcpService.executeParallel(executions);
    
    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error executing parallel MCP tools:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Parallel execution failed'
    });
  }
});

/**
 * POST /api/mcp/execute/sequence
 * Execute tools in sequence with dependency support
 */
router.post('/execute/sequence', async (req: Request, res: Response) => {
  try {
    const { executions } = req.body;

    if (!Array.isArray(executions) || executions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Executions array is required and cannot be empty'
      });
    }

    const results = await mcpService.executeSequence(executions);
    
    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error executing sequence MCP tools:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sequence execution failed'
    });
  }
});

/**
 * GET /api/mcp/stats
 * Get usage statistics for all services
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = mcpService.getUsageStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage stats'
    });
  }
});

/**
 * GET /api/mcp/stats/:serviceName
 * Get usage statistics for a specific service
 */
router.get('/stats/:serviceName', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const stats = mcpService.getUsageStats(serviceName);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting service usage stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service usage stats'
    });
  }
});

/**
 * DELETE /api/mcp/stats/reset
 * Reset usage statistics for all services
 */
router.delete('/stats/reset', async (req: Request, res: Response) => {
  try {
    mcpService.resetUsageStats();
    
    res.json({
      success: true,
      message: 'Usage statistics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting usage stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset usage stats'
    });
  }
});

/**
 * DELETE /api/mcp/stats/:serviceName/reset
 * Reset usage statistics for a specific service
 */
router.delete('/stats/:serviceName/reset', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    mcpService.resetUsageStats(serviceName);
    
    res.json({
      success: true,
      message: `Usage statistics reset for ${serviceName}`
    });
  } catch (error) {
    console.error('Error resetting service usage stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset service usage stats'
    });
  }
});

/**
 * GET /api/mcp/health
 * Get health status of all services
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await mcpService.healthCheck();
    
    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get health status'
    });
  }
});

/**
 * GET /api/mcp/services/category/:category
 * Get services by category
 */
router.get('/services/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const services = mcpService.getServicesByCategory(category);
    const allServices = mcpService.getServices();
    
    // Filter services to include full config
    const categoryServices: Record<string, any> = {};
    services.forEach(serviceName => {
      if (allServices[serviceName]) {
        categoryServices[serviceName] = allServices[serviceName];
      }
    });
    
    res.json({
      success: true,
      category,
      services: categoryServices
    });
  } catch (error) {
    console.error('Error getting services by category:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get services by category'
    });
  }
});

/**
 * POST /api/mcp/services/:serviceName/test
 * Test a service with a basic operation (if available)
 */
router.post('/services/:serviceName/test', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    
    // Check if service exists and is authenticated
    const authStatus = mcpService.checkAuthentication(serviceName);
    if (!authStatus.isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: `Service ${serviceName} is not authenticated`,
        missingCredentials: authStatus.missingCredentials
      });
    }

    // Get service tools to find a test method
    const tools = await mcpService.getServiceTools(serviceName);
    
    // Look for common test methods
    const testMethods = ['test', 'ping', 'health', 'status', 'info', 'me', 'user_info'];
    const testTool = tools.find(tool => 
      testMethods.some(method => tool.name.toLowerCase().includes(method))
    );
    
    if (!testTool) {
      return res.status(404).json({
        success: false,
        error: `No test method available for service ${serviceName}`,
        availableTools: tools.map(t => t.name)
      });
    }

    // Execute the test tool
    const result = await mcpService.executeTool(serviceName, testTool.name, {});
    
    res.json({
      success: true,
      testResult: result,
      toolUsed: testTool.name
    });

  } catch (error) {
    console.error('Error testing service:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Service test failed'
    });
  }
});

/**
 * WebSocket endpoint for real-time MCP events (if WebSocket is available)
 */
if (mcpService.listenerCount) {
  // Listen for MCP service events and broadcast to connected clients
  mcpService.on('toolExecuted', (event) => {
    // This would be implemented with WebSocket server
    console.log('MCP Tool Executed:', event);
  });
}

export default router;