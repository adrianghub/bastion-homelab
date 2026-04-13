import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await mockApi(page)
  await page.goto('/')
})

test('container list renders with correct states', async ({ page }) => {
  // Span has title="bastion-<name>" — unique and unambiguous
  await expect(page.getByTitle('bastion-nextcloud')).toBeVisible()
  await expect(page.getByTitle('bastion-n8n')).toBeVisible()
})

test('restart button opens confirm dialog', async ({ page }) => {
  const restartButtons = page.getByTitle('Restart')
  await restartButtons.first().click()
  // ConfirmDialog shows a Cancel button when open
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

test('restart action sends POST and shows success toast', async ({ page }) => {
  await page.route('/api/containers/abc123/restart', (route) =>
    route.fulfill({ json: { ok: true } })
  )

  // Open the confirm dialog
  await page.getByTitle('Restart').first().click()
  // ConfirmDialog auto-focuses the confirm button — press Enter to confirm
  await page.keyboard.press('Enter')

  // Success toast should appear
  await expect(page.getByRole('status')).toBeVisible()
})

test('stopped container shows Start button', async ({ page }) => {
  // bastion-n8n is exited → shows a Start button; exact role match avoids collision with Restart
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
})
