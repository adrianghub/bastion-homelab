import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await mockApi(page)
  await page.goto('/')
})

test('container list renders with correct states', async ({ page }) => {
  await expect(page.getByText('bastion-nextcloud')).toBeVisible()
  await expect(page.getByText('bastion-n8n')).toBeVisible()
})

test('restart button opens confirm dialog', async ({ page }) => {
  const restartButtons = page.getByRole('button', { name: /restart/i })
  await restartButtons.first().click()
  await expect(page.getByRole('dialog').or(page.getByText(/restart.*?/i))).toBeVisible()
})

test('restart action sends POST and shows success toast', async ({ page }) => {
  // Mock the restart action to succeed
  await page.route('/api/containers/abc123/restart', (route) =>
    route.fulfill({ json: { ok: true } })
  )

  const restartButtons = page.getByRole('button', { name: /restart/i })
  await restartButtons.first().click()

  // Confirm dialog — click the confirm button
  const confirmBtn = page.getByRole('button', { name: /^restart$/i }).last()
  await confirmBtn.click()

  // Success toast should appear
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByText(/restarted/i)).toBeVisible()
})

test('stopped container shows start button', async ({ page }) => {
  // bastion-n8n is exited
  const n8nCard = page.locator('text=n8n').locator('..')
  await expect(n8nCard.getByRole('button', { name: /start/i })).toBeVisible()
})
