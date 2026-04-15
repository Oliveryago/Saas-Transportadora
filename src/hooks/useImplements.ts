import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Implement } from "../types";

export function useImplements() {
  const { tenant } = useAuth();
  const [implements_, setImplements] = useState<Implement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const { data, error: err } = await supabase
        .from("implements")
        .insert([{ ...implement, tenant_id: tenant!.id }])
        .select();

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
      const { data, error: err } = await supabase
        .from("implements")
        .update(updates)
        .eq("id", id)
        .select();

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

  return {
    implements: implements_,
    loading,
    error,
    addImplement,
    updateImplement,
    deleteImplement,
  };
}
