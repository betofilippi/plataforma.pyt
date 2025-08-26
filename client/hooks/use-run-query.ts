import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

// RUN SQL Query using our API
export const runQuery = async ({
  projectRef,
  query,
  readOnly,
}: {
  projectRef: string
  query: string
  readOnly?: boolean
}) => {
  try {
    const response = await fetch('/api/postgres/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }

    const data = await response.json()
    
    // Ensure we always return an array
    if (Array.isArray(data)) {
      return data
    } else if (data && typeof data === 'object') {
      // If it's an object with result property
      if (data.result) {
        return Array.isArray(data.result) ? data.result : [data.result]
      }
      // If it's a single object, wrap in array
      return [data]
    }
    
    return []
  } catch (err: any) {
    console.error('Query error:', err)
    throw err
  }
}

export const useRunQuery = () => {
  return useMutation({
    mutationFn: runQuery,
    onError: (error: any) => {
      toast.error(error.message || 'There was a problem with your query.')
    },
  })
}
