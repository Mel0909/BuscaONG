import LoginForm from './_components/LoginForm';
import BuscaOngLogo from '@/components/base/brand/BuscaOngLogo';

function LoginPage() {
  return (
    <main className="lg:h-screen flex">
      <div className="w-[55%] h-full flex flex-col gap-8 items-center justify-center">
        <LoginForm />
      </div>

      <div className="login-background h-full w-[45%] flex flex-col items-center py-32">
        <h1>
          <BuscaOngLogo size={80} variant="dark" />
        </h1>
      </div>
    </main>
   );
}

export default LoginPage;
