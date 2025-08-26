import { useMutation, useQueryClient } from '@tanstack/react-query'

interface UploadFileParams {
  projectRef: string
  bucketId: string
  file: File
  fileName?: string
  onProgress?: (progress: number) => void
}

interface DeleteFileParams {
  projectRef: string
  bucketId: string
  fileName: string
}

// Upload file to Supabase Storage
const uploadFile = async ({ 
  projectRef, 
  bucketId, 
  file, 
  fileName,
  onProgress 
}: UploadFileParams) => {
  const formData = new FormData()
  formData.append('file', file)
  
  if (fileName) {
    formData.append('fileName', fileName)
  }
  
  try {
    const response = await fetch(
      `/api/storage/buckets/${bucketId}/upload`,
      {
        method: 'POST',
        body: formData
        // No need for auth headers - handled by server
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new Error(errorData.message || `Upload failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

// Delete file from Supabase Storage
const deleteFile = async ({ projectRef, bucketId, fileName }: DeleteFileParams) => {
  try {
    const response = await fetch(
      `/api/storage/buckets/${bucketId}/objects/${fileName}`,
      {
        method: 'DELETE'
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Delete failed' }))
      throw new Error(errorData.message || `Delete failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

// Download file from Supabase Storage
const downloadFile = async (projectRef: string, bucketId: string, fileName: string) => {
  try {
    const response = await fetch(
      `/api/storage/buckets/${bucketId}/objects/${fileName}/download`,
      {
        method: 'GET'
      }
    )

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    return response.blob()
  } catch (error) {
    console.error('Download error:', error)
    throw error
  }
}

// Hook for uploading files
export const useUploadFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (data, variables) => {
      // Invalidate the objects list to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['objects', variables.projectRef, variables.bucketId]
      })
    },
    onError: (error) => {
      console.error('Upload mutation error:', error)
    }
  })
}

// Hook for deleting files
export const useDeleteFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteFile,
    onSuccess: (data, variables) => {
      // Invalidate the objects list to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['objects', variables.projectRef, variables.bucketId]
      })
    },
    onError: (error) => {
      console.error('Delete mutation error:', error)
    }
  })
}

// Hook for downloading files
export const useDownloadFile = () => {
  return useMutation({
    mutationFn: ({ projectRef, bucketId, fileName }: DeleteFileParams) =>
      downloadFile(projectRef, bucketId, fileName),
    onSuccess: (blob, variables) => {
      // Automatically trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = variables.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Download mutation error:', error)
    }
  })
}

// Utility function to get public URL for files in public buckets
export const getPublicUrl = (bucketId: string, fileName: string) => {
  return `https://yhvtsbkotszxqndkhhhx.supabase.co/storage/v1/object/public/${bucketId}/${fileName}`
}

// Utility function to get signed URL for private files
export const getSignedUrl = async (projectRef: string, bucketId: string, fileName: string, expiresIn = 3600) => {
  try {
    const response = await fetch(
      `/api/storage/buckets/${bucketId}/objects/${fileName}/signed-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresIn
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.signedURL
  } catch (error) {
    console.error('Signed URL error:', error)
    throw error
  }
}