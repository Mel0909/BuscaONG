export class NaoEncontradoError extends Error {
  constructor(message = "Não encontrado") {
    super(message);
    this.name = "NaoEncontradoError";
  }
}

/** A ação não vale para o estado atual (ex.: reativar uma ONG que não está suspensa). */
export class AcaoInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcaoInvalidaError";
  }
}
