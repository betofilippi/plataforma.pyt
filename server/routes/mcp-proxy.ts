import { Request, Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * MCP Proxy Route Handler
 * Forwards requests to the MCP bridge
 */
export async function handleMCPRequest(req: Request, res: Response) {
  try {
    const { service, method, params = {} } = req.body

    if (!service || !method) {
      return res.status(400).json({
        error: 'Missing service or method',
      })
    }

    // Convert params to JSON string for command line
    const paramsJson = JSON.stringify(params).replace(/"/g, '\\"')

    // Execute MCP bridge command
    const command = `node mcp_bridge.cjs ${service} ${method} "${paramsJson}"`
    
    console.log('Executing MCP command:', command)

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: process.env,
    })

    if (stderr) {
      console.error('MCP stderr:', stderr)
    }

    // Parse the response
    let result
    try {
      result = JSON.parse(stdout)
    } catch (parseError) {
      // If not JSON, return as string
      result = stdout
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('MCP proxy error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'MCP execution failed',
    })
  }
}

/**
 * Get available MCP services
 */
export async function getMCPServices(req: Request, res: Response) {
  try {
    const command = 'node mcp_bridge.cjs list_services'
    const { stdout } = await execAsync(command)
    
    const services = JSON.parse(stdout)
    
    res.json({
      success: true,
      services,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list MCP services',
    })
  }
}

/**
 * Get methods for a specific MCP service
 */
export async function getMCPMethods(req: Request, res: Response) {
  try {
    const { service } = req.params
    
    if (!service) {
      return res.status(400).json({
        error: 'Service name required',
      })
    }

    const command = `node mcp_bridge.cjs ${service} list_methods`
    const { stdout } = await execAsync(command)
    
    const methods = JSON.parse(stdout)
    
    res.json({
      success: true,
      methods,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list service methods',
    })
  }
}