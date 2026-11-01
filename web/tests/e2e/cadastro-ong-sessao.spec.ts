import { expect, test } from '@playwright/test'

// Os passos 3 a 8 leem a ONG do banco no servidor, então só abrem com a conta da ONG logada.
// O fluxo completo com banco foi verificado à mão (ver docs/buscaong.md §4.2); aqui fica o que
// não depende de banco: sem login, todos levam à tela de continuar o cadastro.

const BASE = 'http://localhost:3000'
const PASSOS = ['retomar', 'localizacao', 'contatos', 'causas-itens', 'voluntariado', 'apresentacao', 'publicar']

for (const passo of PASSOS) {
  test(`/ong/cadastro/${passo} sem login leva a continuar o cadastro`, async ({ page }) => {
    await page.goto(`${BASE}/ong/cadastro/${passo}`)
    await expect(page).toHaveURL(`${BASE}/ong/cadastro/continuar`)
  })
}

test('termos de uso abrem sem login', async ({ page }) => {
  await page.goto(`${BASE}/termos`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Termos de uso')
  await expect(page.getByText('Versão provisória')).toBeVisible()
})
