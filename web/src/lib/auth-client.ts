import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/auth";

// cliente do better-auth para Client Components; inferAdditionalFields traz o tipo de user.role
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), emailOTPClient()],
});
