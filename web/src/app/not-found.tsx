import Link from "next/link";

import BuscaOngLogo, { BuscaOngMark } from "@/components/base/brand/BuscaOngLogo";

// página não encontrada (inclui ONG que saiu do ar ou endereço digitado errado)
export default function NaoEncontrada() {
  return (
    <div className="flex min-h-dvh flex-col bg-creme">
      <header className="px-5 py-5 md:px-10">
        <Link href="/" aria-label="BuscaONG: ir para o mapa" className="inline-flex">
          <BuscaOngLogo size={30} />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pb-20 text-center">
        <BuscaOngMark size={72} />
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">Página não encontrada</h1>
        <p className="max-w-[440px] text-base leading-normal text-tinta-suave">
          O endereço pode ter mudado, ou a ONG não está mais no BuscaONG. Procure ONGs perto de você no mapa.
        </p>
        <Link
          href="/"
          className="mt-2 flex h-[50px] items-center rounded-[15px] bg-musgo px-7 text-base font-semibold text-papel hover:bg-musgo-escuro"
        >
          Ir para o mapa
        </Link>
      </main>
    </div>
  );
}
