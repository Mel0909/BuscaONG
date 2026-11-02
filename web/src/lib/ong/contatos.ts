import { formatarWhatsapp, linkWhatsapp } from "@/utils/validations/contatos";

// Botões de contato da página da ONG (P5). A barra fixa tem até 2 botões, por prioridade:
// WhatsApp, e-mail, site, Instagram. O que não couber vira botão no fim da página.
// WhatsApp é o principal quando existe; sem ele, o e-mail.

export type TipoContato = "whatsapp" | "email" | "site" | "instagram";
export type ContatosVisiveis = Partial<Record<TipoContato, string>>;

export type BotaoContato = {
  tipo: TipoContato;
  rotulo: string;
  href: string;
  /** abre em outra aba (site e Instagram) */
  externo: boolean;
  primario: boolean;
};

const ORDEM: TipoContato[] = ["whatsapp", "email", "site", "instagram"];
const MAX_NA_BARRA = 2;

function botao(tipo: TipoContato, valor: string): Omit<BotaoContato, "primario"> {
  switch (tipo) {
    case "whatsapp":
      return { tipo, rotulo: "WhatsApp", href: linkWhatsapp(valor), externo: true };
    case "email":
      return { tipo, rotulo: "E-mail", href: `mailto:${valor}`, externo: false };
    case "site":
      return { tipo, rotulo: "Site ↗", href: valor, externo: true };
    case "instagram":
      return { tipo, rotulo: "Instagram ↗", href: `https://instagram.com/${valor.replace(/^@/, "")}`, externo: true };
  }
}

export function botoesDeContato(contatos: ContatosVisiveis): { barra: BotaoContato[]; fimDaPagina: BotaoContato[] } {
  const presentes = ORDEM.filter((tipo) => contatos[tipo]);
  const naBarra = presentes.slice(0, MAX_NA_BARRA);
  const principal = naBarra.includes("whatsapp") ? "whatsapp" : naBarra.includes("email") ? "email" : naBarra[0];
  const montar = (tipo: TipoContato) => ({ ...botao(tipo, contatos[tipo]!), primario: tipo === principal });

  return {
    // o principal fica à direita, mais perto do polegar (como no protótipo)
    barra: naBarra.map(montar).reverse(),
    fimDaPagina: presentes.slice(MAX_NA_BARRA).map(montar),
  };
}

/** Texto de um contato para mostrar (WhatsApp formatado, o resto como está). */
export function textoDoContato(tipo: TipoContato, valor: string): string {
  return tipo === "whatsapp" ? formatarWhatsapp(valor) : valor;
}
