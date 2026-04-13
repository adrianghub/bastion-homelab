import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await mockApi(page)
  await page.goto('/actions')
})

test('actions list renders whitelisted names', async ({ page }) => {
  await expect(page.getByText(/renew ssl cert/i)).toBeVisible()
  await expect(page.getByText(/rebuild n8n/i)).toBeVisible()
  await expect(page.getByText(/docker prune/i)).toBeVisible()
})

test('clicking Run shows confirm dialog', async ({ page }) => {
  const runButtons = page.getByRole('button', { name: /^run$/i })
  await runButtons.first().click()
  await expect(page.getByRole('button', { name: /^run$/i }).last()).toBeVisible()
})

test('confirming action shows success toast', async ({ page }) => {
  await page.route('/api/actions/ssl-renew', (route) =>
    route.fulfill({ json: { ok: true, output: 'Certificate renewed.' } })
  )

  const runButtons = page.getByRole('button', { name: /^run$/i })
  await runButtons.first().click()
  // Click the confirm Run in the dialog
  await page.getByRole('button', { name: /^run$/i }).last().click()

  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByText(/completed/i)).toBeVisible()
})
