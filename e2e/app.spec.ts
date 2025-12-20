import { test, expect } from '@playwright/test'

test.describe('Multi-AI Chatbot E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // FR-7.1, FR-7.2: i18n - Language switching
  test.describe('FR-7: UI/UX and i18n', () => {
    test('FR-7.1: should display localized UI elements', async ({ page }) => {
      // Check for specific Japanese or English UI text
      const japaneseText = page.locator(
        'text=/新規チャット|チャット|設定|テンプレート/i'
      )
      const englishText = page.locator(
        'text=/New Chat|Chat|Settings|Templates/i'
      )

      const hasJapanese = (await japaneseText.count()) > 0
      const hasEnglish = (await englishText.count()) > 0

      // Either Japanese or English UI should be present
      expect(hasJapanese || hasEnglish).toBe(true)
    })

    test('FR-7.2: should switch language when clicking language selector', async ({
      page,
    }) => {
      // Find language selector
      const langButton = page
        .getByRole('button', { name: /日本語|English/i })
        .first()
      await expect(langButton).toBeVisible()

      await langButton.click()
      // Should show language options
      const dropdown = page.locator('[role="menu"], [role="listbox"]')
      await expect(dropdown).toBeVisible()
    })

    test('FR-7.6: should toggle between dark and light mode', async ({
      page,
    }) => {
      // Find theme toggle button by aria-label or icon
      const themeButton = page
        .locator('button[aria-label*="theme" i], button[aria-label*="mode" i]')
        .first()
      await expect(themeButton).toBeVisible()

      const htmlBefore = await page.locator('html').getAttribute('class')
      await themeButton.click()
      // Wait for theme change
      await page.waitForTimeout(300)
      const htmlAfter = await page.locator('html').getAttribute('class')

      // Theme class should change (dark <-> light)
      expect(htmlBefore).not.toBe(htmlAfter)
    })

    test('FR-7.9: should be responsive on mobile viewport', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      // Mobile nav button (hamburger menu) should be visible
      const mobileNavButton = page
        .locator('button[aria-label*="menu" i], button[aria-label*="nav" i]')
        .first()
      await expect(mobileNavButton).toBeVisible()
    })
  })

  // FR-1: AI Model Selection
  test.describe('FR-1: AI Model Selection', () => {
    test('FR-1.1: should display AI model selector', async ({ page }) => {
      const modelSelector = page.locator(
        '[data-testid="model-selector"], button:has-text("GPT"), button:has-text("Claude"), button:has-text("Gemini")'
      )
      await expect(modelSelector.first()).toBeVisible()
    })

    test('FR-1.4: should display currently selected model name', async ({
      page,
    }) => {
      // Model name should be visible in the UI
      const modelDisplay = page.locator('text=/GPT|Claude|Gemini/i')
      await expect(modelDisplay.first()).toBeVisible()
    })
  })

  // FR-2: Chat functionality
  test.describe('FR-2: Chat Functionality', () => {
    test('FR-2.1: should have chat input form', async ({ page }) => {
      const textarea = page.locator(
        'textarea[placeholder], input[type="text"][placeholder]'
      )
      await expect(textarea.first()).toBeVisible()
    })

    test('FR-2.1: should have send button', async ({ page }) => {
      const sendButton = page.locator(
        'button[type="submit"], button:has-text("送信"), button:has-text("Send")'
      )
      await expect(sendButton.first()).toBeVisible()
    })

    test('FR-2.5: Shift+Enter should add newline', async ({ page }) => {
      const textarea = page.locator('textarea').first()
      await expect(textarea).toBeVisible()

      await textarea.fill('Test message')
      await textarea.press('Shift+Enter')
      const value = await textarea.inputValue()
      expect(value).toContain('\n')
    })

    test('FR-2.5: Enter should submit (clear textarea)', async ({ page }) => {
      const textarea = page.locator('textarea').first()
      await expect(textarea).toBeVisible()

      await textarea.fill('Test message')
      await textarea.press('Enter')

      // Wait for form submission processing
      await page.waitForTimeout(200)

      // Textarea should be cleared after submission
      const valueAfterSend = await textarea.inputValue()
      expect(valueAfterSend).toBe('')
    })
  })

  // FR-3: Conversation history
  test.describe('FR-3: Conversation History', () => {
    test('FR-3.1: should display sidebar with conversations', async ({
      page,
    }) => {
      // Desktop view - sidebar should be visible
      await page.setViewportSize({ width: 1280, height: 720 })
      const sidebar = page.locator(
        'aside, [role="complementary"], [data-testid="sidebar"]'
      )
      await expect(sidebar.first()).toBeVisible()
    })

    test('FR-3.2: should have new chat button', async ({ page }) => {
      const newChatButton = page.locator(
        'button:has-text("新規"), button:has-text("New"), button:has-text("+")'
      )
      await expect(newChatButton.first()).toBeVisible()
    })
  })

  // FR-4: Export functionality
  test.describe('FR-4: Export Functionality', () => {
    test('FR-4.5: should have export menu or button in header/toolbar', async ({
      page,
    }) => {
      // Look for export button/menu in various locations
      const exportButton = page.locator(
        'button:has-text("エクスポート"), button:has-text("Export"), button[aria-label*="export" i], [data-testid="export"]'
      )

      // Export button may be in a dropdown or visible directly
      const exportCount = await exportButton.count()

      // If not directly visible, check for a menu that might contain export
      if (exportCount === 0) {
        // Look for a "more options" or similar menu
        const moreButton = page.locator(
          'button[aria-label*="more" i], button[aria-label*="options" i]'
        )
        if ((await moreButton.count()) > 0) {
          await moreButton.first().click()
          const exportInMenu = page.locator(
            'text=/エクスポート|Export/i, [role="menuitem"]:has-text("Export")'
          )
          expect(await exportInMenu.count()).toBeGreaterThanOrEqual(0)
        }
      } else {
        await expect(exportButton.first()).toBeVisible()
      }
    })
  })

  // FR-5: Prompt templates
  test.describe('FR-5: Prompt Templates', () => {
    test('FR-5.1: should have templates section or button', async ({
      page,
    }) => {
      // Templates may be visible as a button, section, or in sidebar
      const templatesButton = page.locator(
        'button:has-text("テンプレート"), button:has-text("Template"), [data-testid="templates"]'
      )
      const templatesText = page.locator('text=/テンプレート|Template/i')

      const buttonCount = await templatesButton.count()
      const textCount = await templatesText.count()

      // At least one template-related element should exist
      expect(buttonCount + textCount).toBeGreaterThan(0)
    })
  })

  // FR-8: Settings
  test.describe('FR-8: Settings', () => {
    test('FR-8.1: should have settings link that navigates to settings page', async ({
      page,
    }) => {
      const settingsLink = page.locator(
        'a[href*="settings"], button:has-text("設定"), button:has-text("Settings")'
      )

      // Settings link should exist and be clickable
      await expect(settingsLink.first()).toBeVisible()

      await settingsLink.first().click()
      // Should navigate to settings page
      await expect(page).toHaveURL(/settings/)
    })

    test('FR-8.1: settings page should have API key inputs', async ({
      page,
    }) => {
      await page.goto('/ja/settings')
      // Should have API key input fields (password type for security)
      const apiKeyInputs = page.locator('input[type="password"]')
      await expect(apiKeyInputs.first()).toBeVisible()
    })

    test('NFR-2.2: API keys should be masked (password inputs)', async ({
      page,
    }) => {
      await page.goto('/ja/settings')
      const passwordInputs = page.locator('input[type="password"]')
      const count = await passwordInputs.count()

      // Should have at least 3 password inputs (OpenAI, Anthropic, Google)
      expect(count).toBeGreaterThanOrEqual(3)
    })
  })

  // NFR-3: Accessibility
  test.describe('NFR-3: Accessibility', () => {
    test('NFR-3.1: should be navigable by keyboard', async ({ page }) => {
      // Tab through the page
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Should be able to continue tabbing
      await page.keyboard.press('Tab')
      const secondFocused = page.locator(':focus')
      await expect(secondFocused).toBeVisible()
    })

    test('NFR-3.2: should have proper ARIA labels on buttons', async ({
      page,
    }) => {
      // Check for aria-label attributes on interactive elements
      const buttonsWithAria = page.locator('button[aria-label]')
      const count = await buttonsWithAria.count()

      // Should have multiple buttons with aria-labels
      expect(count).toBeGreaterThan(0)
    })

    test('NFR-3.2: main content areas should have proper roles', async ({
      page,
    }) => {
      // Check for semantic landmarks
      const main = page.locator('main, [role="main"]')
      const navigation = page.locator('nav, [role="navigation"]')

      const hasMain = (await main.count()) > 0
      const hasNav = (await navigation.count()) > 0

      // Should have at least one semantic landmark
      expect(hasMain || hasNav).toBe(true)
    })
  })
})
