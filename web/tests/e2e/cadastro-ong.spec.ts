import { expect, test, type Page } from '@playwright/test'

// As chamadas à API são simuladas no navegador (page.route): o teste cobre a interface
// do cadastro sem precisar de banco, Receita Federal ou envio de e-mail.

const BASE = 'http://localhost:3000'
const CNPJ = '12345678000195'

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

    await expect(page.getByText('Este CNPJ já tem uma conta no perto.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Entrar ou recuperar o acesso' })).toBeVisible()
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
    await page.getByRole('button', { name: 'Confirmar e continuar' }).click()

    await expect(page).toHaveURL(`${BASE}/ong/cadastro/localizacao`)
    await expect(page.getByRole('heading', { name: 'Acesso criado!' })).toBeVisible()
  })
})
