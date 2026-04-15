import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Vehicle } from "../types";

export function useVehicles() {
  const { tenant } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    fetchVehicles();
  }, [tenant]);

  async function fetchVehicles() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("vehicles")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setVehicles(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function addVehicle(vehicle: Omit<Vehicle, "id" | "created_at" | "updated_at">) {
    try {
      const { data, error: err } = await supabase
        .from("vehicles")
        .insert([{ ...vehicle, tenant_id: tenant!.id }])
        .select();

      if (err) throw err;

      const newVehicle = data?.[0];
      if (!newVehicle) throw new Error("Erro ao criar o veículo");

      setVehicles([newVehicle, ...vehicles]);
      return newVehicle;
    } catch (err) {
      throw err;
    }
  }

  async function updateVehicle(
    id: string,
    updates: Partial<Vehicle>
  ) {
    try {
      const { data, error: err } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", id)
        .select();

      if (err) throw err;

      const updatedData = data?.[0];
      if (!updatedData) throw new Error("Veículo não encontrado após atualização");

      setVehicles(vehicles.map((v) => (v.id === id ? updatedData : v)));
      return updatedData;
    } catch (err) {
      throw err;
    }
  }

  async function deleteVehicle(id: string) {
    try {
      const { error: err } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

      if (err) throw err;
      setVehicles(vehicles.filter((v) => v.id !== id));
    } catch (err) {
      throw err;
    }
  }

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
