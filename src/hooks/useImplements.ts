import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Implement } from "../types";
import { uploadPrivateDocument, getPrivateDocumentSignedUrl, deletePrivateDocument } from "../services/storage/privateDocuments";

const VEHICLE_DOC_BUCKET = "vehicle-documents";
const OPTIONAL_CRLV_COLUMNS = [
  "year", "year_manufacture", "chassi", "renavam", "color", "crlv_fuel", "load_capacity",
  "crlv_category", "crlv_url", "crlv_uploaded_at", "crlv_file_name",
] as const;

function isMissingColumnError(err: { code?: string; message?: string; details?: string } | null | undefined) {
  const msg = `${err?.message || ""} ${err?.details || ""}`;
  return err?.code === "42703" || /column .* does not exist/i.test(msg);
}

function withoutOptionalCrlvColumns<T extends Record<string, unknown>>(data: T) {
  const next = { ...data };
  for (const key of OPTIONAL_CRLV_COLUMNS) delete next[key];
  return next;
}

export function useImplements() {
  const { tenant } = useAuth();
  const [implements_, setImplements] = useState<Implement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetchImplements();
  }, [tenant]);

  async function fetchImplements() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("implements")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setImplements(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function addImplement(implement: Omit<Implement, "id" | "created_at" | "updated_at">) {
    try {
      let payload: Record<string, unknown> = { ...implement, tenant_id: tenant!.id };
      let { data, error: err } = await supabase.from("implements").insert([payload]).select();
      if (err && isMissingColumnError(err)) {
        payload = withoutOptionalCrlvColumns(payload);
        const retry = await supabase.from("implements").insert([payload]).select();
        data = retry.data;
        err = retry.error;
      }
      if (err) throw err;
      const newItem = data?.[0];
      if (newItem) setImplements([newItem, ...implements_]);
      return newItem;
    } catch (err) {
      throw err;
    }
  }

  async function updateImplement(
    id: string,
    updates: Partial<Implement>
  ) {
    try {
      let payload: Record<string, unknown> = { ...updates };
      let { data, error: err } = await supabase.from("implements").update(payload).eq("id", id).select();
      if (err && isMissingColumnError(err)) {
        payload = withoutOptionalCrlvColumns(payload);
        const retry = await supabase.from("implements").update(payload).eq("id", id).select();
        data = retry.data;
        err = retry.error;
      }
      if (err) throw err;
      const updated = data?.[0];
      if (updated) setImplements(implements_.map((i) => (i.id === id ? updated : i)));
      return updated;
    } catch (err) {
      throw err;
    }
  }

  async function deleteImplement(id: string) {
    try {
      const { error: err } = await supabase
        .from("implements")
        .delete()
        .eq("id", id);

      if (err) throw err;
      setImplements(implements_.filter((i) => i.id !== id));
    } catch (err) {
      throw err;
    }
  }

  async function uploadImplementDocument(file: File) {
    if (!tenant) return null;
    setUploadingDoc(true);
    try {
      return await uploadPrivateDocument(VEHICLE_DOC_BUCKET, tenant.id, file);
    } finally {
      setUploadingDoc(false);
    }
  }

  const getImplementDocSignedUrl = useCallback(async (stored: string) => {
    return getPrivateDocumentSignedUrl(VEHICLE_DOC_BUCKET, stored);
  }, []);

  const deleteImplementDocument = useCallback(async (stored: string) => {
    await deletePrivateDocument(VEHICLE_DOC_BUCKET, stored);
  }, []);

  return {
    implements: implements_,
    loading,
    error,
    addImplement,
    updateImplement,
    deleteImplement,
    uploadingDoc,
    uploadImplementDocument,
    getImplementDocSignedUrl,
    deleteImplementDocument,
  };
}
