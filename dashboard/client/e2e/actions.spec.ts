import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await mockApi(page)
  await page.goto('/actions')
})

test('actions list renders whitelisted names', async ({ page }) => {
  await expect(page.getByText('Renew SSL cert')).toBeVisible()
  // Exact match to avoid collision with the description text "rebuild n8n-custom"
  await expect(page.getByText('Rebuild n8n', { exact: true })).toBeVisible()
  await expect(page.getByText('Docker prune')).toBeVisible()
})

test('clicking Run shows confirm dialog', async ({ page }) => {
  const runButtons = page.getByRole('button', { name: /^run$/i })
  await runButtons.first().click()
  // ConfirmDialog appears — Cancel button is present
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

test('confirming action shows success toast', async ({ page }) => {
  await page.route('/api/actions/ssl-renew', (route) =>
    route.fulfill({ json: { ok: true, output: 'Certificate renewed.' } })
  )

  // Open the confirm dialog for the first action (ssl-renew)
  await page.getByRole('button', { name: /^run$/i }).first().click()
  // ConfirmDialog auto-focuses confirm — press Enter
  await page.keyboard.press('Enter')

  // Toast should appear with the success message
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('completed')
})
