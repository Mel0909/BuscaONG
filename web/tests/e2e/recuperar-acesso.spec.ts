import { expect, test } from "@playwright/test";

const BASE = "http://localhost:3000";

test("recupera acesso por código e pede login após redefinir", async ({ page }) => {
  await page.route("**/api/password/forgot", (route) => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/password/reset", (route) => route.fulfill({ json: { ok: true } }));
  await page.goto(`${BASE}/recuperar-acesso`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail de acesso").fill("ong@example.com");
  const pedido = page.waitForRequest("**/api/password/forgot");
  await page.getByRole("button", { name: "Enviar código", exact: true }).click();
  expect((await pedido).postDataJSON()).toEqual({ email: "ong@example.com" });
  await expect(page.getByText("Se houver uma conta com esse e-mail", { exact: false })).toBeVisible();
  await page.getByLabel("Dígito 1").pressSequentially("123456");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123");
  await page.getByLabel("Confirme a nova senha", { exact: true }).fill("Diferente123");
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "As senhas não são iguais." })).toBeVisible();
  await page.getByLabel("Confirme a nova senha", { exact: true }).fill("NovaSenha123");
  const confirmacao = page.waitForRequest("**/api/password/reset");
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  expect((await confirmacao).postDataJSON()).toEqual({ email: "ong@example.com", codigo: "123456", newPassword: "NovaSenha123" });
  await expect(page.getByRole("heading", { name: "Senha redefinida" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuar cadastro da ONG" })).toHaveAttribute("href", "/ong/cadastro/continuar");
});

test("código inválido mantém o formulário e oferece novo envio", async ({ page }) => {
  await page.route("**/api/password/forgot", (route) => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/password/reset", (route) => route.fulfill({ status: 400, json: { error: { message: "Código incorreto ou expirado." } } }));
  await page.goto(`${BASE}/recuperar-acesso`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail de acesso").fill("ong@example.com");
  await page.getByRole("button", { name: "Enviar código", exact: true }).click();
  await page.getByLabel("Dígito 1").pressSequentially("111111");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123");
  await page.getByLabel("Confirme a nova senha", { exact: true }).fill("NovaSenha123");
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Código incorreto ou expirado." })).toBeVisible();
  await page.getByRole("button", { name: "Solicitar outro código ou corrigir e-mail" }).click();
  await expect(page.getByRole("button", { name: "Enviar código", exact: true })).toBeVisible();
});
