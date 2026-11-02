import { expect, test, type Locator, type Page } from '@playwright/test'

// Login da ONG, "esqueci a senha", login do admin e páginas que exigem sessão.
// Não dependem de dados no banco: usam e-mails que não existem e conferem os redirecionamentos.

const BASE = 'http://localhost:3000'
const EMAIL_INEXISTENTE = 'ninguem-e2e@buscaong.invalid'

/**
 * Preenche e espera o botão habilitar: sob carga, o React pode assumir a página depois do
 * preenchimento e zerar os campos, então repete até o valor chegar no estado da tela.
 */
async function preencher(page: Page, campos: [Locator, string][], botao: Locator) {
  await expect(async () => {
    for (const [campo, valor] of campos) await campo.fill(valor)
    await expect(botao).toBeEnabled({ timeout: 1000 })
  }).toPass()
}

test.describe('login da ONG', () => {
  test('e-mail ou senha errados mostram a mensagem, sem sair da tela', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar no painel')

    const entrar = page.getByRole('button', { name: 'Entrar' })
    await preencher(page, [[page.getByLabel('E-mail de acesso'), EMAIL_INEXISTENTE], [page.locator('#senha'), 'SenhaErrada1']], entrar)
    await entrar.click()

    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
    await expect(page).toHaveURL(`${BASE}/login`)
  })

  test('links para cadastrar, continuar o cadastro e recuperar a senha', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.getByRole('link', { name: 'Cadastre a ONG' })).toHaveAttribute('href', '/ong/cadastro')
    await expect(page.getByRole('link', { name: 'Continue de onde parou' })).toHaveAttribute('href', '/ong/cadastro/continuar')
    await expect(page.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute('href', '/login/recuperar')
  })

  test('esqueci a senha: pede o código sem revelar se o e-mail tem conta', async ({ page }) => {
    await page.goto(`${BASE}/login/recuperar`)
    await page.waitForLoadState('networkidle')
    const enviar = page.getByRole('button', { name: 'Enviar código' })
    await preencher(page, [[page.getByLabel('E-mail de acesso'), EMAIL_INEXISTENTE]], enviar)
    await enviar.click()

    await expect(page.getByText(`Se ${EMAIL_INEXISTENTE} tem conta, enviamos um código para ele.`)).toBeVisible()
    await expect(page.getByRole('group', { name: 'Código de 6 dígitos' })).toBeVisible()

    // senha nova fora da regra: o botão continua desligado
    await page.getByLabel('Dígito 1').fill('123456')
    await page.locator('#nova-senha').fill('fraca')
    await page.locator('#confirmacao').fill('fraca')
    await expect(page.getByRole('button', { name: 'Salvar senha e entrar' })).toBeDisabled()
  })
})

test.describe('páginas que exigem sessão', () => {
  test('painel da ONG sem login leva ao login', async ({ page }) => {
    await page.goto(`${BASE}/ong/painel/itens`)
    await expect(page).toHaveURL(`${BASE}/login`)
  })

  for (const secao of ['ongs', 'denuncias', 'registro', 'listas']) {
    test(`/admin/${secao} sem login leva ao login do admin`, async ({ page }) => {
      await page.goto(`${BASE}/admin/${secao}`)
      await expect(page).toHaveURL(`${BASE}/admin`)
    })
  }
})

test('login do admin recusa credenciais erradas', async ({ page }) => {
  await page.goto(`${BASE}/admin`)
  await page.waitForLoadState('networkidle')
  const entrar = page.getByRole('button', { name: 'Entrar' })
  await preencher(page, [[page.getByLabel('E-mail'), EMAIL_INEXISTENTE], [page.locator('#senha-admin'), 'SenhaErrada1']], entrar)
  await entrar.click()
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
})

test('ONG que não existe mostra a página não encontrada', async ({ page }) => {
  const response = await page.goto(`${BASE}/ong/essa-ong-nao-existe-e2e`)
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada')
  await expect(page.getByRole('link', { name: 'Ir para o mapa', exact: true })).toHaveAttribute('href', '/')
})
