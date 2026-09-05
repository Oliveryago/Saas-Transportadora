import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  confirmarImportacaoNfe,
  preVisualizarNfe,
  preVisualizarNfeArquivo,
} from "../services/nfe/nfeImportacao";
import type { NfeConfirmResult, NfePreview } from "../types/nfe";

export function useNfeImportacao() {
  const { tenant } = useAuth();
  const [preview, setPreview] = useState<NfePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preVisualizarXml = useCallback(async (xml: string) => {
    if (!tenant?.id) throw new Error("Tenant não identificado.");
    setLoading(true);
    setError(null);
    try {
      const result = await preVisualizarNfe(xml, tenant.id);
      setPreview(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao ler a NF-e.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  const preVisualizarArquivo = useCallback(async (arquivo: File) => {
    if (!tenant?.id) throw new Error("Tenant não identificado.");
    setLoading(true);
    setError(null);
    try {
      const result = await preVisualizarNfeArquivo(arquivo, tenant.id);
      setPreview(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao ler a NF-e.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  const confirmar = useCallback(async (dados: NfePreview): Promise<NfeConfirmResult> => {
    if (!tenant?.id) throw new Error("Tenant não identificado.");
    setLoading(true);
    setError(null);
    try {
      const result = await confirmarImportacaoNfe(tenant.id, dados);
      setPreview(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao confirmar a importação.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  return {
    preview,
    setPreview,
    loading,
    error,
    preVisualizarXml,
    preVisualizarArquivo,
    confirmar,
    limparErro: () => setError(null),
  };
}
