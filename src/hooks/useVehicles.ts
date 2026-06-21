import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Vehicle } from "../types";
import { logAudit } from "../services/auditLogger";

export function useVehicles() {
  const { user, tenant } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("vehicles")
        .select("id, tenant_id, license_plate, model, year, current_km, tank_capacity, active, created_at, updated_at")
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
      const { data, error: err } = await supabase
        .from("vehicles")
        .insert([{ ...vehicle, tenant_id: tenant!.id }])
        .select();

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
      const { data, error: err } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", id)
        .select();

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

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    refetch: fetchVehicles,
  };
}
