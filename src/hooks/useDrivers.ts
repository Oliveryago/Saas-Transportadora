import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Driver } from "../types";
import { fileToCnhPdf, validateCnhFile } from "../utils/cnhDocument";

const CNH_BUCKET = "cnh-documents";
const CNH_SIGNED_TTL_SEC = 60 * 60;
const OPTIONAL_CNH_COLUMNS = ["data_primeira_habilitacao", "numero_espelho", "cnh_uploaded_at", "cnh_file_name"] as const;

function isMissingColumnError(err: { code?: string; message?: string; details?: string } | null | undefined) {
  const msg = `${err?.message || ""} ${err?.details || ""}`;
  return err?.code === "42703" || /column .* does not exist/i.test(msg);
}

function withoutOptionalCnhColumns<T extends Record<string, unknown>>(data: T) {
  const next = { ...data };
  for (const key of OPTIONAL_CNH_COLUMNS) delete next[key];
  return next;
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
      let payload: Record<string, unknown> = { ...driverData, tenant_id: tenant.id };
      let { data, error: err } = await supabase.from("drivers").insert([payload]).select().single();
      if (err && isMissingColumnError(err)) {
        payload = withoutOptionalCnhColumns(payload);
        const retry = await supabase.from("drivers").insert([payload]).select().single();
        data = retry.data;
        err = retry.error;
      }
      if (err) throw err;
      setDrivers(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error("Erro ao adicionar motorista:", err);
      throw err;
    }
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    try {
      let payload: Record<string, unknown> = { ...updates };
      let { data, error: err } = await supabase.from("drivers").update(payload).eq("id", id).select().single();
      if (err && isMissingColumnError(err)) {
        payload = withoutOptionalCnhColumns(payload);
        const retry = await supabase.from("drivers").update(payload).eq("id", id).select().single();
        data = retry.data;
        err = retry.error;
      }
      if (err) throw err;
      setDrivers(prev => prev.map(d => d.id === id ? data : d));
      return data;
    } catch (err: any) {
      console.error("Erro ao atualizar motorista:", err);
      throw err;
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
