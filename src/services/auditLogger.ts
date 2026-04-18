import { supabase } from "../lib/supabase";

export type AuditAction = 
  | "LOGIN" 
  | "LOGOUT" 
  | "CREATE_VEHICLE" 
  | "DELETE_VEHICLE" 
  | "UPDATE_VEHICLE" 
  | "CREATE_MAINTENANCE" 
  | "DELETE_MAINTENANCE"
  | "CREATE_FUEL"
  | "DELETE_FUEL"
  | "GENERATE_REPORT";

interface AuditQuery {
  action: AuditAction;
  details?: Record<string, any>;
  tenantId?: string;
  userId?: string;
}

/**
 * AuditLogger Service
 * Envia eventos de segurança e alterações de dados para o log central do supabase.
 * Caso a tabela audit_logs não exista no banco (deploy pendente), loga no console apenas localmente.
 */
export async function logAudit(query: AuditQuery) {
  if (import.meta.env.DEV) {
    console.info(`[AUDIT LOG] ${query.action}:`, query);
  }

  try {
    // Attempt to write to Supabase. This requires an audit_logs table with RLS enabled.
    const { error } = await supabase.from("audit_logs").insert([
      {
        action: query.action,
        details: query.details || {},
        tenant_id: query.tenantId,
        user_id: query.userId,
      }
    ]);

    if (error && error.code !== "42P01") { 
      // Ignora erro de tabela não existente (42P01) para não quebrar fluxo em produção sem migrate
      console.warn("Failed to insert audit log:", error.message);
    }
  } catch (err) {
    console.warn("Audit Log error ignored");
  }
}
