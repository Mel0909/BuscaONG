import { expect, test, type Page, type Request } from '@playwright/test'

// A API das ONGs é simulada no navegador (page.route); as listas dos filtros vêm do banco
// do servidor de desenvolvimento (pnpm db:seed). A localização não é concedida: o mapa abre em SP.

const BASE = 'http://localhost:3000'

const ong = (id: string, nome: string, extra: Record<string, unknown> = {}) => ({
  id,
  endereco: `ong-${id}`,
  nome,
  logoUrl: null,
  causa: 'Orfanatos',
  local: 'Vila Mariana',
  latitude: -23.5893,
  longitude: -46.6345,
  aproximada: false,
  distanciaKm: 4.3,
  itens: ['Fraldas', 'Leite em pó'],
  itensQueBatem: [],
  horarios: [],
  horariosQueBatem: [],
  urgentes: [],
  ...extra,
})

const ONGS = [ong('1', 'Casa Lar Esperança'), ong('2', 'Lar São Vicente', { causa: 'Idosos', distanciaKm: 0.9 })]

async function simularApi(page: Page, responder: (params: URLSearchParams) => unknown) {
  const pedidos: URLSearchParams[] = []
  await page.route(/\/api\/ongs\?/, (route) => {
    const params = new URL(route.request().url()).searchParams
    pedidos.push(params)
    return route.fulfill({ json: responder(params) })
  })
  await page.route(/\/api\/ongs\/mapa\?/, (route) => route.fulfill({ json: [] }))
  return pedidos
}

const listaPedida = (r: Request) => /\/api\/ongs\?/.test(r.url())

test.describe('tela principal', () => {
  test('mostra a lista perto de São Paulo quando a localização não é concedida', async ({ page }) => {
    const pedidos = await simularApi(page, () => ({ total: 2, ongs: ONGS }))
    await page.goto(BASE)

    await expect(page.getByRole('heading', { name: '2 ONGs nesta região' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Casa Lar Esperança/ })).toBeVisible()
    await expect(page.getByText('Orfanatos · Vila Mariana · 4,3 km')).toBeVisible()
    expect(pedidos[0].get('lat')).toBe('-23.5505')
  })

  test('filtro de item: contagem ao vivo, chip ativo e o item em destaque no card', async ({ page }) => {
    await simularApi(page, (params) => {
      if (params.get('item') !== 'fraldas') return { total: 2, ongs: ONGS }
      return { total: 1, ongs: [ong('1', 'Casa Lar Esperança', { itensQueBatem: ['Fraldas'] })] }
    })
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /^Filtros/ }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Fraldas', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Mostrar 1 ONG' })).toBeVisible()

    const aplicado = page.waitForRequest((r) => listaPedida(r) && new URL(r.url()).searchParams.get('item') === 'fraldas')
    await page.getByRole('button', { name: 'Mostrar 1 ONG' }).click()
    await aplicado

    await expect(page.getByRole('heading', { name: '1 ONG com seus filtros' })).toBeVisible()
    await expect(page.getByText('✓ Precisa de Fraldas')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remover filtro Fraldas' }).first()).toBeVisible()
  })

  test('sem resultados: sugere qual filtro remover', async ({ page }) => {
    await simularApi(page, (params) => {
      const total = params.getAll('causa').length > 0 ? 0 : 2
      return { total, ongs: total ? ONGS : [] }
    })
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // primeiro atalho de causa ao lado do botão de filtros
    const atalho = page.locator('button', { hasText: 'Orfanatos' }).first()
    await atalho.click()

    await expect(page.getByText('Nenhuma ONG com todos esses filtros')).toBeVisible()
    await expect(page.getByRole('button', { name: /Remover “Orfanatos”\s*2 ONGs/ })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar todos os filtros' }).click()
    await expect(page.getByRole('heading', { name: '2 ONGs nesta região' })).toBeVisible()
  })

  test('card com urgência mostra o selo; selecionado, leva à página da ONG', async ({ page }) => {
    await simularApi(page, () => ({
      total: 2,
      ongs: [ong('1', 'Casa Lar Esperança', { urgentes: ['Fraldas G'] }), ONGS[1]],
    }))
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Urgente · Fraldas G')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver página da ONG' })).toHaveCount(0)

    await page.getByRole('button', { name: /Casa Lar Esperança/ }).click()
    await expect(page.getByRole('link', { name: 'Ver página da ONG' })).toHaveAttribute(
      'href',
      '/ong/ong-1?de=-23.55050,-46.63330'
    )
  })

  test('engrenagem leva ao cadastro e ao login da ONG', async ({ page }) => {
    await simularApi(page, () => ({ total: 0, ongs: [] }))
    await page.goto(BASE)

    await page.getByRole('button', { name: 'Para ONGs' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Para ONGs' }).getByRole('link', { name: /Entrar no painel/ })).toHaveAttribute('href', '/login')
    await expect(page.getByRole('dialog', { name: 'Para ONGs' }).getByRole('link', { name: /Cadastrar minha ONG/ })).toHaveAttribute('href', '/ong/cadastro')

    await page.getByRole('dialog', { name: 'Para ONGs' }).getByRole('link', { name: /Cadastrar minha ONG/ }).click()
    await expect(page).toHaveURL(`${BASE}/ong/cadastro`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Comece pelo CNPJ da sua ONG')
  })
})
