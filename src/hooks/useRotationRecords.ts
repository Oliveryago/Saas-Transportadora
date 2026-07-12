import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { RotationRecord } from "../types";
import { resolveDateFilter } from "./useDateFilter";
import type { DateFilter } from "../types";

export function useRotationRecords(vehicleId?: string, dateFilter?: DateFilter | null) {
    const { tenant } = useAuth();
    const [records, setRecords] = useState<RotationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenant) return;
        fetchRecords();
    }, [tenant, vehicleId, dateFilter]);

    async function fetchRecords() {
        try {
            setLoading(true);
            setError(null);
            let query = supabase
                .from("rotation_records")
                .select("*")
                .eq("tenant_id", tenant!.id);

            if (vehicleId) query = query.eq("vehicle_id", vehicleId);

            const { fromISO, toISO } = resolveDateFilter(dateFilter ?? null);
            if (fromISO) query = query.gte("date", fromISO);
            if (toISO) query = query.lte("date", toISO);

            const { data, error: err } = await query.order("created_at", { ascending: false });
            if (err) throw err;
            setRecords(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }

    async function addRecord(record: Omit<RotationRecord, "id" | "created_at" | "updated_at">) {
        const { data, error: err } = await supabase
            .from("rotation_records")
            .insert([{ ...record, tenant_id: tenant!.id }])
            .select();
        if (err) throw err;
        const newItem = data?.[0];
        if (newItem) setRecords([newItem, ...records]);
        return newItem;
    }

    async function updateRecord(id: string, updates: Partial<RotationRecord>) {
        const { data, error: err } = await supabase
            .from("rotation_records")
            .update(updates)
            .eq("id", id)
            .select();
        if (err) throw err;
        const updated = data?.[0];
        if (updated) setRecords(records.map((r) => (r.id === id ? updated : r)));
        return updated;
    }

    async function deleteRecord(id: string) {
        const { error: err } = await supabase.from("rotation_records").delete().eq("id", id);
        if (err) throw err;
        setRecords(records.filter((r) => r.id !== id));
    }

    return { records, loading, error, addRecord, updateRecord, deleteRecord, refetch: fetchRecords };
}
