import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Driver } from "../types";
import { fileToCnhPdf, validateCnhFile } from "../utils/cnhDocument";
import { humanizeWriteError, writeWithColumnFallback } from "../lib/supabaseWrite";

const CNH_BUCKET = "cnh-documents";
const CNH_SIGNED_TTL_SEC = 60 * 60;
const DRIVER_WRITE_COLUMNS = [
  "nome_completo",
  "data_nascimento",
  "cpf",
  "numero_cnh",
  "categoria_cnh",
  "validade_cnh",
  "data_primeira_habilitacao",
  "numero_espelho",
  "cnh_uploaded_at",
  "cnh_file_name",
  "endereco",
  "cep",
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
  "phone",
  "photo_url",
  "cnh_url",
  "vehicle_id",
  "implement_id",
  "implement2_id",
  "active",
  "start_date",
  "end_date",
] as const;

function pickDriverPayload(data: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const key of DRIVER_WRITE_COLUMNS) {
    if (key in data) payload[key] = data[key];
  }
  return payload;
}

function extractCnhStoragePath(cnhUrl: string): string | null {
  if (!cnhUrl) return null;
  if (!/^https?:\/\//i.test(cnhUrl)) return cnhUrl;
  const match = cnhUrl.match(/cnh-documents\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Hook para Gestão de Motoristas
 * Fornece métodos para CRUD e estado dos motoristas do tenant.
 * Conectado à tabela 'drivers' (independente de 'users').
 */
export function useDrivers() {
  const { tenant, user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCnh, setUploadingCnh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    if (!tenant || !user) return;
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("drivers")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("nome_completo", { ascending: true });

      if (err) throw err;
      setDrivers(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar motoristas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant, user]);

  const addDriver = async (driverData: Omit<Driver, "id" | "tenant_id" | "created_at" | "updated_at">) => {
    if (!tenant) throw new Error("Tenant não identificado");
    try {
      const payload = { ...pickDriverPayload(driverData as Record<string, unknown>), tenant_id: tenant.id };
      const data = await writeWithColumnFallback<Driver>(
        async (nextPayload) => supabase.from("drivers").insert([nextPayload]).select().single(),
        payload
      );
      setDrivers(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error("Erro ao adicionar motorista:", err);
      throw humanizeWriteError(err, "motorista");
    }
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    try {
      const payload = pickDriverPayload(updates as Record<string, unknown>);
      const data = await writeWithColumnFallback<Driver>(
        async (nextPayload) => supabase.from("drivers").update(nextPayload).eq("id", id).select().single(),
        payload
      );
      setDrivers(prev => prev.map(d => d.id === id ? data : d));
      return data;
    } catch (err: any) {
      console.error("Erro ao atualizar motorista:", err);
      throw humanizeWriteError(err, "motorista");
    }
  };

  const uploadCnhDocument = useCallback(async (file: File): Promise<{ path: string; fileName: string } | null> => {
    if (!tenant) return null;
    const validationError = validateCnhFile(file);
    if (validationError) throw new Error(validationError);

    setUploadingCnh(true);
    try {
      let pdfFile: File;
      try {
        pdfFile = await fileToCnhPdf(file);
      } catch (convertError) {
        console.warn("Falha ao converter CNH para PDF; salvando o arquivo original.", convertError);
        pdfFile = file;
      }
      const original = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "cnh.pdf";
      const path = `${tenant.id}/${crypto.randomUUID()}_${original}`;

      const { error: uploadError } = await supabase.storage
        .from(CNH_BUCKET)
        .upload(path, pdfFile, { contentType: pdfFile.type || "application/pdf", upsert: false });

      if (uploadError) throw uploadError;
      return { path, fileName: pdfFile.name };
    } catch (err: any) {
      console.error("Erro ao fazer upload da CNH:", err);
      throw err;
    } finally {
      setUploadingCnh(false);
    }
  }, [tenant]);

  const getCnhSignedUrl = useCallback(async (cnhUrl: string): Promise<string | null> => {
    if (!cnhUrl) return null;
    if (/^https?:\/\//i.test(cnhUrl) && !cnhUrl.includes("/storage/v1/object/")) return cnhUrl;
    const path = extractCnhStoragePath(cnhUrl);
    if (!path) return cnhUrl;
    const { data, error: signError } = await supabase.storage
      .from(CNH_BUCKET)
      .createSignedUrl(path, CNH_SIGNED_TTL_SEC);
    if (signError) {
      console.error("Erro ao gerar signed URL da CNH:", signError);
      throw signError;
    }
    return data.signedUrl;
  }, []);

  const deleteCnhDocument = useCallback(async (cnhUrl: string): Promise<void> => {
    const path = extractCnhStoragePath(cnhUrl);
    if (!path) return;
    const { error: removeError } = await supabase.storage.from(CNH_BUCKET).remove([path]);
    if (removeError) {
      console.error("Erro ao remover CNH do storage:", removeError);
      throw removeError;
    }
  }, []);

  const uploadDriverPhoto = async (file: File): Promise<string | null> => {
    if (!tenant) return null;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${tenant.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-photos")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("driver-photos")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error("Erro ao fazer upload da foto do motorista:", err);
      throw err;
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return {
    drivers,
    loading,
    error,
    uploadingPhoto,
    refresh: fetchDrivers,
    addDriver,
    updateDriver,
    uploadDriverPhoto,
    uploadingCnh,
    uploadCnhDocument,
    getCnhSignedUrl,
    deleteCnhDocument,
  };
}
