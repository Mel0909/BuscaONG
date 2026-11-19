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

  test('esqueci a senha: manda e-mail, código e senha nova para /api/password/*', async ({ page }) => {
    await page.route('**/api/password/forgot', (route) => route.fulfill({ json: { ok: true } }))
    await page.route('**/api/password/reset', (route) => route.fulfill({ json: { ok: true } }))
    await page.goto(`${BASE}/login/recuperar`)
    await page.waitForLoadState('networkidle')

    const enviar = page.getByRole('button', { name: 'Enviar código' })
    await preencher(page, [[page.getByLabel('E-mail de acesso'), 'Ong@Example.com']], enviar)
    const pedido = page.waitForRequest('**/api/password/forgot')
    await enviar.click()
    expect((await pedido).postDataJSON()).toEqual({ email: 'ong@example.com' })

    await page.getByLabel('Dígito 1').fill('123456')
    await page.locator('#nova-senha').fill('NovaSenha123')
    await page.locator('#confirmacao').fill('NovaSenha123')
    const troca = page.waitForRequest('**/api/password/reset')
    await page.getByRole('button', { name: 'Salvar senha e entrar' }).click()
    expect((await troca).postDataJSON()).toEqual({ email: 'ong@example.com', codigo: '123456', newPassword: 'NovaSenha123' })

    // a conta não existe de verdade: o login automático falha e a tela manda entrar com a senha nova
    await expect(page.getByRole('link', { name: 'Entre com a senha nova' })).toHaveAttribute('href', '/login')
  })

  test('esqueci a senha: código recusado limpa o código e deixa tentar de novo', async ({ page }) => {
    await page.route('**/api/password/forgot', (route) => route.fulfill({ json: { ok: true } }))
    await page.route('**/api/password/reset', (route) =>
      route.fulfill({ status: 400, json: { error: { message: 'Código incorreto, expirado ou já utilizado.' } } })
    )
    await page.goto(`${BASE}/login/recuperar`)
    await page.waitForLoadState('networkidle')

    const enviar = page.getByRole('button', { name: 'Enviar código' })
    await preencher(page, [[page.getByLabel('E-mail de acesso'), 'ong@example.com']], enviar)
    await enviar.click()
    await page.getByLabel('Dígito 1').fill('111111')
    await page.locator('#nova-senha').fill('NovaSenha123')
    await page.locator('#confirmacao').fill('NovaSenha123')
    await page.getByRole('button', { name: 'Salvar senha e entrar' }).click()

    // filtra pelo texto: o anunciador de rotas do Next também tem papel de alerta
    await expect(page.getByRole('alert').filter({ hasText: 'Código incorreto, expirado ou já usado.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar senha e entrar' })).toBeDisabled()
    await page.getByRole('button', { name: 'Usar outro e-mail' }).click()
    await expect(page.getByRole('button', { name: 'Enviar código' })).toBeVisible()
  })
})

test.describe('páginas que exigem sessão', () => {
  test('painel da ONG sem login leva ao login', async ({ page }) => {
    await page.goto(`${BASE}/ong/painel/itens`)
    await expect(page).toHaveURL(`${BASE}/login`)
  })

  test('reiniciar o cadastro sem sessão volta ao "continuar", com o link para recuperar a senha', async ({ page }) => {
    await page.goto(`${BASE}/ong/cadastro/reiniciar`)
    await expect(page).toHaveURL(`${BASE}/ong/cadastro/continuar`)
    await expect(page.getByRole('link', { name: 'Recupere o acesso pelo e-mail' })).toHaveAttribute('href', '/login/recuperar')
  })

  for (const secao of ['ongs', 'denuncias', 'imagens', 'registro', 'listas']) {
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
