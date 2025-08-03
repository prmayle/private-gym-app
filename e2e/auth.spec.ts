import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test
    await page.goto('/')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access admin dashboard
    await page.goto('/admin/dashboard')
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login')
    expect(await page.textContent('h1')).toContain('Login')
  })

  test('should display login form', async ({ page }) => {
    await page.goto('/login')
    
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    
    // Check for forgot password link
    await expect(page.locator('text=Forgot password?')).toBeVisible()
  })

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit without filling fields
    await page.click('button[type="submit"]')
    
    // Should show validation errors (this depends on your form validation implementation)
    // You might need to adjust based on how your forms handle validation
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('should handle login attempt with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible()
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login')
    
    // Click forgot password link
    await page.click('text=Forgot password?')
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('should handle forgot password form submission', async ({ page }) => {
    await page.goto('/forgot-password')
    
    // Fill email and submit
    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('text=sent')).toBeVisible()
  })
})

test.describe('Public Pages', () => {
  test('should display home page without authentication', async ({ page }) => {
    await page.goto('/')
    
    // Home page should load without requiring login
    await expect(page.locator('text=Gym')).toBeVisible()
    
    // Should show login link
    await expect(page.locator('text=Login')).toBeVisible()
  })
  
  test('should have responsive navigation', async ({ page }) => {
    await page.goto('/')
    
    // Test mobile menu on smaller screens
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Should show mobile menu toggle
    const menuButton = page.locator('[aria-label="Toggle menu"]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await expect(page.locator('nav')).toBeVisible()
    }
  })
})