import { useQuery } from '@tanstack/react-query'

// GET Buckets - Real Supabase Storage API
const getBuckets = async (projectRef: string) => {
  try {
    const response = await fetch(`/api/supabase-proxy/v1/projects/${projectRef}/storage/buckets`)
    if (!response.ok) {
      throw new Error('Failed to fetch storage buckets')
    }
    return await response.json()
  } catch (error) {
    console.error('Storage buckets error:', error)
    return []
  }
}

export const useGetBuckets = (projectRef: string) => {
  return useQuery({
    queryKey: ['buckets', projectRef],
    queryFn: () => getBuckets(projectRef),
    enabled: !!projectRef,
    retry: false,
  })
}

// LIST Objects - Real Supabase Storage API  
const listObjects = async ({ projectRef, bucketId }: { projectRef: string; bucketId: string }) => {
  try {
    const response = await fetch(`/api/supabase-proxy/v1/storage/buckets/${bucketId}/objects/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '', options: { limit: 100, offset: 0 } })
    })
    if (!response.ok) {
      throw new Error('Failed to fetch objects')
    }
    return await response.json()
  } catch (error) {
    console.error('Storage objects error:', error)
    return []
  }
}

export const useListObjects = (projectRef: string, bucketId: string) => {
  return useQuery({
    queryKey: ['objects', projectRef, bucketId],
    queryFn: () => listObjects({ projectRef, bucketId }),
    enabled: !!projectRef && !!bucketId,
  })
}
