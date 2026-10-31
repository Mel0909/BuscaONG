import LandingPagesNav from "@/components/base/nav/InitialNav";
import { BuscaOngMark } from "@/components/base/brand/BuscaOngLogo";
import Link from "next/link";

function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingPagesNav isLogged={false} />

      <main className="flex-1 flex flex-col gap-2 items-center justify-start text-tinta pt-12">
        <BuscaOngMark size={120} />
        <h1 className="text-musgo font-display font-bold text-8xl mt-2">404</h1>
        <p className="font-semibold text-4xl">Página não encontrada</p>
        <p className="text-xl leading-7 max-w-[445px] text-center text-tinta-suave">Ainda estamos trabalhando para adicionar novas páginas e serviços</p>

        <Link href='/' className="button-md bg-musgo text-papel text-xl mt-2">Voltar ao início</Link>
      </main>
    </div>
   );
}

export default NotFound;
