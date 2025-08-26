import axios, { AxiosInstance } from 'axios';
import { AuthApiConfig } from '../types';

export function createAuthApi(baseURL: string, config?: Partial<AuthApiConfig>): AxiosInstance {
  const defaultConfig: AuthApiConfig = {
    baseURL,
    timeout: 10000,
    withCredentials: true, // Important for HTTP-only cookies
  };

  const finalConfig = { ...defaultConfig, ...config };

  return axios.create(finalConfig);
}