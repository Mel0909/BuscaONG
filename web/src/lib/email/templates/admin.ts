import type { Email } from "..";

// E-mails das decisões do admin: para a ONG (suspensão e reativação) e para quem denunciou
// e deixou e-mail (P5.1: "avisamos quando houver uma decisão").

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// cores do BuscaONG (docs/buscaong.md §11); e-mail precisa de estilo inline
function montar(to: string, assunto: string, paragrafos: string[]): Email {
  const text = [...paragrafos, "", "BuscaONG"].join("\n\n");
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#F6F3EA;font-family:Arial,sans-serif;color:#1F2B24">
    <div style="max-width:520px;margin:0 auto;background:#FFFDF8;border:1px solid #DCD5C4;border-radius:16px;padding:32px">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#2E5E45">BuscaONG</p>
      ${paragrafos.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapar(p)}</p>`).join("\n      ")}
    </div>
  </body>
</html>`;
  return { to, subject: `${assunto} · BuscaONG`, text, html };
}

export function suspensaoOngEmail(to: string, ongNome: string, motivo: string): Email {
  return montar(to, "O perfil da sua ONG foi suspenso", [
    `O perfil de ${ongNome} foi suspenso pela equipe do BuscaONG e saiu do mapa.`,
    `Motivo: ${motivo}`,
    "Se você acha que foi um engano ou já resolveu o problema, responda este e-mail.",
  ]);
}

export function reativacaoOngEmail(to: string, ongNome: string): Email {
  return montar(to, "O perfil da sua ONG voltou ao ar", [
    `O perfil de ${ongNome} foi reativado e voltou a aparecer no mapa do BuscaONG.`,
  ]);
}

export function imagemRemovidaEmail(to: string, ongNome: string, tipo: "logo" | "capa", motivo: string): Email {
  const qual = tipo === "logo" ? "a logo" : "a foto de capa";
  return montar(to, `A equipe removeu ${qual} do perfil`, [
    `A equipe do BuscaONG removeu ${qual} do perfil de ${ongNome}. O perfil continua no ar.`,
    `Motivo: ${motivo}`,
    "Vocês podem enviar outra imagem pelo painel, em Perfil público. Se acham que foi um engano, respondam este e-mail.",
  ]);
}

const DECISOES = {
  arquivada: "A equipe analisou o perfil e não encontrou motivo para retirá-lo do ar. A denúncia foi arquivada.",
  suspensa: "A equipe analisou o perfil e o retirou do ar.",
  excluida: "A equipe analisou o perfil e o excluiu do BuscaONG.",
} as const;

export function denunciaDecididaEmail(to: string, ongNome: string, decisao: keyof typeof DECISOES): Email {
  return montar(to, "Sua denúncia foi analisada", [
    `Obrigado por avisar sobre o perfil de ${ongNome}.`,
    DECISOES[decisao],
  ]);
}
