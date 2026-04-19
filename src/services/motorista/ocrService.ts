/**
 * Serviço de OCR para Processamento de CNH
 */

export interface OCRResult {
  nome_completo: string;
  cpf: string;
  numero_cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  data_nascimento: string;
  confidence: number;
}

/**
 * Função interna para simular o comportamento de uma IA de OCR
 */
const getMockOCRData = (): OCRResult => ({
  nome_completo: "JOÃO DA SILVA MOTORISTA MOCK",
  cpf: "123.456.789-00",
  numero_cnh: "9876543210-0",
  categoria_cnh: "AD",
  validade_cnh: "2030-12-31",
  data_nascimento: "1985-05-20",
  confidence: 0.98,
});

/**
 * PONTO DE INTEGRAÇÃO FUTURA:
 * Aqui você deve plugar a chamada real para sua API (Axios, Fetch, etc.)
 */
const callExternalOCRProvider = async (file: File): Promise<OCRResult> => {
  // Exemplo de como ficaria no futuro:
  // const formData = new FormData();
  // formData.append("file", file);
  // const response = await api.post("/ocr/cnh", formData);
  // return response.data;

  // Por enquanto, retorna o mock
  return getMockOCRData();
};

export const ocrService = {
  /**
   * Processamento principal da CNH
   */
  async processCNH(file: File): Promise<OCRResult> {
    console.log("Iniciando processamento de CNH:", file.name);

    // Simular delay de processamento (REDE/IA)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Chama o provedor (atual mock, futuro real)
      const data = await callExternalOCRProvider(file);
      return data;
    } catch (error) {
      console.error("Falha no processamento OCR:", error);
      throw new Error("Não foi possível extrair os dados do documento.");
    }
  },

  /**
   * Compara dados extraídos via OCR com dados já existentes
   */
  compareData(ocrData: any, manualData: any) {
    return ocrData.cpf?.replace(/\D/g, "") === manualData.cpf?.replace(/\D/g, "");
  }
};

