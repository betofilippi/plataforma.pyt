'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// GET Secrets - Real Supabase Management API
const getSecrets = async (projectRef: string) => {
  try {
    const response = await fetch(`/api/supabase-proxy/v1/projects/${projectRef}/secrets`)
    if (!response.ok) {
      throw new Error('Failed to fetch secrets')
    }
    return await response.json()
  } catch (error) {
    console.error('Secrets error:', error)
    return []
  }
}

export const useGetSecrets = (projectRef: string) => {
  return useQuery({
    queryKey: ['secrets', projectRef],
    queryFn: () => getSecrets(projectRef),
    enabled: !!projectRef,
    retry: false,
  })
}

// CREATE Secrets
const createSecrets = async ({
  projectRef,
  secrets,
}: {
  projectRef: string
  secrets: components['schemas']['CreateSecretBody']
}) => {
  const { data, error } = await client.POST('/v1/projects/{ref}/secrets', {
    params: {
      path: {
        ref: projectRef,
      },
    },
    body: secrets,
  })
  if (error) {
    throw error
  }

  return data
}

export const useCreateSecrets = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSecrets,
    onSuccess: (data, variables) => {
      toast.success(`Secrets created successfully.`)
      queryClient.refetchQueries({
        queryKey: ['secrets', variables.projectRef],
      })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || 'There was a problem with your request.')
    },
  })
}

// DELETE Secrets
const deleteSecrets = async ({
  projectRef,
  secretNames,
}: {
  projectRef: string
  secretNames: string[]
}) => {
  const { data, error } = await client.DELETE('/v1/projects/{ref}/secrets', {
    params: {
      path: {
        ref: projectRef,
      },
    },
    body: secretNames,
  })
  if (error) {
    throw error
  }

  return data
}

export const useDeleteSecrets = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSecrets,
    onSuccess: (data, variables) => {
      toast.success(`Secrets deleted successfully.`)
      queryClient.invalidateQueries({
        queryKey: ['secrets', variables.projectRef],
      })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || 'There was a problem with your request.')
    },
  })
}
