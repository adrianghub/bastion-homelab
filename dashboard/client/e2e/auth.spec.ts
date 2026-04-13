import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test('shows login page when unauthenticated', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('shows error message with wrong token', async ({ page }) => {
  await mockApi(page)
  // Override containers to return 401
  await page.route('/api/containers', (route) => route.fulfill({ status: 401, body: 'Unauthorized' }))

  await page.addInitScript(() => {
    localStorage.setItem('bastion_token', 'wrong-token')
  })
  await page.goto('/')
  // 401 clears token and redirects back to login
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('authenticated user reaches dashboard', async ({ page }) => {
  await login(page)
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByText('bastion-nextcloud')).toBeVisible()
})
