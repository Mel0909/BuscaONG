import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./app/(backend)/services/db";

import { customSession, emailOTP } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { getUserRole } from "@/backend/services/auth";
import { sendEmail } from "./lib/email";
import { codigoVerificacaoEmail } from "./lib/email/templates/codigoVerificacao";
import { validarRequisicaoAuth } from "./lib/auth-hooks";
import { protegerConsumoOtp } from "./lib/auth-consumo-otp";

// código de 6 dígitos por e-mail, válido por 10 minutos (protótipo, cadastro passo 2)
export const OTP_VALIDADE_SEGUNDOS = 10 * 60;

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    database: prismaAdapter(prisma, {
        provider: "mongodb",
    }),
    // rotas HTTP que o site não usa (o servidor ainda chama auth.api.* quando precisa):
    // - check-verification-otp conta as tentativas sem atomicidade e diz se a conta existe;
    // - login só por código daria acesso sem trocar a senha nem encerrar as sessões;
    // - recuperar a senha passa só por /api/password/*, com limite por IP;
    // - apagar a conta tiraria do ar uma ONG suspensa e liberaria o CNPJ para um cadastro novo.
    disabledPaths: [
        "/email-otp/check-verification-otp",
        "/sign-in/email-otp",
        "/email-otp/request-password-reset",
        "/forget-password/email-otp",
        "/email-otp/reset-password",
        "/request-password-reset",
        "/reset-password",
        "/delete-user",
    ],
    hooks: {
        // bloqueia o cadastro direto pelo HTTP e aplica a regra de senha no servidor
        before: createAuthMiddleware(async (ctx) => {
          validarRequisicaoAuth(ctx);
          await protegerConsumoOtp(ctx);
        }),
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      // "esqueci a senha" usa código por e-mail (emailOTP), não link: tela /login/recuperar,
      // rotas /api/password/forgot e /api/password/reset
    },
    user: {
        // nenhuma tela apaga a própria conta; a exclusão é do admin (ver disabledPaths acima)
        deleteUser: {
            enabled: false
        },
        // nenhuma tela troca o e-mail; ligado, uma ONG logada mandaria códigos para qualquer
        // endereço (gastando o limite diário de e-mails de todo o site)
        changeEmail: {
            enabled: false,
        }
    },
    // Descomente abaixo para ativar o provedor social google e login com google funcionar
    // socialProviders: { 
    //     google: { 
    //        clientId: process.env.GOOGLE_ID as string, 
    //        clientSecret: process.env.GOOGLE_SECRET as string, 
    //     }, 
    // }, 
    plugins: [
        // a verificação de e-mail usa código (OTP) em vez de link
        emailOTP({
            disableSignUp: true,
            allowedAttempts: 3,
            overrideDefaultEmailVerification: true,
            otpLength: 6,
            expiresIn: OTP_VALIDADE_SEGUNDOS,
            storeOTP: "hashed",
            async sendVerificationOTP({ email, otp, type }) {
                await sendEmail(codigoVerificacaoEmail(email, otp, type, OTP_VALIDADE_SEGUNDOS / 60));
            },
        }),
        customSession(async ({ user, session }) => {
            const role = await getUserRole(session.userId);
            return {
                role,
                user,
                session
            };
        }),
        nextCookies(),
    ],
});
