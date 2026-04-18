import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { FuelRecord } from "../types";

export function useFuelRecords() {
  const { tenant, user } = useAuth();
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!tenant || !user) return;
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("fuel_records")
        .select("id, tenant_id, vehicle_id, driver_id, km_digital, km_photo_url, liters, value_brl, fuel_station, fuel_type, price_per_liter, has_discount, discount_value, validations, created_at, updated_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setRecords(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tenant, user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(async (record: Omit<FuelRecord, "id" | "created_at" | "updated_at">) => {
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
        setRecords(prev => [newItem, ...prev]);
        
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
  }, [tenant, user]);

  const updateRecord = useCallback(async (id: string, updates: Partial<FuelRecord>) => {
    try {
      const { data, error: err } = await supabase
        .from("fuel_records")
        .update(updates)
        .eq("id", id)
        .select();

      if (err) throw err;
      const updated = data?.[0];
      if (updated) setRecords(prev => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from("fuel_records")
        .delete()
        .eq("id", id);

      if (err) throw err;
      setRecords(prev => prev.filter((r) => r.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  const getLatestKmByVehicle = useCallback(() => {
    const kmMap = new Map<string, number>();
    records.forEach(r => {
      const current = kmMap.get(r.vehicle_id) || 0;
      if (r.km_digital > current) {
        kmMap.set(r.vehicle_id, r.km_digital);
      }
    });
    return kmMap;
  }, [records]);

  return {
    records,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    getLatestKmByVehicle,
    refetch: fetchRecords,
  };
}
