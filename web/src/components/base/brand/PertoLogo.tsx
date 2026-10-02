import { cn } from "@/lib/utils";

// marca do perto: quadrado arredondado com um pin (ver design/)
// "light" é para fundos claros e "dark" para fundos escuros
type Variant = "light" | "dark";

const markColors: Record<Variant, { bg: string; pin: string }> = {
  light: { bg: "var(--color-musgo)", pin: "var(--color-salvia)" },
  dark: { bg: "var(--color-salvia)", pin: "var(--color-musgo-escuro)" },
};

export function PertoMark({ size = 34, variant = "light", className }: { size?: number; variant?: Variant; className?: string }) {
  const { bg, pin } = markColors[variant];

  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" className={className}>
      <rect width="34" height="34" rx="11" fill={bg} />
      <path
        d="M17 11A6 6 0 0 1 23 17A6 6 0 0 1 17 23H13A2 2 0 0 1 11 21V17A6 6 0 0 1 17 11Z"
        transform="rotate(-45 17 17)"
        fill={pin}
      />
    </svg>
  );
}

function PertoLogo({ size = 34, variant = "light", className }: { size?: number; variant?: Variant; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <PertoMark size={size} variant={variant} />
      <span
        className={cn("font-display font-bold tracking-tight", variant === "light" ? "text-tinta" : "text-papel")}
        style={{ fontSize: size * 0.6 }}
      >
        perto
      </span>
    </span>
  );
}

export default PertoLogo;
