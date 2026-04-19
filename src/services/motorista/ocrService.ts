/**
 * Serviço de OCR para Processamento de CNH
 * Este serviço é responsável por receber o arquivo da CNH e retornar os dados extraídos.
 * Inicialmente implementado como MOCK para estruturação da UI.
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

export const ocrService = {
  /**
   * Simula o processamento de OCR de uma imagem de CNH
   * @param file Arquivo (Imagem ou PDF) capturado pelo input
   */
  async processCNH(file: File): Promise<OCRResult> {
    console.log("Iniciando processamento OCR mock para:", file.name);

    // Simular delay de processamento de rede/IA
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Retorno mockado simulando uma leitura bem-sucedida
    return {
      nome_completo: "JOÃO DA SILVA MOTORISTA MOCK",
      cpf: "123.456.789-00",
      numero_cnh: "9876543210-0",
      categoria_cnh: "AD",
      validade_cnh: "2030-12-31",
      data_nascimento: "1985-05-20",
      confidence: 0.98,
    };
  },

  /**
   * Compara dados extraídos via OCR com dados já existentes
   */
  compareData(ocrData: any, manualData: any) {
    // Lógica futura de comparação e destaque de divergências
    return ocrData.cpf === manualData.cpf;
  }
};
