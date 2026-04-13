import { test, expect } from '@playwright/test'
import { mockApi, login } from './helpers'

test('shows login page when unauthenticated', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  // Login page has a "Sign in" submit button and the auth token input
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByPlaceholder('DASHBOARD_AUTH_TOKEN')).toBeVisible()
})

test('shows error on wrong token', async ({ page }) => {
  await mockApi(page)
  // The login page's fetch goes to /api/containers — 401 means invalid token
  await page.route('/api/containers', (route) =>
    route.fulfill({ status: 401, body: 'Unauthorized' })
  )
  await page.goto('/login')
  await page.getByPlaceholder('DASHBOARD_AUTH_TOKEN').fill('wrong-token')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Invalid token')).toBeVisible()
})

test('authenticated user reaches dashboard', async ({ page }) => {
  await login(page)
  await mockApi(page)
  await page.goto('/')
  // ServiceCard strips "bastion-" prefix; the span has title="bastion-nextcloud"
  await expect(page.getByTitle('bastion-nextcloud')).toBeVisible()
})
