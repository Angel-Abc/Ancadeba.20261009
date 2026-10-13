import { expect, test } from '../fixtures'

test('plays an encounter to victory and restores a browser battle save', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('combobox', { name: 'Choose encounter', exact: true })
    .selectOption('moss-grove')
  await page.getByRole('button', { name: 'Save battle', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Battle saved in this browser.',
  )
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await expect(
    page.getByRole('progressbar', { name: 'Mossling health' }),
  ).toHaveAttribute('value', '38')
  await page.getByRole('button', { name: 'Load battle', exact: true }).click()
  await expect(
    page.getByRole('progressbar', { name: 'Mossling health' }),
  ).toHaveAttribute('value', '60')
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await page
    .getByRole('button', { name: /^Ember No MP cost$|^Ember 6 MP$/ })
    .click()
  await page.getByRole('button', { name: /^Ember → Mossling/ }).click()
  await page.getByRole('button', { name: /^Strike → Mossling/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Victory', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Restart battle', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Victory', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('progressbar', { name: 'Mossling health' }),
  ).toHaveAttribute('value', '60')
})

test('loads the editor project and renders a battle on a small screen', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Load editor project', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText(
    'Game loaded. Choose an encounter to play.',
  )
  await expect(
    page.getByRole('heading', { name: 'The forest road', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/engine-battle.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/engine-mobile.png',
    fullPage: true,
  })
})
