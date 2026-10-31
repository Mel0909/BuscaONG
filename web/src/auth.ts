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

// código de 6 dígitos por e-mail, válido por 10 minutos (protótipo, cadastro passo 2)
export const OTP_VALIDADE_SEGUNDOS = 10 * 60;

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    database: prismaAdapter(prisma, {
        provider: "mongodb",
    }),
    hooks: {
        // bloqueia o cadastro direto pelo HTTP e aplica a regra de senha no servidor
        before: createAuthMiddleware(async (ctx) => validarRequisicaoAuth(ctx)),
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      // sendResetPassword: async ({ user, url /*, token*/ }, ) => {
        // // url already includes the reset token; just email it.
        // await sendEmail({
          // to: user.email,
          // subject: "Reset your password",
          // react: ResetPasswordEmail({ name: user.name, resetUrl: url }),
        // });
      // },
      // // optional: runs after a successful reset
      // onPasswordReset: async ({ user }) => {
        // console.log("Password reset for:", user.email);
      // },
    },
    user: {
        deleteUser: { 
            enabled: true
        },
        changeEmail: {
            enabled: true,
            // sendChangeEmailVerification: async ({ user, newEmail, url, token }, request) => {
            //     await sendEmail({
            //         to: user.email, // verification email must be sent to the current user email to approve the change
            //         subject: 'Approve email change',
            //         text: `Click the link to approve the change: ${url}`
            //     })
            // }
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