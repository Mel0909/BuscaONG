import { expect, test, type Page } from '@playwright/test'

// As chamadas à API são simuladas no navegador (page.route): o teste cobre a interface
// do cadastro sem precisar de banco, Receita Federal ou envio de e-mail.

const BASE = 'http://localhost:3000'
const CNPJ = '12345678000195'
const CNPJ_EM_ANDAMENTO = '11222333000181' // cadastro começado e não publicado

const receita = {
  cnpj: CNPJ,
  razaoSocial: 'ASSOCIACAO CASA LAR ESPERANCA',
  nomeFantasia: null,
  situacaoCadastral: 'ATIVA',
  naturezaJuridica: { codigo: '3999', descricao: 'Associação Privada' },
  endereco: {
    tipoLogradouro: 'RUA', logradouro: 'DOMINGOS DE MORAIS', numero: '1200', complemento: null,
    bairro: 'VILA MARIANA', municipio: 'SAO PAULO', uf: 'SP', cep: '04010100',
  },
  fonte: 'brasilapi',
}

async function simularApi(page: Page) {
  await page.route('**/api/cnpj/*', (route) => {
    const cnpj = route.request().url().split('/').pop()
    if (cnpj === '00000000000191') return route.fulfill({ json: { status: 'JA_CADASTRADO', cnpj } })
    if (cnpj === CNPJ_EM_ANDAMENTO) return route.fulfill({ json: { status: 'EM_ANDAMENTO', cnpj, receita } })
    return route.fulfill({ json: { status: 'ELEGIVEL', cnpj: CNPJ, receita } })
  })
  await page.route('**/api/ongs', (route) =>
    route.fulfill({
      status: 201,
      json: { ong: { id: 'ong-1', cnpj: CNPJ, status: 'RASCUNHO', passoAtual: 3 }, email: 'contato@casalar.org.br' },
    })
  )
  await page.route('**/api/auth/email-otp/verify-email', (route) =>
    route.fulfill({ json: { status: true, token: 'token', user: {} } })
  )
}

test.describe('cadastro da ONG', () => {
  test.beforeEach(async ({ page }) => {
    await simularApi(page)
    await page.goto(`${BASE}/ong/cadastro`)
    await page.waitForLoadState('networkidle')
  })

  test('mostra CNPJ inválido sem consultar a API', async ({ page }) => {
    let consultou = false
    page.on('request', (req) => { if (req.url().includes('/api/cnpj/')) consultou = true })

    await page.locator('#cnpj').pressSequentially('12345678000196')

    await expect(page.locator('#cnpj')).toHaveValue('12.345.678/0001-96')
    await expect(page.getByText('✕ Inválido')).toBeVisible()
    expect(consultou).toBe(false)
  })

  test('mostra o caminho para entrar quando o CNPJ já tem conta', async ({ page }) => {
    await page.locator('#cnpj').pressSequentially('00000000000191')

    await expect(page.getByText('Este CNPJ já tem uma conta no BuscaONG.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Entrar ou recuperar o acesso' })).toBeVisible()
  })

  test('cadastro em andamento oferece continuar ou começar de novo', async ({ page }) => {
    await page.locator('#cnpj').pressSequentially(CNPJ_EM_ANDAMENTO)

    await expect(page.getByText('Este CNPJ tem um cadastro em andamento')).toBeVisible()
    await expect(page.getByText('já tem uma conta')).toBeHidden()
    await expect(page.getByRole('link', { name: 'Continuar de onde parei' })).toHaveAttribute(
      'href',
      '/ong/cadastro/continuar'
    )

    await expect(page.getByRole('link', { name: 'Começar de novo' })).toHaveAttribute(
      'href', '/ong/cadastro/continuar?reiniciar=1'
    )
    await page.getByRole('link', { name: 'Começar de novo' }).click()
    await expect(page).toHaveURL(`${BASE}/ong/cadastro/continuar?reiniciar=1`)
    await expect(page.getByText('Depois, confirme o e-mail', { exact: false })).toBeVisible()

  })

  test('valida o CNPJ, cria o acesso e confirma o código', async ({ page }) => {
    await page.locator('#cnpj').pressSequentially(CNPJ)
    await expect(page.getByText('Encontrado na Receita Federal')).toBeVisible()
    await page.getByRole('button', { name: 'Usar esses dados e continuar' }).click()

    await expect(page).toHaveURL(`${BASE}/ong/cadastro/acesso`)
    await page.locator('#email').fill('contato@casalar.org.br')
    await page.locator('#senha').fill('senha')
    await expect(page.getByRole('button', { name: 'Criar acesso' })).toBeDisabled()
    await page.locator('#senha').fill('Senha123')

    // confirmação diferente: avisa e não deixa criar
    await page.locator('#confirmacao-senha').fill('Senha12')
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Criar acesso' })).toBeDisabled()
    await page.locator('#confirmacao-senha').fill('Senha123')
    await expect(page.getByText('As senhas não são iguais.')).toBeHidden()

    // o olho mostra a senha digitada
    await page.getByRole('button', { name: 'Mostrar senha' }).first().click()
    await expect(page.locator('#senha')).toHaveAttribute('type', 'text')

    const criacao = page.waitForRequest('**/api/ongs')
    await page.getByRole('button', { name: 'Criar acesso' }).click()
    expect((await criacao).postDataJSON()).toEqual({
      cnpj: CNPJ,
      email: 'contato@casalar.org.br',
      password: 'Senha123',
      usarEnderecoReceita: true,
    })

    await expect(page.getByText('Digite o código enviado para contato@casalar.org.br')).toBeVisible()
    await page.getByLabel('Dígito 1').pressSequentially('481203')
    const passo3 = page.waitForRequest((r) => r.url().startsWith(`${BASE}/ong/cadastro/localizacao`))
    await page.getByRole('button', { name: 'Confirmar e continuar' }).click()
    await passo3

    // a confirmação do código é simulada, então não há sessão de verdade:
    // o passo 3 (que lê a ONG no servidor) manda para a tela de continuar o cadastro
    await expect(page).toHaveURL(`${BASE}/ong/cadastro/continuar`)
  })
})

