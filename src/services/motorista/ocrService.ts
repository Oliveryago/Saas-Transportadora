import { invokeExtractFunction, asText, OcrError } from "../ocr/documentOcrClient";
export { OcrError } from "../ocr/documentOcrClient";
export type { OcrErrorCode } from "../ocr/documentOcrClient";

export interface OCRResult {
  nome_completo: string;
  cpf: string;
  numero_cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  data_nascimento: string;
  data_primeira_habilitacao: string | null;
  numero_espelho: string | null;
  confidence: number;
  method?: "claude" | "none";
}

export interface VehicleDocOcrResult {
  placa: string;
  modelo: string;
  ano_fabricacao: string;
  ano_modelo: string;
  chassi: string;
  renavam: string;
  cor: string;
  combustivel: string;
  capacidade_carga: string;
  categoria: string;
}

export const ocrService = {
  async processCNH(file: File): Promise<OCRResult> {
    console.log("[OCR] Iniciando leitura de CNH...", { name: file.name, type: file.type, size: file.size });
    return invokeExtractFunction("extract-cnh-claude", file, (data) => {
      console.log("[OCR] CPF na resposta bruta:", data.cpf);
      return {
        nome_completo: asText(data.nome_completo ?? data.nomeCompleto),
        cpf: asText(data.cpf),
        numero_cnh: asText(data.numero_cnh ?? data.numeroCNH),
        categoria_cnh: asText(data.categoria ?? data.categoria_cnh),
        validade_cnh: asText(data.validade ?? data.validade_cnh),
        data_nascimento: asText(data.data_nascimento ?? data.dataNascimento),
        data_primeira_habilitacao: asText(data.data_primeira_habilitacao) || null,
        numero_espelho: asText(data.numero_espelho ?? data.renach) || null,
        confidence: 1,
        method: "claude" as const,
      };
    });
  },

  async processVehicleDocument(file: File): Promise<VehicleDocOcrResult> {
    console.log("[OCR] Iniciando leitura de CRLV...", { name: file.name, type: file.type, size: file.size });
    return invokeExtractFunction("extract-vehicle-doc-claude", file, (data) => ({
      placa: asText(data.placa),
      modelo: asText(data.modelo),
      ano_fabricacao: asText(data.ano_fabricacao),
      ano_modelo: asText(data.ano_modelo),
      chassi: asText(data.chassi),
      renavam: asText(data.renavam),
      cor: asText(data.cor),
      combustivel: asText(data.combustivel),
      capacidade_carga: asText(data.capacidade_carga),
      categoria: asText(data.categoria),
    }));
  },

  compareData(ocrData: { cpf?: string }, manualData: { cpf?: string }) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf || "") === clean(manualData.cpf || "");
  },
};

export function getDocumentOcrUserMessage(error: unknown, documentLabel = "documento"): string {
  if (error instanceof OcrError) {
    switch (error.code) {
      case "network":
      case "timeout":
        return "Sem conexão com o servidor, tente novamente.";
      case "unreadable":
      case "parse":
        return `Não conseguimos ler o ${documentLabel}. Tente uma foto mais nítida ou preencha manualmente.`;
      case "invalid_file":
        return error.message || "Arquivo inválido. Envie uma foto JPG/PNG ou um PDF.";
      case "too_large":
        return "O arquivo é muito grande. Envie um JPG/PNG ou PDF de até 10 MB.";
      case "auth":
        return `Não foi possível processar o ${documentLabel} agora. Preencha manualmente.`;
      default:
        return `Houve um erro ao processar o ${documentLabel}. Preencha manualmente.`;
    }
  }
  return `Houve um erro ao processar o ${documentLabel}. Preencha manualmente.`;
}

export function crlvFieldsFromOcr(ocr: VehicleDocOcrResult, crlvUrl?: string) {
  const yearModel = parseInt(ocr.ano_modelo, 10);
  const yearFab = parseInt(ocr.ano_fabricacao, 10);
  const year = Number.isFinite(yearModel) ? yearModel : Number.isFinite(yearFab) ? yearFab : undefined;

  return {
    license_plate: ocr.placa,
    model: ocr.modelo,
    year,
    year_manufacture: Number.isFinite(yearFab) ? yearFab : null,
    chassi: ocr.chassi || null,
    renavam: ocr.renavam || null,
    color: ocr.cor || null,
    crlv_fuel: ocr.combustivel || null,
    load_capacity: ocr.capacidade_carga || null,
    crlv_category: ocr.categoria || null,
    crlv_url: crlvUrl || null,
  };
}
