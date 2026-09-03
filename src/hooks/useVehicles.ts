import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Vehicle } from "../types";
import { logAudit } from "../services/auditLogger";
import { uploadPrivateDocument, getPrivateDocumentSignedUrl, deletePrivateDocument } from "../services/storage/privateDocuments";

const VEHICLE_DOC_BUCKET = "vehicle-documents";
const OPTIONAL_CRLV_COLUMNS = [
  "year_manufacture", "chassi", "renavam", "color", "crlv_fuel", "load_capacity",
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

export function useVehicles() {
  const { user, tenant } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchVehicles = useCallback(async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("vehicles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setVehicles(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const addVehicle = useCallback(async (vehicle: Omit<Vehicle, "id" | "created_at" | "updated_at">) => {
    try {
      let payload: Record<string, unknown> = { ...vehicle, tenant_id: tenant!.id };
      let { data, error: err } = await supabase.from("vehicles").insert([payload]).select();
      if (err && isMissingColumnError(err)) {
        payload = withoutOptionalCrlvColumns(payload);
        const retry = await supabase.from("vehicles").insert([payload]).select();
        data = retry.data;
        err = retry.error;
      }
      if (err) throw err;

      const newVehicle = data?.[0];
      if (!newVehicle) throw new Error("Erro ao criar o veículo");

      logAudit({ action: "CREATE_VEHICLE", userId: user?.id, tenantId: tenant?.id, details: { plate: newVehicle.license_plate } });

      setVehicles(prev => [newVehicle, ...prev]);
      return newVehicle;
    } catch (err) {
      throw err;
    }
  }, [tenant]);

  const updateVehicle = useCallback(async (id: string, updates: Partial<Vehicle>) => {
    try {
      let payload: Record<string, unknown> = { ...updates };
      let { data, error: err } = await supabase.from("vehicles").update(payload).eq("id", id).select();
      if (err && isMissingColumnError(err)) {
        payload = withoutOptionalCrlvColumns(payload);
        const retry = await supabase.from("vehicles").update(payload).eq("id", id).select();
        data = retry.data;
        err = retry.error;
      }
      if (err) throw err;

      const updatedVehicle = data?.[0];
      if (!updatedVehicle) throw new Error("Veículo não atualizado");

      logAudit({ action: "UPDATE_VEHICLE", userId: user?.id, tenantId: tenant?.id, details: { id, updates } });

      setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
      return updatedVehicle;
    } catch (err) {
      throw err;
    }
  }, [tenant]);

  const deleteVehicle = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

      if (err) throw err;

      logAudit({ action: "DELETE_VEHICLE", userId: user?.id, tenantId: tenant?.id, details: { id } });

      setVehicles(prev => prev.filter(v => v.id !== id));
      return true;
    } catch (err) {
      throw err;
    }
  }, [tenant]);

  const uploadVehicleDocument = useCallback(async (file: File) => {
    if (!tenant) return null;
    setUploadingDoc(true);
    try {
      return await uploadPrivateDocument(VEHICLE_DOC_BUCKET, tenant.id, file);
    } finally {
      setUploadingDoc(false);
    }
  }, [tenant]);

  const getVehicleDocSignedUrl = useCallback(async (stored: string) => {
    return getPrivateDocumentSignedUrl(VEHICLE_DOC_BUCKET, stored);
  }, []);

  const deleteVehicleDocument = useCallback(async (stored: string) => {
    await deletePrivateDocument(VEHICLE_DOC_BUCKET, stored);
  }, []);

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    refetch: fetchVehicles,
    uploadingDoc,
    uploadVehicleDocument,
    getVehicleDocSignedUrl,
    deleteVehicleDocument,
  };
}
