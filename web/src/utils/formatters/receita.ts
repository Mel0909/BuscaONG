// Formatação dos dados da Receita Federal para exibir na tela.
// A Receita devolve tudo em maiúsculas (e muitas vezes sem acento).

const MINUSCULAS = new Set(["a", "as", "o", "os", "e", "de", "da", "das", "do", "dos", "em", "na", "nas", "no", "nos"]);

/** "ASSOCIACAO CASA LAR DA ESPERANCA" → "Associacao Casa Lar da Esperanca" */
export function capitalizarNome(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra, i) =>
      i > 0 && MINUSCULAS.has(palavra) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1)
    )
    .join(" ");
}

/** "3999" → "399-9" (formato com dígito usado pela Receita) */
export function formatarNaturezaJuridica(codigo: string | null): string | null {
  if (!codigo || !/^\d{4}$/.test(codigo)) return codigo;
  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
}

const ABREVIACOES: Record<string, string> = {
  RUA: "R.",
  AVENIDA: "Av.",
  TRAVESSA: "Tv.",
  ALAMEDA: "Al.",
  PRACA: "Pç.",
  RODOVIA: "Rod.",
  ESTRADA: "Estr.",
};

type Endereco = {
  tipoLogradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
};

/** → "R. Domingos de Morais, 1200 — Vila Mariana, Sao Paulo/SP" */
export function formatarEndereco(e: Endereco): string {
  const tipo = e.tipoLogradouro
    ? ABREVIACOES[e.tipoLogradouro.toUpperCase()] ?? capitalizarNome(e.tipoLogradouro)
    : null;
  const rua = [tipo, e.logradouro ? capitalizarNome(e.logradouro) : null].filter(Boolean).join(" ");
  const numero = e.numero && e.numero.toUpperCase() !== "SN" ? e.numero : "s/n";
  const local = [e.bairro ? capitalizarNome(e.bairro) : null, [e.municipio ? capitalizarNome(e.municipio) : null, e.uf].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(", ");

  return [rua ? `${rua}, ${numero}` : null, local].filter(Boolean).join(" — ");
}
