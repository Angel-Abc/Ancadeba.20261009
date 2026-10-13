import { expect, test } from '../fixtures'

test('authors quest activation, counted and ordered objectives, completion flags, and journal playtests', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Quests/ })
    .click()
  await page.getByRole('button', { name: 'Add quest', exact: true }).click()
  await page.getByLabel('Quest name', { exact: true }).fill('A watchful road')
  await page
    .getByLabel('Quest description', { exact: true })
    .fill('Keep the trail safe and listen to Mara’s advice.')
  const first = page.getByRole('group', { name: 'Objective 1', exact: true })
  await first
    .getByLabel('Objective text', { exact: true })
    .fill('Win two forest road encounters.')
  await first.getByLabel('Required count', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Add objective', exact: true }).click()
  const second = page.getByRole('group', { name: 'Objective 2', exact: true })
  await second
    .getByLabel('Objective text', { exact: true })
    .fill('Listen to Mara’s advice.')
  await second
    .getByRole('combobox', { name: 'Event type', exact: true })
    .selectOption('dialogue-choice')
  await second
    .getByRole('combobox', { name: 'Trigger node', exact: true })
    .selectOption('road')
  await second
    .getByRole('combobox', { name: 'Trigger choice', exact: true })
    .selectOption('understood')
  await second
    .getByRole('combobox', { name: 'Trigger NPC', exact: true })
    .selectOption('mara')
  await page.getByLabel('Complete objectives in order', { exact: true }).check()
  await page
    .getByRole('button', { name: 'Add completion flag', exact: true })
    .click()
  await page
    .getByLabel('Completion flag', { exact: true })
    .fill('road-watch-complete')
  await page
    .getByRole('combobox', { name: 'Quest starts', exact: true })
    .selectOption('dialogue')
  const acceptance = page.getByRole('group', {
    name: 'Acceptance dialogue',
    exact: true,
  })
  await acceptance
    .getByRole('combobox', { name: 'Trigger node', exact: true })
    .selectOption('offer')
  await acceptance
    .getByRole('combobox', { name: 'Trigger NPC', exact: true })
    .selectOption('mara')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page
    .getByRole('combobox', { name: 'Quest starts', exact: true })
    .selectOption('journal')
  await second
    .getByRole('button', { name: 'Move objective up', exact: true })
    .click()
  await expect(first.getByLabel('Objective text', { exact: true })).toHaveValue(
    'Listen to Mara’s advice.',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(first.getByLabel('Objective text', { exact: true })).toHaveValue(
    'Win two forest road encounters.',
  )
  await page.screenshot({
    path: 'test-results/quest-editor-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/quest-editor-mobile.png',
    fullPage: true,
  })
  await page
    .getByRole('button', { name: 'Playtest quests', exact: true })
    .click()
  const journal = page.getByRole('region', {
    name: 'Quest journal',
    exact: true,
  })
  await journal
    .getByRole('button', { name: 'Available (2)', exact: true })
    .click()
  await journal
    .getByRole('button', { name: 'Accept A watchful road', exact: true })
    .click()
  await journal.getByRole('button', { name: 'Active (1)', exact: true }).click()
  await expect(journal).toContainText('Waiting for earlier objectives')
  await expect(journal).toContainText('0 / 2')
})

test('validates quest dependency cycles and restores deleted quests with undo', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Quests/ })
    .click()
  await page.getByLabel('Guardians of the trail', { exact: true }).check()
  await expect(page.getByRole('alert')).toContainText('Quest dependency cycle')
  await expect(
    page.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Delete quest', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'requires missing quest grove-pilgrimage',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
