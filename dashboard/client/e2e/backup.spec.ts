import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await mockApi(page)
})

test('backup page shows last run info on success', async ({ page }) => {
  await page.goto('/backup')
  await expect(page.getByText(/2026-04-11/)).toBeVisible()
})

test('backup page degrades gracefully when log is unavailable', async ({ page }) => {
  await page.route('/api/backup/status', (route) =>
    route.fulfill({
      json: {
        lastRun: null,
        success: null,
        duration: null,
        issues: ['[log path is a directory — check host bind-mount]'],
      },
    })
  )
  await page.goto('/backup')
  await expect(page.getByText(/directory/i)).toBeVisible()
})
