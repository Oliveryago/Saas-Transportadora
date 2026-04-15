import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { FuelRecord } from "../types";

export function useFuelRecords() {
  const { tenant, user } = useAuth();
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant || !user) return;
    fetchRecords();
  }, [tenant, user]);

  async function fetchRecords() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("fuel_records")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setRecords(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function addRecord(record: Omit<FuelRecord, "id" | "created_at" | "updated_at">) {
    try {
      const { data, error: err } = await supabase
        .from("fuel_records")
        .insert([
          {
            ...record,
            tenant_id: tenant!.id,
            driver_id: user!.id,
          },
        ])
        .select();

      if (err) throw err;
      const newItem = data?.[0];
      
      if (newItem) {
        setRecords([newItem, ...records]);
        
        // Update vehicle current odometer automatically
        await supabase
          .from("vehicles")
          .update({ current_km: newItem.km_digital })
          .eq("id", newItem.vehicle_id);
      }
      return newItem;
    } catch (err) {
      throw err;
    }
  }

  async function updateRecord(
    id: string,
    updates: Partial<FuelRecord>
  ) {
    try {
      const { data, error: err } = await supabase
        .from("fuel_records")
        .update(updates)
        .eq("id", id)
        .select();

      if (err) throw err;
      const updated = data?.[0];
      if (updated) setRecords(records.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      throw err;
    }
  }

  async function deleteRecord(id: string) {
    try {
      const { error: err } = await supabase
        .from("fuel_records")
        .delete()
        .eq("id", id);

      if (err) throw err;
      setRecords(records.filter((r) => r.id !== id));
    } catch (err) {
      throw err;
    }
  }

  function getLatestKmByVehicle() {
    const kmMap = new Map<string, number>();
    records.forEach(r => {
      const current = kmMap.get(r.vehicle_id) || 0;
      if (r.km_digital > current) {
        kmMap.set(r.vehicle_id, r.km_digital);
      }
    });
    return kmMap;
  }

  return {
    records,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    getLatestKmByVehicle,
  };
}
