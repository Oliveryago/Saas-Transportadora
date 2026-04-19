/**
 * Utilitários de Comparação de Dados
 * Utilizado para validar divergências entre dados extraídos via OCR e dados manuais/banco.
 */

/**
 * Compara duas strings removendo acentos, espaços extras e convertendo para minúsculo.
 */
export const compareStrings = (str1: string, str2: string): boolean => {
  const normalize = (s: string) => 
    s.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .trim();
  
  return normalize(str1 || "") === normalize(str2 || "");
};

/**
 * Compara CPFs removendo pontuação.
 */
export const compareCPF = (cpf1: string, cpf2: string): boolean => {
  const clean = (c: string) => c.replace(/\D/g, "");
  return clean(cpf1 || "") === clean(cpf2 || "");
};

/**
 * Verifica se houve divergência entre um objeto OCR e os dados do formulário.
 * Retorna um array com os campos divergentes.
 */
export const getDivergences = (ocrData: any, formData: any, fields: string[]): string[] => {
  return fields.filter(field => {
    if (field === "cpf") return !compareCPF(ocrData[field], formData[field]);
    if (typeof ocrData[field] === "string") return !compareStrings(ocrData[field], formData[field]);
    return ocrData[field] !== formData[field];
  });
};
