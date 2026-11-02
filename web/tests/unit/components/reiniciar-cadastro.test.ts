// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReiniciarCadastro } from "@/frontend/ong/cadastro/_components/ReiniciarCadastro";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), salvar: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/frontend/ong/cadastro/_components/CadastroContext", () => ({ useCadastro: () => ({ salvar: mocks.salvar }) }));
const fetchMock = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("só solicita a limpeza depois de código e confirmação explícita", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  render(createElement(ReiniciarCadastro, { email: "ong@example.com" }));
  fireEvent.click(screen.getByRole("button", { name: "Enviar código de confirmação" }));
  await screen.findByRole("checkbox");
  expect(fetchMock.mock.calls[0][0]).toBe("/api/ongs/minha/reinicio/codigo");
  expect(mocks.salvar).not.toHaveBeenCalled();
  const confirmar = screen.getByRole("button", { name: "Confirmar e recomeçar" }) as HTMLButtonElement;
  expect(confirmar.disabled).toBe(true);
  for (let i = 0; i < 6; i++) fireEvent.change(screen.getByLabelText(`Dígito ${i + 1}`), { target: { value: String(i + 1) } });
  expect(confirmar.disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(confirmar);
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/ong/cadastro/localizacao"));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ codigo: "123456", confirmar: true });
  expect(mocks.salvar).toHaveBeenCalledWith(null);
});

it("erro da API mantém os dados locais e permite continuar o cadastro", async () => {
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: { message: "O cadastro mudou." } }) });
  render(createElement(ReiniciarCadastro, { email: "ong@example.com" }));
  fireEvent.click(screen.getByRole("button", { name: "Enviar código de confirmação" }));
  await screen.findByText("O cadastro mudou.");
  expect(mocks.salvar).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "Manter meus dados e continuar" }).getAttribute("href")).toBe("/ong/cadastro/retomar");
});
