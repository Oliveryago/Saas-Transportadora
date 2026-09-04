export function formatBRL(value: number | null | undefined): string {
  return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Interpreta digitação de moeda brasileira (centavos). "1234" → 12,34 */
export function parseBRLDigits(raw: string): number {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}
