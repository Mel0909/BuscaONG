import CadastroForm from "./_components/CadastroForm";
import PertoLogo from "@/components/base/brand/PertoLogo";

function Cadastro() {
  return (
    <>
      <nav className="w-full py-6 px-8">
        <PertoLogo />
      </nav>

      <CadastroForm />
    </>
   );
}

export default Cadastro;
