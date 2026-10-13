import { expect, test } from '../fixtures'

test('explores with keyboard and buttons, blocks terrain, battles and clears an encounter', async ({
  page,
}) => {
  await page.goto('/')
  const world = page.getByRole('region', {
    name: 'World exploration',
    exact: true,
  })
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 1, 2',
  )
  await world.press('ArrowUp')
  await expect(page.getByRole('status')).toHaveText(
    'Dense forest blocks your path.',
  )
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 1, 2',
  )
  await world.press('d')
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 2, 2',
  )
  await page
    .getByRole('button', { name: 'Battle sandbox', exact: true })
    .click()
  await page.getByRole('button', { name: 'Explore world', exact: true }).click()
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 2, 2',
  )
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'The moss grove', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Move west', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await expect(
    page.getByRole('progressbar', { name: 'Mossling health' }),
  ).toHaveAttribute('value', '38')
  await page.getByRole('button', { name: 'Load world', exact: true }).click()
  await expect(
    page.getByRole('progressbar', { name: 'Mossling health' }),
  ).toHaveAttribute('value', '60')
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await page.getByRole('button', { name: 'Ember 6 MP', exact: true }).click()
  await page.getByRole('button', { name: /^Ember → Mossling/ }).click()
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Victory', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Return to map', exact: true }).click()
  await expect(
    page.getByText('1 encounters cleared', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: /^Tile 3,2: Trail, cleared encounter, player/,
    }),
  ).toBeVisible()
  await world.press('ArrowLeft')
  await world.press('ArrowRight')
  await expect(
    page.getByRole('region', { name: 'Battle preview', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await page.getByRole('button', { name: 'Restart world', exact: true }).click()
  await expect(
    page.getByText('0 encounters cleared', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Load world', exact: true }).click()
  await expect(
    page.getByText('1 encounters cleared', { exact: true }),
  ).toBeVisible()
})

test('crosses a portal and saves position across maps on desktop and mobile', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Alderfell wildwood', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/world-desktop.png',
    fullPage: true,
  })
  // Route around the road encounter and follow the southern trail.
  for (const direction of [
    'south',
    'south',
    'south',
    'south',
    'east',
    'east',
    'east',
    'east',
    'east',
    'east',
    'east',
    'east',
    'north',
    'east',
  ]) {
    await page
      .getByRole('button', { name: `Move ${direction}`, exact: true })
      .click()
  }
  await expect(
    page.getByRole('heading', { name: 'Moss grove', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 1, 1',
  )
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await page.getByRole('button', { name: 'Restart world', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Alderfell wildwood', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Load world', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Moss grove', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/world-mobile.png',
    fullPage: true,
  })
})
