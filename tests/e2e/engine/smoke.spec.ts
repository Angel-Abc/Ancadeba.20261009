import { expect, test } from '../fixtures'

test('loads the engine and its sample project', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Ancadeba Engine', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Basic Game (basic-game)', { exact: true }),
  ).toBeVisible()
})
