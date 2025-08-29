import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3333',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on',
  },
  reporter: [['list']],
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        headless: false 
      },
    },
  ],
});