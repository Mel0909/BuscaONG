import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/backend/services/db";

vi.mock("@/backend/services/db", () => ({
  default: { user: { findUnique: vi.fn() } },
}));
vi.unmock("@/backend/services/auth");

import { getUserRole } from "@/backend/services/auth";

const db = vi.mocked(prisma, { deep: true });

beforeEach(() => vi.clearAllMocks());

describe("getUserRole", () => {
  it("sem ID não consulta o banco e não devolve perfil", async () => {
    await expect(getUserRole("")).resolves.toBeUndefined();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("devolve o perfil da conta", async () => {
    db.user.findUnique.mockResolvedValue({ role: "ADMIN" } as never);
    await expect(getUserRole("abc")).resolves.toBe("ADMIN");
  });

  it("conta que não existe não tem perfil", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(getUserRole("abc")).resolves.toBeUndefined();
  });
});
