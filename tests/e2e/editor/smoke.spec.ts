import { expect, test } from '../fixtures'

test('loads the editor and its sample project', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Ancadeba Editor', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Basic Game (basic-game)', { exact: true }),
  ).toBeVisible()
})

test('connects the editor browser to its dedicated API through the proxy', async ({
  page,
}) => {
  await page.goto('/')

  const response = await page.evaluate(async () => {
    const response = await fetch('/api/project')
    return { status: response.status, body: await response.json() }
  })

  expect(response.status).toBe(200)
  expect(response.body).toEqual({
    project: { id: 'basic-game', name: 'Basic Game' },
    label: 'Basic Game (basic-game)',
  })
})
