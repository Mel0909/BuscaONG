import type { MotivoDenuncia } from "@prisma/client";

// Denúncia de perfil (P5.1) e fila do admin (A2). Os valores são os do enum MotivoDenuncia.

export const MOTIVOS_DENUNCIA: { valor: MotivoDenuncia; texto: string; curto: string }[] = [
  { valor: "FECHOU", texto: "A ONG fechou ou mudou de endereço", curto: "ONG fechou ou mudou" },
  { valor: "PEDIU_DINHEIRO", texto: "Pediu dinheiro ou dados pessoais", curto: "Pedido de dinheiro ou dados" },
  { valor: "NAO_E_ONG", texto: "Não parece ser uma ONG", curto: "Não é ONG" },
  { valor: "VIOLENCIA", texto: "Violência verbal ou física", curto: "Violência" },
  { valor: "CONTEUDO_INADEQUADO", texto: "Conteúdo ou fotos inadequados", curto: "Conteúdo inadequado" },
  { valor: "OUTRO", texto: "Outro motivo", curto: "Outro motivo" },
];

export const nomeDoMotivo = (motivo: MotivoDenuncia) => MOTIVOS_DENUNCIA.find((m) => m.valor === motivo)?.curto ?? motivo;

export const MAX_RELATO = 1000;

/** Uma denúncia por perfil a cada 24 h por aparelho (contra abuso). */
export const INTERVALO_DENUNCIA_MS = 24 * 60 * 60 * 1000;

/** Denúncias da mesma ONG e motivo em 7 dias que levam a ONG ao topo da fila. */
export const DENUNCIAS_PARA_TOPO = 3;
export const JANELA_TOPO_MS = 7 * 24 * 60 * 60 * 1000;
