import { expect, test as base } from '@playwright/test'

export const test = base.extend<{ expectedConsoleErrors: RegExp[] }>({
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors }, use) => {
    const errors: string[] = []

    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !expectedConsoleErrors.some((pattern) => pattern.test(message.text()))
      )
        errors.push(message.text())
    })

    await use(page)

    expect(errors, 'The application should have no browser errors').toEqual([])
  },
})

export { expect } from '@playwright/test'
