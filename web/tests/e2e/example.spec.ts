import { test, expect } from '@playwright/test'

test('a engrenagem "Para ONGs" leva ao cadastro da ONG', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Para ONGs' }).first().click()
  await page.getByRole('dialog', { name: 'Para ONGs' }).getByRole('link', { name: /Cadastrar minha ONG/ }).click()

  await expect(page).toHaveURL('http://localhost:3000/ong/cadastro')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Comece pelo CNPJ da sua ONG')
})
