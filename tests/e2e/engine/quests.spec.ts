import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'

async function move(page: Page, directions: string[]) {
  for (const direction of directions)
    await page
      .getByRole('button', { name: `Move ${direction}`, exact: true })
      .click()
}
async function winMossling(page: Page) {
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await page.getByRole('button', { name: 'Ember 6 MP', exact: true }).click()
  await page.getByRole('button', { name: /^Ember → Mossling/ }).click()
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Victory', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Return to map', exact: true }).click()
}

test('completes a quest through NPCs and a world battle, restores progress after reload, and unlocks its follow-up', async ({
  page,
}) => {
  await page.goto('/')
  const journal = page.getByRole('region', {
    name: 'Quest journal',
    exact: true,
  })
  await journal
    .getByRole('button', { name: 'Available (1)', exact: true })
    .click()
  await expect(journal).toContainText('Speak with Mara')
  await expect(
    journal.getByRole('button', { name: /Accept A kindness/ }),
  ).toHaveCount(0)
  await move(page, ['east'])
  await page.getByRole('button', { name: 'Talk to Mara', exact: true }).click()
  const mara = page.getByRole('dialog', {
    name: 'Conversation with Mara',
    exact: true,
  })
  await mara.getByRole('button', { name: 'Can I help?', exact: true }).click()
  await mara
    .getByRole('button', { name: 'I will visit the grove.', exact: true })
    .click()
  await journal.getByRole('button', { name: 'Active (1)', exact: true }).click()
  const quest = journal.getByRole('article', {
    name: 'A kindness for the grove',
    exact: true,
  })
  await expect(
    quest.getByLabel('Win a moss grove encounter. Progress', { exact: true }),
  ).toHaveText('0 / 1')
  await mara
    .getByRole('button', { name: 'End conversation', exact: true })
    .click()
  await move(page, ['east'])
  await winMossling(page)
  await expect(
    quest.getByLabel('Win a moss grove encounter. Progress', { exact: true }),
  ).toHaveText('1 / 1')
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Load world', exact: true }).click()
  await expect(
    quest.getByLabel('Win a moss grove encounter. Progress', { exact: true }),
  ).toHaveText('1 / 1')
  await move(page, [
    'west',
    'west',
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
  ])
  await expect(
    page.getByRole('heading', { name: 'Moss grove', exact: true }),
  ).toBeVisible()
  await move(page, ['south', 'east', 'east', 'east', 'east', 'south'])
  await page
    .getByRole('button', { name: 'Talk to Elowen', exact: true })
    .click()
  const elowen = page.getByRole('dialog', {
    name: 'Conversation with Elowen',
    exact: true,
  })
  await elowen
    .getByRole('button', {
      name: 'May I receive the grove’s blessing?',
      exact: true,
    })
    .click()
  await elowen
    .getByRole('button', { name: 'I will bring Mara your news.', exact: true })
    .click()
  await expect(
    quest.getByLabel('Promise Elowen to deliver her message. Progress', {
      exact: true,
    }),
  ).toHaveText('1 / 1')
  await move(page, [
    'south',
    'south',
    'west',
    'west',
    'west',
    'west',
    'west',
    'west',
    'west',
    'west',
    'north',
    'north',
    'north',
    'north',
    'east',
  ])
  await page.getByRole('button', { name: 'Talk to Mara', exact: true }).click()
  await mara
    .getByRole('button', {
      name: 'I have spoken with the grove keeper.',
      exact: true,
    })
    .click()
  await mara
    .getByRole('button', { name: 'Until next time.', exact: true })
    .click()
  await journal
    .getByRole('button', { name: 'Completed (1)', exact: true })
    .click()
  await expect(quest).toContainText('completed')
  await journal
    .getByRole('button', { name: 'Available (1)', exact: true })
    .click()
  await journal
    .getByRole('button', { name: 'Accept Guardians of the trail', exact: true })
    .click()
  await journal.getByRole('button', { name: 'Active (1)', exact: true }).click()
  await expect(journal).toContainText('0 / 2')
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await page.getByRole('button', { name: 'Restart world', exact: true }).click()
  await expect(journal).toContainText('No active quests')
  await page.getByRole('button', { name: 'Load world', exact: true }).click()
  await expect(journal).toContainText('Guardians of the trail')
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click()
  await page.screenshot({
    path: 'test-results/quest-journal-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/quest-journal-mobile.png',
    fullPage: true,
  })
})
