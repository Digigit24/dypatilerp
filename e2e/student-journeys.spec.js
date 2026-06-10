import { test, expect } from '@playwright/test'
import { login, STUDENT } from './helpers/auth.js'

/**
 * Broader student journeys across the pages changed in this diff: profile,
 * progress, submissions, research profile, and the submit flow. Each asserts
 * the page renders for the authenticated user.
 */
test.describe('Student — core pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, STUDENT)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 })
  })

  test('profile page renders', async ({ page }) => {
    await page.goto('/student/profile')
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible()
  })

  test('progress reports page renders', async ({ page }) => {
    await page.goto('/student/progress')
    await expect(page.getByRole('heading', { name: /progress reports/i })).toBeVisible()
  })

  test('submissions page renders', async ({ page }) => {
    await page.goto('/student/submissions')
    await expect(page.getByRole('heading', { name: /my submissions/i })).toBeVisible()
  })

  test('research profile page renders', async ({ page }) => {
    await page.goto('/student/profile/research')
    await expect(page.getByRole('heading', { name: /research profile/i })).toBeVisible()
  })

  test('submit page renders with disabled submit until valid', async ({ page }) => {
    await page.goto('/student/submit')
    await expect(page.getByRole('heading', { name: /submit title & presentation/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /submit for approval/i })).toBeDisabled()
  })
})
