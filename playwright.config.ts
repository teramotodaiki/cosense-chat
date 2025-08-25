import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '__tests__',
  timeout: 15_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    headless: true,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

