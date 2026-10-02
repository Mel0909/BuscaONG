import LandingPagesNav from "@/components/base/nav/InitialNav";
import { headers } from "next/headers";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  const isLogged = !!session?.user;

  return (
    <div className="min-h-screen">
      <LandingPagesNav isLogged={isLogged} />

      <main className="h-[70vh] w-full pt-20 pb-16 flex flex-col items-center justify-center text-center">
        <h1 className="font-bold text-5xl font-display text-musgo-escuro">BuscaONG</h1>
        <p className="pt-4 text-xl">Em construção</p>
      </main>
    </div>
  );
}
