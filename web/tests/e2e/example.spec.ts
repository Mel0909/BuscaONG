import { test, expect } from '@playwright/test'

test('should navigate to the ONG sign-up page', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.getByRole('link', { name: 'Cadastrar ONG' }).click()

  await expect(page).toHaveURL('http://localhost:3000/ong/cadastro')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Comece pelo CNPJ da sua ONG')
})