test.describe('continuar o cadastro', () => {
  test('senha errada avisa sem pedir código', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 401, json: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' } })
    )
    await page.goto(`${BASE}/ong/cadastro/continuar`)
    // espera o React assumir a página (no WebKit, preencher antes disso perde o valor)
    await page.waitForLoadState("networkidle")

    // sob carga, o React pode assumir a página depois do preenchimento e zerar os campos: repete até valer
    await expect(async () => {
      await page.locator('#email').fill('contato@casalar.org.br')
      await page.locator('#senha').fill('Senha999')
      await expect(page.getByRole('button', { name: 'Continuar cadastro' })).toBeEnabled({ timeout: 1000 })
    }).toPass()
    await page.getByRole('button', { name: 'Continuar cadastro' }).click()

    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
    await expect(page.getByLabel('Dígito 1')).toBeHidden()
  })

  test('e-mail não confirmado: manda código novo e segue para o passo em que parou', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 403, json: { code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' } })
    )
    await page.route('**/api/auth/email-otp/send-verification-otp', (route) => route.fulfill({ json: { success: true } }))
    await page.route('**/api/auth/email-otp/verify-email', (route) =>
      route.fulfill({ json: { status: true, token: 'token', user: {} } })
    )
    await page.goto(`${BASE}/ong/cadastro/continuar`)
    // espera o React assumir a página (no WebKit, preencher antes disso perde o valor)
    await page.waitForLoadState("networkidle")

    await expect(async () => {
      await page.locator('#email').fill('contato@casalar.org.br')
      await page.locator('#senha').fill('Senha123')
      await expect(page.getByRole('button', { name: 'Continuar cadastro' })).toBeEnabled({ timeout: 1000 })
    }).toPass()
    const novoCodigo = page.waitForRequest('**/api/auth/email-otp/send-verification-otp')
    await page.getByRole('button', { name: 'Continuar cadastro' }).click()
    expect((await novoCodigo).postDataJSON()).toEqual({ email: 'contato@casalar.org.br', type: 'email-verification' })

    await expect(page.getByText('Falta confirmar o e-mail')).toBeVisible()
    await page.getByLabel('Dígito 1').pressSequentially('481203')

    const retomar = page.waitForRequest((r) => r.url().startsWith(`${BASE}/ong/cadastro/retomar`))
    await page.getByRole('button', { name: 'Confirmar e continuar' }).click()
    await retomar
  })
})
