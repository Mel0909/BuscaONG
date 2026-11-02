// Cria uma conta de admin (perfil ADMIN) pelo terminal. Pela raiz: pnpm admin:criar
// O cadastro pelo site só cria contas de ONG; admin nasce aqui. A senha é gravada pelo
// better-auth (com hash), nunca direto no banco, e segue a mesma regra das outras contas.
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mongodb" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
});

const SENHA_VALIDA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** Pergunta sem mostrar o que é digitado (para a senha). */
async function perguntarEscondido(rl: ReturnType<typeof createInterface>, pergunta: string) {
  const escrever = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
    if (s.startsWith(pergunta)) stdout.write(pergunta);
  };
  const resposta = await rl.question(pergunta);
  (rl as unknown as { _writeToOutput: typeof escrever })._writeToOutput = escrever;
  stdout.write("\n");
  return resposta;
}

const rl = createInterface({ input: stdin, output: stdout });
try {
  const email = (process.argv[2] ?? (await rl.question("E-mail do admin: "))).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente?.role === "ADMIN") {
    console.info(`${email} já é admin.`);
  } else if (existente) {
    throw new Error("Este e-mail é de uma conta de ONG. Use outro e-mail para o admin.");
  } else {
    const nome = (await rl.question("Nome: ")).trim() || email.split("@")[0];
    const senha = await perguntarEscondido(rl, "Senha (8+ caracteres, com maiúscula, minúscula e número): ");
    if (!SENHA_VALIDA.test(senha)) throw new Error("A senha não segue a regra.");
    if ((await perguntarEscondido(rl, "Repita a senha: ")) !== senha) throw new Error("As senhas não conferem.");

    const { user } = await auth.api.signUpEmail({ body: { name: nome, email, password: senha } });
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN", emailVerified: true } });
    console.info(`Admin ${email} criado. Entre em /admin.`);
  }
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}
