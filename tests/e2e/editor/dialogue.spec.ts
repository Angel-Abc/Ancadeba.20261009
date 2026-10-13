import { expect, test } from '../fixtures'

test('authors a branching dialogue, edits conditions and effects, and previews it', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Dialogues/ })
    .click()
  await page.getByRole('button', { name: 'Add dialogue', exact: true }).click()
  await page
    .getByLabel('Dialogue name', { exact: true })
    .fill('The bridge keeper')
  await page
    .getByLabel('Node text', { exact: true })
    .fill('Which path will you take?')
  await page.getByRole('button', { name: 'Add node', exact: true }).click()
  await page
    .getByLabel('Node text', { exact: true })
    .fill('The eastern path is open.')
  await page.getByRole('button', { name: /greeting · start/ }).click()
  await page.getByRole('button', { name: 'Add choice', exact: true }).click()
  await page
    .getByLabel('Choice text', { exact: true })
    .fill('I choose the eastern path.')
  await page
    .getByRole('combobox', { name: 'Next node', exact: true })
    .selectOption('node-1')
  await page.getByRole('button', { name: 'Add condition', exact: true }).click()
  await page.getByLabel('Condition flag', { exact: true }).fill('east-path')
  await page
    .getByRole('combobox', { name: 'Condition value', exact: true })
    .selectOption('false')
  await page
    .getByRole('button', { name: 'Add flag effect', exact: true })
    .click()
  await page.getByLabel('Effect flag', { exact: true }).fill('east-path')
  await page
    .getByRole('button', { name: 'Preview dialogue', exact: true })
    .click()
  const preview = page.getByRole('dialog', {
    name: 'Conversation with The bridge keeper',
    exact: true,
  })
  // Live editing while previewing must not steal focus from the authoring field.
  await page
    .getByLabel('Node text', { exact: true })
    .fill('Choose your road, traveller.')
  await expect(page.getByLabel('Node text', { exact: true })).toBeFocused()
  await expect(preview).toContainText('Choose your road, traveller.')
  await preview
    .getByRole('button', { name: 'I choose the eastern path.', exact: true })
    .click()
  await expect(preview).toContainText('The eastern path is open.')
  await expect(preview.getByText('east-path', { exact: true })).toBeVisible()
  await expect(preview.getByText('true', { exact: true })).toBeVisible()
  await page.screenshot({
    path: 'test-results/dialogue-editor-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/dialogue-editor-mobile.png',
    fullPage: true,
  })
})

test('creates an NPC, assigns dialogue, places it and interacts in the map preview', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /NPCs/ })
    .click()
  await page.getByRole('button', { name: 'Add NPC', exact: true }).click()
  await page.getByLabel('NPC name', { exact: true }).fill('Tamsin')
  await page
    .getByLabel('NPC description', { exact: true })
    .fill('A traveller on the old road.')
  await page
    .getByRole('combobox', { name: 'NPC dialogue', exact: true })
    .selectOption('grove-keeper')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /World maps/ })
    .click()
  await page
    .getByRole('combobox', { name: 'NPC to place', exact: true })
    .selectOption('npc-1')
  await page.getByRole('button', { name: 'Place NPC', exact: true }).click()
  await page.getByRole('button', { name: /^Tile 1,3:/ }).click()
  await expect(
    page.getByRole('combobox', { name: 'Placed NPC', exact: true }),
  ).toHaveValue('npc-1')
  await page.getByRole('button', { name: 'Playtest map', exact: true }).click()
  await page
    .getByRole('button', { name: 'Talk to Tamsin', exact: true })
    .click()
  const conversation = page.getByRole('dialog', {
    name: 'Conversation with Tamsin',
    exact: true,
  })
  await expect(conversation).toContainText(
    'Welcome, traveller. The grove is quiet today.',
  )
  await conversation
    .getByRole('button', {
      name: 'May I receive the grove’s blessing?',
      exact: true,
    })
    .click()
  await expect(conversation).toContainText('Carry the peace of this place')
})

test('rejects broken dialogue links, permits undo, and previews NPC and dialogue overrides', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Dialogues/ })
    .click()
  await page.getByRole('button', { name: 'Delete node', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'missing start node welcome',
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
    .filter({ has: page.getByRole('heading', { name: /Traveller tales/ }) })
    .getByLabel('Enabled', { exact: true })
    .check()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Explore world', exact: true })
    .click()
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await page
    .getByRole('button', { name: 'Talk to Mara, storyteller', exact: true })
    .click()
  const conversation = page.getByRole('dialog', {
    name: 'Conversation with Mara, storyteller',
    exact: true,
  })
  await expect(conversation).toContainText('Every traveller carries a story.')
  await conversation
    .getByRole('button', { name: 'Tell me a traveller’s story.', exact: true })
    .click()
  await expect(conversation).toContainText('A wanderer once crossed the river')
})
