export function getMissingColumnName(
  err: { code?: string; message?: string; details?: string; hint?: string } | null | undefined
): string | null {
  if (!err) return null;
  const msg = `${err.message || ""} ${err.details || ""} ${err.hint || ""}`;
  const patterns = [
    /Could not find the ['"]([^'"]+)['"] column/i,
    /column "([^"]+)" of relation/i,
    /column "?([a-zA-Z0-9_]+)"? does not exist/i,
  ];
  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (err.code === "PGRST204" || err.code === "42703") {
    const fallback = msg.match(/['"]([a-zA-Z0-9_]+)['"]/);
    return fallback?.[1] ?? null;
  }
  return null;
}

export async function writeWithColumnFallback<T>(
  write: (payload: Record<string, unknown>) => Promise<{ data: T | null; error: any }>,
  initialPayload: Record<string, unknown>,
  maxAttempts = 10
): Promise<T> {
  const payload = { ...initialPayload };
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await write(payload);
    if (!error) {
      if (data == null) throw new Error("Não foi possível salvar o registro.");
      return data;
    }
    lastError = error;
    const column = getMissingColumnName(error);
    if (!column || !(column in payload)) break;
    delete payload[column];
  }

  throw lastError;
}

export function humanizeWriteError(err: any, entity = "registro"): Error {
  const msg = `${err?.message || ""} ${err?.details || ""} ${err?.hint || ""}`;
  if (err?.code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    if (/cpf/i.test(msg)) return new Error("Já existe um motorista cadastrado com este CPF.");
    return new Error(`Este ${entity} já está cadastrado.`);
  }
  if (
    err?.code === "22008" ||
    err?.code === "22007" ||
    /date\/time field value out of range|invalid input syntax for type date/i.test(msg)
  ) {
    return new Error("Há uma data inválida no cadastro. Confira nascimento, validade da CNH e 1ª habilitação.");
  }
  if (err?.code === "23503") {
    return new Error("Há um vínculo inválido de veículo ou implemento. Selecione novamente a frota.");
  }
  if (err instanceof Error && err.message) return err;
  return new Error(err?.message || `Erro ao salvar ${entity}.`);
}
