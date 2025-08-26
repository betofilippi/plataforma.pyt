import { Request, Response } from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { extname } from 'path'

// Supabase client configuration
const supabase = createClient(
  'https://yhvtsbkotszxqndkhhhx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM2MjczMSwiZXhwIjoyMDUxOTM4NzMxfQ.qA1lrHO_u9xfI7QQCzQOqP5lJ1Av8x65mSmBJsJy7VE'
)

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
      'application/pdf',
      'text/plain', 'text/csv', 'application/json',
      'application/zip', 'application/x-rar-compressed',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`))
    }
  }
})

/**
 * Upload file to Supabase Storage bucket
 */
export async function uploadToStorage(req: Request, res: Response) {
  try {
    const { bucketId } = req.params
    const file = req.file
    
    if (!file) {
      return res.status(400).json({
        error: 'No file provided'
      })
    }

    if (!bucketId) {
      return res.status(400).json({
        error: 'Bucket ID is required'
      })
    }

    console.log('Uploading file:', {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      bucketId
    })

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = extname(file.originalname)
    const fileName = req.body.fileName || `${timestamp}-${randomString}${fileExtension}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketId)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false // Don't overwrite existing files
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return res.status(400).json({
        error: 'Upload failed',
        message: error.message,
        details: error
      })
    }

    // Get public URL if bucket is public
    let publicUrl = null
    try {
      const { data: urlData } = supabase.storage
        .from(bucketId)
        .getPublicUrl(fileName)
      publicUrl = urlData.publicUrl
    } catch (urlError) {
      console.log('Could not get public URL (bucket might be private):', urlError)
    }

    console.log('Upload successful:', data)

    res.json({
      success: true,
      data: {
        ...data,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        publicUrl
      }
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * Delete file from Supabase Storage bucket
 */
export async function deleteFromStorage(req: Request, res: Response) {
  try {
    const { bucketId, fileName } = req.params

    if (!bucketId || !fileName) {
      return res.status(400).json({
        error: 'Bucket ID and file name are required'
      })
    }

    console.log('Deleting file:', { bucketId, fileName })

    const { data, error } = await supabase.storage
      .from(bucketId)
      .remove([fileName])

    if (error) {
      console.error('Supabase delete error:', error)
      return res.status(400).json({
        error: 'Delete failed',
        message: error.message,
        details: error
      })
    }

    console.log('Delete successful:', data)

    res.json({
      success: true,
      data
    })

  } catch (error: any) {
    console.error('Delete error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * Download file from Supabase Storage bucket
 */
export async function downloadFromStorage(req: Request, res: Response) {
  try {
    const { bucketId, fileName } = req.params

    if (!bucketId || !fileName) {
      return res.status(400).json({
        error: 'Bucket ID and file name are required'
      })
    }

    console.log('Downloading file:', { bucketId, fileName })

    const { data, error } = await supabase.storage
      .from(bucketId)
      .download(fileName)

    if (error) {
      console.error('Supabase download error:', error)
      return res.status(400).json({
        error: 'Download failed',
        message: error.message,
        details: error
      })
    }

    if (!data) {
      return res.status(404).json({
        error: 'File not found'
      })
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer())

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', data.type || 'application/octet-stream')
    res.setHeader('Content-Length', buffer.length)

    // Send the file
    res.send(buffer)

  } catch (error: any) {
    console.error('Download error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * Get signed URL for private files
 */
export async function getSignedUrl(req: Request, res: Response) {
  try {
    const { bucketId, fileName } = req.params
    const { expiresIn = 3600 } = req.body

    if (!bucketId || !fileName) {
      return res.status(400).json({
        error: 'Bucket ID and file name are required'
      })
    }

    console.log('Getting signed URL:', { bucketId, fileName, expiresIn })

    const { data, error } = await supabase.storage
      .from(bucketId)
      .createSignedUrl(fileName, expiresIn)

    if (error) {
      console.error('Supabase signed URL error:', error)
      return res.status(400).json({
        error: 'Failed to create signed URL',
        message: error.message,
        details: error
      })
    }

    console.log('Signed URL created successfully')

    res.json({
      success: true,
      signedURL: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    })

  } catch (error: any) {
    console.error('Signed URL error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

// Export multer middleware
export const uploadMiddleware = upload.single('file')