import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      // Must be set before config.ts is loaded — prevents process.exit(1)
      DASHBOARD_AUTH_TOKEN: 'test-token',
    },
  },
})
