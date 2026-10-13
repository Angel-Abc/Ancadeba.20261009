import { expect, test } from '../fixtures'

test('interacts by keyboard and click, follows branches, saves conversation progress and flags', async ({
  page,
}) => {
  await page.goto('/')
  const world = page.getByRole('region', {
    name: 'World exploration',
    exact: true,
  })
  await world.press('ArrowRight')
  await world.press('e')
  const conversation = page.getByRole('dialog', {
    name: 'Conversation with Mara',
    exact: true,
  })
  await expect(conversation).toBeVisible()
  await expect(
    conversation.getByRole('button', {
      name: 'I have spoken with the grove keeper.',
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Move south', exact: true }),
  ).toBeDisabled()
  await conversation
    .getByRole('button', { name: 'Can I help?', exact: true })
    .click()
  await conversation
    .getByRole('button', { name: 'I will visit the grove.', exact: true })
    .click()
  await expect(conversation).toContainText('Then go with care.')
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await conversation
    .getByRole('button', { name: 'End conversation', exact: true })
    .click()
  await expect(conversation).toHaveCount(0)
  await page
    .getByRole('button', { name: /^Tile 2,3: Meadow, NPC Mara/ })
    .click()
  await expect(
    conversation.getByRole('button', { name: 'Can I help?', exact: true }),
  ).toHaveCount(0)
  await conversation
    .getByRole('button', { name: 'Farewell.', exact: true })
    .click()
  await expect(conversation).toHaveCount(0)
  await expect(page.getByLabel('Player position', { exact: true })).toHaveText(
    'Position: 2, 2',
  )
  await page.getByRole('button', { name: 'Restart world', exact: true }).click()
  await page.getByRole('button', { name: 'Load world', exact: true }).click()
  await expect(conversation).toContainText('Then go with care.')
  await conversation.press('Escape')
  await expect(conversation).toHaveCount(0)
  await world.press(' ')
  await expect(conversation).toBeVisible()
  await expect(
    conversation.getByRole('button', { name: 'Can I help?', exact: true }),
  ).toHaveCount(0)
  await page.screenshot({
    path: 'test-results/npc-conversation-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/npc-conversation-mobile.png',
    fullPage: true,
  })
})
