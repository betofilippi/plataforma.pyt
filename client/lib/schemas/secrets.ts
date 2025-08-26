import { z } from 'zod';

export const secretsSchema = z.object({
  secrets: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      value: z.string().min(1, 'Value is required'),
    })
  ),
});