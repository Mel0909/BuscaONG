import type { Metadata } from "next";
import BuscaOngLogo from "@/components/base/brand/BuscaOngLogo";
import { RecuperarAcesso } from "@/components/auth/RecuperarAcesso";

export const metadata: Metadata = { title: "Recuperar acesso · BuscaONG", robots: { index: false, follow: false } };

export default function RecuperarAcessoPage() {
  return <main className="min-h-screen bg-creme px-5 py-12 text-tinta">
    <div className="mx-auto flex max-w-[520px] flex-col gap-10">
      <BuscaOngLogo />
      <RecuperarAcesso />
    </div>
  </main>;
}
