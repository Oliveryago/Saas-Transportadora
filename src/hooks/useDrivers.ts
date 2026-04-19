import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Driver } from "../types";

/**
 * Hook para Gestão de Motoristas
 * Fornece métodos para CRUD e estado dos motoristas do tenant.
 * Conectado à tabela 'drivers' (independente de 'users').
 */
export function useDrivers() {
  const { tenant, user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error: err } = await supabase
        .from("drivers")
        .insert([{ ...driverData, tenant_id: tenant.id }])
        .select()
        .single();

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
      const { data, error: err } = await supabase
        .from("drivers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (err) throw err;
      setDrivers(prev => prev.map(d => d.id === id ? data : d));
      return data;
    } catch (err: any) {
      console.error("Erro ao atualizar motorista:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return {
    drivers,
    loading,
    error,
    refresh: fetchDrivers,
    addDriver,
    updateDriver
  };
}
