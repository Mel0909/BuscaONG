'use client'
import { useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { invalido?: boolean };

/** Campo de senha com o botão de olho para mostrar e esconder o que foi digitado. */
export function CampoSenha({ invalido, className, ...props }: Props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visivel ? "text" : "password"}
        aria-invalid={invalido}
        className={cn(
          "h-[52px] w-full rounded-[14px] border border-borda bg-papel pl-4 pr-12 text-base outline-none focus:border-2 focus:border-musgo",
          invalido && "border-2 border-tinta",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setVisivel(!visivel)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-tinta-suave hover:bg-salvia-clara hover:text-musgo"
      >
        {visivel ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
