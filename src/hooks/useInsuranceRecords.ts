import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { InsuranceRecord } from "../types";

export function useInsuranceRecords() {
    const { tenant } = useAuth();
    const [records, setRecords] = useState<InsuranceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenant) return;
        fetchRecords();
    }, [tenant]);

    async function fetchRecords() {
        try {
            setLoading(true);
            setError(null);
            const { data, error: err } = await supabase
                .from("insurance_records")
                .select("*")
                .eq("tenant_id", tenant!.id)
                .order("created_at", { ascending: false });
            if (err) throw err;
            setRecords(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }

    async function addRecord(record: Omit<InsuranceRecord, "id" | "created_at" | "updated_at">) {
        const { data, error: err } = await supabase
            .from("insurance_records")
            .insert([{ ...record, tenant_id: tenant!.id }])
            .select();
        if (err) throw err;
        const newItem = data?.[0];
        if (newItem) setRecords([newItem, ...records]);
        return newItem;
    }

    async function updateRecord(id: string, updates: Partial<InsuranceRecord>) {
        const { data, error: err } = await supabase
            .from("insurance_records")
            .update(updates)
            .eq("id", id)
            .select();
        if (err) throw err;
        const updated = data?.[0];
        if (updated) setRecords(records.map((r) => (r.id === id ? updated : r)));
        return updated;
    }

    async function deleteRecord(id: string) {
        const { error: err } = await supabase.from("insurance_records").delete().eq("id", id);
        if (err) throw err;
        setRecords(records.filter((r) => r.id !== id));
    }

    return { records, loading, error, addRecord, updateRecord, deleteRecord, refetch: fetchRecords };
}
