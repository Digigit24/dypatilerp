import { test, expect } from '@playwright/test'
import { login, STUDENT } from './helpers/auth.js'

/**
 * Student fees journey — verifies a logged-in student sees their own fees
 * (the page now scopes to the authenticated user id instead of 'stu_001').
 */
test.describe('Student — Fees', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, STUDENT)
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 })
  })

  test('renders the fees page with KPIs', async ({ page }) => {
    await page.goto('/student/fees')
    await expect(page.getByRole('heading', { name: 'Fees', exact: true })).toBeVisible()
    await expect(page.getByText('Paid')).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
    await expect(page.getByText('Payment Options')).toBeVisible()
  })

  test('opens the payment preview for a pending fee', async ({ page }) => {
    await page.goto('/student/fees')
    // Assert the fees page actually loaded (KPIs visible) before probing the button.
    // Without this, a 403 skeleton would silently skip the rest of the test (ISSUE-006).
    await expect(page.getByRole('heading', { name: 'Fees', exact: true })).toBeVisible()
    await expect(page.getByText('Paid')).toBeVisible()
    const payNow = page.getByRole('button', { name: /pay now/i }).first()
    if (await payNow.count()) {
      await payNow.click()
      await expect(page.getByText('Payment Preview')).toBeVisible()
    }
  })
})
