import type { MotivoNaoElegivel } from "./elegibilidade";

export class OngJaCadastradaError extends Error {
  constructor() {
    super("Este CNPJ já tem uma conta. Entre ou recupere o acesso.");
    this.name = "OngJaCadastradaError";
  }
}

/** Já existe um cadastro não publicado para o CNPJ e a pessoa não escolheu recomeçar. */
export class CadastroEmAndamentoError extends Error {
  constructor() {
    super("Este CNPJ tem um cadastro em andamento. Continue de onde parou ou escolha começar de novo.");
    this.name = "CadastroEmAndamentoError";
  }
}

export class EmailEmUsoError extends Error {
  constructor() {
    super("Este e-mail já tem uma conta. Entre ou use outro e-mail.");
    this.name = "EmailEmUsoError";
  }
}

export class OngNaoEncontradaError extends Error {
  constructor() {
    super("Nenhuma ONG ligada a esta conta.");
    this.name = "OngNaoEncontradaError";
  }
}

/** Um valor que precisa vir de uma lista fixa (causa, item, atividade) não existe nela. */
export class OpcaoInvalidaError extends Error {
  constructor(public readonly campo: string) {
    super("Uma das opções escolhidas não existe mais. Recarregue a página e tente de novo.");
    this.name = "OpcaoInvalidaError";
  }
}

/** A chave da imagem não foi gerada para esta ONG. */
export class ImagemInvalidaError extends Error {
  constructor(public readonly campo: "logo" | "capa") {
    super("Imagem inválida. Envie a imagem de novo.");
    this.name = "ImagemInvalidaError";
  }
}

export class CadastroIncompletoError extends Error {
  constructor(public readonly pendencias: string[]) {
    super(`Falta completar: ${pendencias.join(", ")}.`);
    this.name = "CadastroIncompletoError";
  }
}

export class OngSuspensaError extends Error {
  constructor() {
    super("O perfil desta ONG está suspenso. Fale com a equipe do BuscaONG.");
    this.name = "OngSuspensaError";
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
