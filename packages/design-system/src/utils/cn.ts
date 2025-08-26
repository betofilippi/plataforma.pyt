import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge class names with Tailwind CSS conflict resolution
 * Uses clsx for conditional classes and tailwind-merge for proper overrides
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}