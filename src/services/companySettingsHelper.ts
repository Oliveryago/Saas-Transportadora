import { supabase } from "../lib/supabase";
import type { CompanySettings } from "../types";

/**
 * Fetches company settings for a given tenant_id.
 * Used by report generators to get logo + company data for PDF headers.
 */
export async function getCompanySettingsForTenant(
  tenantId: string
): Promise<CompanySettings | null> {
  if (!tenantId) return null;
  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Fetches a remote image URL and converts it to a base64 data URL.
 * Needed so jsPDF can embed images directly.
 */
export async function urlToDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Builds a readable address string from CompanySettings.
 */
export function buildAddressLine(s: CompanySettings): string {
  const parts: string[] = [];
  if (s.street) {
    parts.push(s.street + (s.number ? `, ${s.number}` : ""));
  }
  if (s.neighborhood) parts.push(s.neighborhood);
  if (s.city) {
    parts.push(s.city + (s.state ? `/${s.state}` : ""));
  }
  if (s.cep) {
    parts.push(`CEP ${s.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`);
  }
  return parts.join(" — ");
}

/**
 * Formats a raw CNPJ string (14 digits) as XX.XXX.XXX/XXXX-XX.
 */
export function formatCNPJ(cnpj?: string): string {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Formats a raw phone number string as (XX) XXXXX-XXXX.
 */
export function formatPhone(phone?: string): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}
