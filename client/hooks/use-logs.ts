'use client'

import { useQuery } from '@tanstack/react-query'

// GET Logs - Real Supabase Management API
const getLogs = async ({
  projectRef,
  iso_timestamp_start,
  iso_timestamp_end,
  sql,
}: {
  projectRef: string
  iso_timestamp_start?: string
  iso_timestamp_end?: string
  sql?: string
}) => {
  try {
    const params = new URLSearchParams()
    if (iso_timestamp_start) params.append('iso_timestamp_start', iso_timestamp_start)
    if (iso_timestamp_end) params.append('iso_timestamp_end', iso_timestamp_end)
    if (sql) params.append('sql', sql)
    
    const response = await fetch(`/api/supabase-proxy/v1/projects/${projectRef}/analytics/endpoints/logs.all?${params}`)
    if (!response.ok) {
      throw new Error('Failed to fetch logs')
    }
    return await response.json()
  } catch (error) {
    console.error('Logs error:', error)
    return { result: [], error: null }
  }
}

export const useGetLogs = (
  projectRef: string,
  params: {
    iso_timestamp_start?: string
    iso_timestamp_end?: string
    sql?: string
  } = {}
) => {
  const queryKey = ['logs', projectRef, params.sql]

  return useQuery({
    queryKey: queryKey,
    queryFn: () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const queryParams = {
        sql: params.sql,
        iso_timestamp_start: params.iso_timestamp_start ?? oneHourAgo.toISOString(),
        iso_timestamp_end: params.iso_timestamp_end ?? now.toISOString(),
      }
      return getLogs({ projectRef, ...queryParams })
    },
    enabled: !!projectRef,
    retry: false,
  })
}
