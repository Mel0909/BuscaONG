import type { MotivoNaoElegivel } from "./elegibilidade";

export class OngJaCadastradaError extends Error {
  constructor() {
    super("Este CNPJ já tem uma conta. Entre ou recupere o acesso.");
    this.name = "OngJaCadastradaError";
  }
}

export class EmailEmUsoError extends Error {
  constructor() {
    super("Este e-mail já tem uma conta. Entre ou use outro e-mail.");
    this.name = "EmailEmUsoError";
  }
}

export class OngNaoElegivelError extends Error {
  constructor(public readonly motivo: MotivoNaoElegivel) {
    super(
      motivo === "SITUACAO_NAO_ATIVA"
        ? "O CNPJ não está com situação ativa na Receita Federal."
        : "O CNPJ não é de uma entidade sem fins lucrativos."
    );
    this.name = "OngNaoElegivelError";
  }
}
