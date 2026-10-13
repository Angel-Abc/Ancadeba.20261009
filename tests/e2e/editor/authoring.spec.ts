import { readFile } from 'node:fs/promises'
import { expect, test } from '../fixtures'

test('authors actor stats, supports undo and redo, and playtests the draft', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Actors/ })
    .click()
  const hp = page.getByLabel('Max HP', { exact: true })
  const original = await hp.inputValue()
  await hp.fill('137')
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(hp).toHaveValue(original)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(hp).toHaveValue('137')
  await page
    .getByRole('button', { name: '▷ Playtest game', exact: true })
    .click()
  await expect(
    page.getByRole('progressbar', { name: 'Rowan health' }),
  ).toHaveAttribute('max', '137')
  await expect(
    page.getByRole('heading', { name: 'The forest road', exact: true }),
  ).toBeVisible()
})

test('prevents saving broken references and allows undoing deletion', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Actors/ })
    .click()
  await page.getByRole('button', { name: 'Delete actor', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('missing actor rowan')
  await expect(
    page.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Rowan')
})

test('adds content, enables a mod, and previews the composed game', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Abilities/ })
    .click()
  await page.getByRole('button', { name: 'Add ability', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Moonlight')
  await page.getByLabel('MP cost', { exact: true }).fill('3')
  await page.getByLabel('Power', { exact: true }).fill('40')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Mods/ })
    .click()
  await page.getByLabel('Enabled', { exact: true }).check()
  await page
    .getByRole('button', { name: '▷ Playtest game', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Ancient Mossling', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('progressbar', { name: 'Ancient Mossling health' }),
  ).toHaveAttribute('max', '120')
})

test('imports and exports projects and reports invalid JSON', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Project JSON', exact: false })
    .click()
  const source = page.getByRole('textbox', {
    name: 'Project JSON',
    exact: true,
  })
  const original = await source.inputValue()
  await source.fill('{broken')
  await page.getByRole('button', { name: 'Apply JSON', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  const project = JSON.parse(original)
  project.name = 'Moonlit Road'
  await source.fill(JSON.stringify(project))
  await page.getByRole('button', { name: 'Apply JSON', exact: true }).click()
  await expect(
    page.getByText('Moonlit Road (basic-game)', { exact: true }),
  ).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).not.toBeNull()
  expect(JSON.parse(await readFile(path!, 'utf8')).name).toBe('Moonlit Road')
  await page
    .getByLabel('Import project', { exact: true })
    .setInputFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(original),
    })
  await expect(
    page.getByText('Basic Game (basic-game)', { exact: true }),
  ).toBeVisible()
})

test.describe('project persistence', () => {
  test.use({
    expectedConsoleErrors: [
      /^Failed to load resource: the server responded with a status of 409\b/,
    ],
  })
  test('saves to the API, reloads authored data, and keeps the project on save conflicts', async ({
    page,
    request,
  }) => {
    const original = await (await request.get('/api/project')).json()
    try {
      await page.goto('/')
      await page
        .getByRole('navigation')
        .getByRole('button', { name: /Actors/ })
        .click()
      await page.getByLabel('Max HP', { exact: true }).fill('144')
      await page
        .getByRole('button', { name: 'Save project', exact: true })
        .click()
      await expect(page.getByRole('status')).toHaveText(
        'Project saved to disk.',
      )
      const saved = await (await request.get('/api/project')).json()
      expect(saved.project.game.actors[0].maxHp).toBe(144)
      await page.reload()
      await page
        .getByRole('navigation')
        .getByRole('button', { name: /Actors/ })
        .click()
      await expect(page.getByLabel('Max HP', { exact: true })).toHaveValue(
        '144',
      )
      await request.put('/api/project', {
        data: { project: saved.project, revision: saved.revision },
      })
      await page.getByLabel('Max HP', { exact: true }).fill('155')
      await page
        .getByRole('button', { name: 'Save project', exact: true })
        .click()
      await expect(page.getByRole('alert')).toContainText(
        'Project changed. Reload before saving again.',
      )
      await expect(page.getByLabel('Max HP', { exact: true })).toHaveValue(
        '155',
      )
    } finally {
      const latest = await (await request.get('/api/project')).json()
      await request.put('/api/project', {
        data: { project: original.project, revision: latest.revision },
      })
    }
  })
})

test('renders the editor overview at desktop and mobile sizes', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'A world shaped by your choices.' }),
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/editor-overview.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/editor-mobile.png',
    fullPage: true,
  })
})
