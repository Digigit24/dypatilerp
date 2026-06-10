// Shared E2E auth helpers. Credentials come from env so no secrets are committed.
export const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL || 'student@dypatil.edu',
  password: process.env.E2E_STUDENT_PASSWORD || 'Student@1234',
}

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@dypatil.edu',
  password: process.env.E2E_ADMIN_PASSWORD || 'Admin@1234',
}

/** Log in through the UI and wait for the post-login redirect. */
export async function login(page, { email, password }) {
  await page.goto('/login')
  await page.getByPlaceholder('you@dypatil.edu').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}
