import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { TireChange } from "../types";

export function useTireChanges(vehicleId?: string) {
    const { tenant } = useAuth();
    const [records, setRecords] = useState<TireChange[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenant) return;
        fetchRecords();
    }, [tenant, vehicleId]);

    async function fetchRecords() {
        try {
            setLoading(true);
            setError(null);
            let query = supabase
                .from("tire_changes")
                .select("*")
                .eq("tenant_id", tenant!.id);

            if (vehicleId) {
                query = query.eq("vehicle_id", vehicleId);
            }

            const { data, error: err } = await query.order("created_at", { ascending: false });
            if (err) throw err;
            setRecords(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }

    async function addRecord(record: Omit<TireChange, "id" | "created_at" | "updated_at">) {
        const { data, error: err } = await supabase
            .from("tire_changes")
            .insert([{ ...record, tenant_id: tenant!.id }])
            .select();
        if (err) throw err;
        const newItem = data?.[0];
        if (newItem) setRecords([newItem, ...records]);
        return newItem;
    }

    async function updateRecord(id: string, updates: Partial<TireChange>) {
        const { data, error: err } = await supabase
            .from("tire_changes")
            .update(updates)
            .eq("id", id)
            .select();
        if (err) throw err;
        const updated = data?.[0];
        if (updated) setRecords(records.map((r) => (r.id === id ? updated : r)));
        return updated;
    }

    async function deleteRecord(id: string) {
        const { error: err } = await supabase.from("tire_changes").delete().eq("id", id);
        if (err) throw err;
        setRecords(records.filter((r) => r.id !== id));
    }

    return { records, loading, error, addRecord, updateRecord, deleteRecord, refetch: fetchRecords };
}
