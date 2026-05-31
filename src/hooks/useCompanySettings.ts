import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { CompanySettings } from "../types";

interface ViaCEPResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

interface UseCompanySettingsReturn {
  settings: CompanySettings | null;
  loading: boolean;
  saving: boolean;
  uploadingLogo: boolean;
  error: string | null;
  save: (data: Partial<CompanySettings>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  removeLogo: () => Promise<boolean>;
  fetchAddress: (cep: string) => Promise<Partial<CompanySettings> | null>;
  refresh: () => Promise<void>;
}

export function useCompanySettings(): UseCompanySettingsReturn {
  const { tenant } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("company_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setSettings(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = useCallback(
    async (data: Partial<CompanySettings>): Promise<boolean> => {
      if (!tenant?.id) return false;
      setSaving(true);
      setError(null);
      try {
        const payload = {
          ...data,
          tenant_id: tenant.id,
          updated_at: new Date().toISOString(),
        };
        // Remove read-only fields
        delete (payload as any).id;
        delete (payload as any).created_at;

        const { data: upserted, error: saveError } = await supabase
          .from("company_settings")
          .upsert(payload, { onConflict: "tenant_id" })
          .select()
          .single();

        if (saveError) throw saveError;
        setSettings(upserted);
        return true;
      } catch (err: any) {
        setError(err.message || "Erro ao salvar configurações");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [tenant?.id]
  );

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      if (!tenant?.id) return null;
      setUploadingLogo(true);
      setError(null);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `${tenant.id}/logo.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(filePath, file, { upsert: true, contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(filePath);

        // Add cache-busting timestamp so the browser reloads the new image
        const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        // Save URL to settings
        await save({ logo_url: logoUrl });
        return logoUrl;
      } catch (err: any) {
        setError(err.message || "Erro ao fazer upload da logo");
        return null;
      } finally {
        setUploadingLogo(false);
      }
    },
    [tenant?.id, save]
  );

  const removeLogo = useCallback(async (): Promise<boolean> => {
    if (!tenant?.id) return false;
    setError(null);
    try {
      // Try to remove both common extensions
      await supabase.storage
        .from("company-logos")
        .remove([`${tenant.id}/logo.png`, `${tenant.id}/logo.jpg`, `${tenant.id}/logo.jpeg`, `${tenant.id}/logo.webp`]);

      return await save({ logo_url: undefined });
    } catch (err: any) {
      setError(err.message || "Erro ao remover logo");
      return false;
    }
  }, [tenant?.id, save]);

  const fetchAddress = useCallback(
    async (cep: string): Promise<Partial<CompanySettings> | null> => {
      const cleaned = cep.replace(/\D/g, "");
      if (cleaned.length !== 8) return null;
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const json: ViaCEPResponse = await res.json();
        if (json.erro) return null;
        return {
          street: json.logradouro || "",
          neighborhood: json.bairro || "",
          city: json.localidade || "",
          state: json.uf || "",
        };
      } catch {
        return null;
      }
    },
    []
  );

  return {
    settings,
    loading,
    saving,
    uploadingLogo,
    error,
    save,
    uploadLogo,
    removeLogo,
    fetchAddress,
    refresh: fetchSettings,
  };
}
