import { expect, test } from '../fixtures'

test('paints maps, authors spawns and encounter markers, and undoes edits', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /World maps/ })
    .click()
  await page.getByRole('button', { name: /River.*Blocked/ }).click()
  await page.getByRole('button', { name: /^Tile 2,2:/ }).click()
  await expect(
    page.getByRole('button', { name: /^Tile 2,2: River/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Tile 2,2: Trail/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Place spawn', exact: true }).click()
  await page.getByRole('button', { name: /^Tile 2,2:/ }).click()
  await expect(
    page.getByRole('button', { name: /^Tile 2,2: Trail, spawn/ }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Encounter to place', exact: true })
    .selectOption('moss-grove')
  await page
    .getByRole('button', { name: 'Place encounter', exact: true })
    .click()
  await page.getByRole('button', { name: /^Tile 4,2:/ }).click()
  await page.getByLabel('Repeatable encounter', { exact: true }).check()
  await page.getByRole('button', { name: 'Inspect tile', exact: true }).click()
  await page.getByRole('button', { name: /^Tile 4,2:/ }).click()
  await expect(
    page.getByLabel('Repeatable encounter', { exact: true }),
  ).toBeChecked()
  await page.screenshot({
    path: 'test-results/map-editor-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/map-editor-mobile.png',
    fullPage: true,
  })
})

test('creates and resizes a map, links a portal, and explores the draft', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /World maps/ })
    .click()
  await page.getByRole('button', { name: 'Add map', exact: true }).click()
  await page.getByLabel('Map name', { exact: true }).fill('Northern trail')
  await page.getByLabel('Map width', { exact: true }).fill('10')
  await page.getByLabel('Map height', { exact: true }).fill('6')
  await page.getByRole('button', { name: 'Resize map', exact: true }).click()
  await expect(
    page
      .getByRole('group', { name: 'Northern trail tiles', exact: true })
      .getByRole('button'),
  ).toHaveCount(60)
  await page
    .getByRole('combobox', { name: 'Portal destination map', exact: true })
    .selectOption('moss-grove-map')
  await page.getByRole('button', { name: 'Place portal', exact: true }).click()
  await page.getByRole('button', { name: /^Tile 2,1:/ }).click()
  await expect(page.getByLabel('Portal name', { exact: true })).toHaveValue(
    'To Moss grove',
  )
  await page.getByRole('button', { name: 'Playtest map', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Northern trail', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Moss grove', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 1, 1',
  )
})

test('validates collisions and mod terrain overrides while preserving the draft', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /World maps/ })
    .click()
  await page.getByRole('button', { name: /River.*Blocked/ }).click()
  await page.getByRole('button', { name: /^Tile 1,2:/ }).click()
  await expect(page.getByRole('alert')).toContainText(
    'spawn must be on walkable terrain',
  )
  await expect(
    page.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Mods/ })
    .click()
  await page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: /River crossing/ }) })
    .getByLabel('Enabled', { exact: true })
    .check()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /World maps/ })
    .click()
  await expect(
    page.getByRole('button', { name: /Shallow river.*Walkable/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: /Shallow river.*Walkable/ }).click()
  await page.getByRole('button', { name: /^Tile 1,2:/ }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Playtest map', exact: true }).click()
  await expect(
    page.getByRole('button', {
      name: /^Tile 1,2: Shallow river, spawn, player/,
    }),
  ).toBeVisible()
})
