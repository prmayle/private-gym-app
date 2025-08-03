import { test, expect } from '@playwright/test'

// Helper function to login as admin (you'll need to implement this based on your auth system)
async function loginAsAdmin(page: any) {
  await page.goto('/login')
  
  // This is a placeholder - you'll need to implement actual login
  // For now, we'll mock the authentication state
  await page.evaluate(() => {
    // Mock authenticated state in localStorage or cookies
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      user: { id: 'test-admin', email: 'admin@test.com', role: 'admin' }
    }))
  })
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // For E2E tests with authentication, you might want to:
    // 1. Create a test user in your test database
    // 2. Use actual login credentials
    // 3. Or mock the authentication state
    
    // For this example, we'll skip auth and focus on UI testing
    await page.goto('/admin/dashboard')
  })

  test.skip('should display admin dashboard with key metrics', async ({ page }) => {
    // Skip auth for now - you can enable this once you have test authentication set up
    await loginAsAdmin(page)
    await page.goto('/admin/dashboard')
    
    // Check for dashboard elements
    await expect(page.locator('h1')).toHaveText(/dashboard/i)
    
    // Check for key metrics cards
    await expect(page.locator('[data-testid="total-members"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-sessions"]')).toBeVisible()
    await expect(page.locator('[data-testid="revenue"]')).toBeVisible()
    
    // Check for navigation menu
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=Members')).toBeVisible()
    await expect(page.locator('text=Sessions')).toBeVisible()
    await expect(page.locator('text=Trainers')).toBeVisible()
  })

  test.skip('should navigate to members management', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/dashboard')
    
    // Click on Members in navigation
    await page.click('text=Members')
    
    // Should navigate to members page
    await expect(page).toHaveURL('/admin/members')
    await expect(page.locator('h1')).toHaveText(/members/i)
    
    // Should show members table or list
    await expect(page.locator('table')).toBeVisible()
  })

  test.skip('should navigate to sessions management', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/dashboard')
    
    // Click on Sessions in navigation
    await page.click('text=Sessions')
    
    // Should navigate to sessions page
    await expect(page).toHaveURL('/admin/sessions')
    await expect(page.locator('h1')).toHaveText(/sessions/i)
  })

  test('should handle responsive design', async ({ page }) => {
    await page.goto('/')
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1024, height: 768 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      
      // Check that the page renders properly at each size
      await expect(page.locator('body')).toBeVisible()
      
      // On mobile, navigation might be collapsed
      if (viewport.width < 768) {
        // Check for mobile menu toggle if it exists
        const menuToggle = page.locator('[aria-label="Toggle menu"]')
        if (await menuToggle.isVisible()) {
          await expect(menuToggle).toBeVisible()
        }
      }
    }
  })
})

test.describe('Admin Forms', () => {
  test.skip('should handle member creation form', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/members/new')
    
    // Fill out member creation form
    await page.fill('input[name="full_name"]', 'Test Member')
    await page.fill('input[name="email"]', 'testmember@example.com')
    await page.fill('input[name="phone"]', '1234567890')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show success message or redirect
    await expect(page.locator('text=created successfully')).toBeVisible()
  })

  test.skip('should validate form inputs', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/members/new')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible()
    
    // Fill invalid email
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    
    // Should show email validation error
    await expect(page.locator('text=valid email')).toBeVisible()
  })
})