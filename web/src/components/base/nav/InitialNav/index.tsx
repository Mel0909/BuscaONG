import Link from "next/link";
import { UserRound } from "lucide-react";
import BuscaOngLogo from "@/components/base/brand/BuscaOngLogo";

function LandingPagesNav({ isLogged }: { isLogged: boolean }) {
  return (
    <nav className="w-full py-6 px-8
    flex items-center justify-between">
      <Link href='/'>
        <BuscaOngLogo />
      </Link>

      <ul className="flex items-center gap-4 text-xl">
        {isLogged ? (
          <li className="ml-8">
            <Link href='/logout' className="button-md text-papel bg-musgo flex items-center gap-2">
              <UserRound /> Sair
            </Link>
          </li>
        )
        : (
          <>
            <li className="ml-8">
              <Link href='/login' className="button-md ">Entrar</Link>
            </li>
            <li>
              <Link href="/ong/cadastro" className="button-md text-papel bg-musgo">Cadastrar ONG</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
   );
}

export default LandingPagesNav;
