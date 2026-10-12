import { expect, test } from '../fixtures'

test('loads the editor and its sample project', async ({ page }) => {
  const projectResponse = page.waitForResponse('**/api/project')
  await page.goto('/')

  const response = await projectResponse
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({
    project: { id: 'basic-game', name: 'Basic Game' },
    label: 'Basic Game (basic-game)',
  })

  await expect(
    page.getByRole('heading', { name: 'Ancadeba Editor', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Basic Game (basic-game)', { exact: true }),
  ).toBeVisible()
})

test('shows loading, then renders the project returned by the API', async ({
  page,
}) => {
  let releaseResponse = () => {}
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })
  await page.route('**/api/project', async (route) => {
    await responseReady
    await route.fulfill({
      json: {
        project: { id: 'server-game', name: 'Server Game' },
        label: 'A stale server label',
      },
    })
  })

  try {
    await page.goto('/')
    await expect(page.getByRole('status')).toHaveText('Loading project…')
    await expect(page.getByText('The editor workspace is ready.')).toHaveCount(
      0,
    )
    releaseResponse()

    await expect(
      page.getByText('Server Game (server-game)', { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByText('A stale server label')).toHaveCount(0)
  } finally {
    releaseResponse()
  }
})

for (const scenario of [
  {
    name: 'invalid project data',
    body: JSON.stringify({ project: { id: 'bad', name: '' } }),
  },
  { name: 'malformed JSON', body: '{' },
]) {
  test(`shows an error for ${scenario.name} and can retry`, async ({
    page,
  }) => {
    let failing = true
    await page.route('**/api/project', async (route) => {
      if (failing) {
        await route.fulfill({
          contentType: 'application/json',
          body: scenario.body,
        })
      } else {
        await route.fulfill({
          json: { project: { id: 'recovered', name: 'Recovered Game' } },
        })
      }
    })

    await page.goto('/')
    await expect(page.getByRole('alert')).toHaveText(
      'Could not load the project. Please try again.',
    )
    await expect(page.getByText('The editor workspace is ready.')).toHaveCount(
      0,
    )
    failing = false
    await page.getByRole('button', { name: 'Retry', exact: true }).click()

    await expect(
      page.getByText('Recovered Game (recovered)', { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test.describe('unavailable API', () => {
  test.use({
    expectedConsoleErrors: [
      /^Failed to load resource: the server responded with a status of 503\b/,
    ],
  })

  test('shows an error for an unsuccessful HTTP response', async ({ page }) => {
    await page.route('**/api/project', (route) =>
      route.fulfill({ status: 503, body: 'Service unavailable' }),
    )
    await page.goto('/')

    await expect(page.getByRole('alert')).toHaveText(
      'Could not load the project. Please try again.',
    )
    await expect(
      page.getByRole('button', { name: 'Retry', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('The editor workspace is ready.')).toHaveCount(
      0,
    )
  })
})
