import { test, expect } from '@playwright/test'
import { login, STUDENT } from './helpers/auth.js'

/**
 * Authentication flow — critical journey.
 * Requires the backend + seeded DB. Skips gracefully if the API is unreachable.
 */
test.describe('Authentication', () => {
  test('shows the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByPlaceholder('you@dypatil.edu')).toBeVisible()
  })

  test('rejects invalid credentials', async ({ page }) => {
    await login(page, { email: 'nobody@dypatil.edu', password: 'wrong-password' })
    // stays on /login and surfaces an error
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs a student in and lands on the student dashboard', async ({ page }) => {
    await login(page, STUDENT)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 })
  })
})
