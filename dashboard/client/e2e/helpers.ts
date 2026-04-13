import type { Page } from '@playwright/test'

export const TEST_TOKEN = 'e2e-test-token'

/** Mock all required API endpoints with realistic fixture data */
export async function mockApi(page: Page) {
  await page.route('/api/containers', (route) =>
    route.fulfill({
      json: [
        {
          id: 'abc123',
          name: 'bastion-nextcloud',
          image: 'nextcloud:latest',
          state: 'running',
          status: 'Up 2 hours',
          ports: [],
          created: Date.now() / 1000 - 7200,
          restartCount: 0,
          stateStartedAt: new Date(Date.now() - 7200_000).toISOString(),
        },
        {
          id: 'def456',
          name: 'bastion-n8n',
          image: 'n8n-custom:latest',
          state: 'exited',
          status: 'Exited (1) 5 minutes ago',
          ports: [],
          created: Date.now() / 1000 - 300,
          restartCount: 2,
          stateStartedAt: new Date(Date.now() - 300_000).toISOString(),
        },
      ],
    })
  )

  await page.route('/api/system', (route) =>
    route.fulfill({
      json: {
        cpu: 18,
        mem: { used: 3_000_000_000, total: 8_000_000_000 },
        disk: { used: 40_000_000_000, total: 459_000_000_000 },
        temp: 52,
      },
    })
  )

  await page.route('/api/backup/status', (route) =>
    route.fulfill({
      json: {
        lastRun: '2026-04-11T03:00:00',
        success: true,
        duration: '4m 12s',
        issues: [],
      },
    })
  )

  await page.route('/api/actions', (route) =>
    route.fulfill({ json: ['ssl-renew', 'rebuild-n8n', 'docker-prune'] })
  )

  await page.route('/api/actions/history', (route) => route.fulfill({ json: [] }))

  await page.route('/api/automation', (route) =>
    route.fulfill({
      json: [
        {
          id: 'watchtower',
          name: 'Watchtower',
          cron: '0 4 * * *',
          schedule: 'Daily 04:00',
          description: 'Auto-update registry images',
          mechanism: 'Watchtower container',
          status: 'ok',
        },
      ],
    })
  )

  await page.route('/api/incidents', (route) => route.fulfill({ json: [] }))
}

/** Store the test auth token in localStorage before navigation */
export async function login(page: Page) {
  await page.addInitScript((token) => {
    localStorage.setItem('bastion_token', token)
  }, TEST_TOKEN)
}
