import { Request, Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function supabaseProxySimple(req: Request, res: Response) {
  try {
    const path = req.path.replace('/api/supabase-proxy', '')
    const url = `https://api.supabase.com${path}`
    const token = process.env.SUPABASE_MANAGEMENT_API_TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' })
    }
    
    console.log('Using curl for:', url)
    
    // Use curl with SSL disabled and silent mode
    const curlCommand = `curl -s -k -H "Authorization: Bearer ${token}" "${url}"`
    
    const { stdout, stderr } = await execAsync(curlCommand)
    
    if (stderr) {
      console.error('Curl error:', stderr)
      return res.status(500).json({ error: stderr })
    }
    
    try {
      const data = JSON.parse(stdout)
      console.log('Success via curl!')
      res.json(data)
    } catch (e) {
      console.log('Raw response:', stdout)
      res.json({ raw: stdout })
    }
    
  } catch (error: any) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: error.message })
  }
}