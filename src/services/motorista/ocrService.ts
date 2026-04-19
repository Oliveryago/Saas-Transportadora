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
  rawText?: string; // Campo novo para debug do texto bruto
}

/**
 * Tenta extrair dados usando padrões (Regex)
 */
const extractDataHeuristically = (text: string): OCRResult => {
  console.log("Iniciando extração heurística no texto bruto...");

  // Regex para CPF
  const cpfMatch = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/) || text.match(/\d{11}/);
  
  // Regex para Datas (DD/MM/AAAA) - Pega a primeira como nascimento e subsequente como validade
  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  
  // Regex para Número da CNH (Geralmente 11 dígitos sequenciais)
  const cnhMatch = text.match(/\d{11}/);

  // Tentativa de achar nome (Geralmente em caixa alta, antes do CPF ou no topo)
  // Nota: Em arquivos binários/fotos, isso raramente funcionará sem OCR real.
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const potentialName = lines.find(l => /^[A-Z\s]{10,}$/.test(l)) || "";

  return {
    nome_completo: potentialName,
    cpf: cpfMatch ? cpfMatch[0] : "",
    numero_cnh: cnhMatch ? cnhMatch[0] : "",
    categoria_cnh: "", // Difícil pegar sem OCR/Contexto
    validade_cnh: dates.length > 1 ? dates[1].split('/').reverse().join('-') : "",
    data_nascimento: dates.length > 0 ? dates[0].split('/').reverse().join('-') : "",
    confidence: (cpfMatch || dates.length > 0) ? 0.3 : 0,
    rawText: text.substring(0, 1000) // Retorna os primeiros 1000 caracteres para análise
  };
};

/**
 * Lê o conteúdo do arquivo
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject("Erro ao ler arquivo");
    
    // Se for PDF, tentamos ler como texto. Se for imagem, virá binário.
    reader.readAsText(file);
  });
};

export const ocrService = {
  /**
   * Processamento principal da CNH (CONTEÚDO REAL)
   */
  async processCNH(file: File): Promise<OCRResult> {
    console.log("Processando arquivo real:", file.name, "Tipo:", file.type);

    try {
      // 1. Lê o conteúdo bruto do arquivo
      const rawContent = await readFileAsText(file);

      // 2. Se for imagem, avisamos que o texto é binário/ilegível
      if (file.type.startsWith('image/')) {
        console.warn("Arquivo de imagem detectado. O texto bruto será binário e ilegível sem Tesseract.js.");
        return {
          nome_completo: "",
          cpf: "",
          numero_cnh: "",
          categoria_cnh: "",
          validade_cnh: "",
          data_nascimento: "",
          confidence: 0,
          rawText: "[CONTEÚDO BINÁRIO DEMAIS PARA EXTRAÇÃO MANUAL - IMAGEM DETECTADA]"
        };
      }

      // 3. Tenta extrair dados via heurística (útil para PDFs digitais com camada de texto)
      const extracted = extractDataHeuristically(rawContent);
      
      console.log("Resultado da Extração Heurística:", extracted);
      return extracted;
    } catch (error) {
      console.error("Erro no processamento do arquivo:", error);
      throw new Error("Falha ao ler o conteúdo do arquivo.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};

