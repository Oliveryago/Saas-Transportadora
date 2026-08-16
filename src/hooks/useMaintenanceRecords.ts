import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { MaintenanceRecord } from "../types";
import { resolveDateFilter } from "./useDateFilter";
import type { DateFilter } from "../types";

export function useMaintenanceRecords(vehicleId?: string, dateFilter?: DateFilter | null) {
    const { tenant } = useAuth();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
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
                .from("maintenance_records")
                .select("*")
                .eq("tenant_id", tenant!.id);

            if (vehicleId) query = query.eq("vehicle_id", vehicleId);

            const { fromISO, toISO } = resolveDateFilter(dateFilter ?? null);
            if (fromISO) query = query.gte("date", fromISO);
            if (toISO) query = query.lte("date", toISO);

            const { data, error: err } = await query;
            if (err) throw err;

            // Garantir ordenação no frontend usando parseLocalDate para evitar bugs de fuso horário
            const sorted = (data || []).sort((a, b) => {
                const dateA = parseLocalDate(a.date)?.getTime() || 0;
                const dateB = parseLocalDate(b.date)?.getTime() || 0;
                // Em caso de empate na data, desempata pela data de criação (mais recente primeiro)
                if (dateB === dateA) {
                    const createdA = new Date(a.created_at || 0).getTime();
                    const createdB = new Date(b.created_at || 0).getTime();
                    return createdB - createdA;
                }
                return dateB - dateA;
            });
            setRecords(sorted);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }

    async function addRecord(record: Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">) {
        const { data, error: err } = await supabase
            .from("maintenance_records")
            .insert([{ ...record, tenant_id: tenant!.id }])
            .select();
        if (err) throw err;
        const newItem = data?.[0];
        if (newItem) setRecords([newItem, ...records]);
        return newItem;
    }

    async function updateRecord(id: string, updates: Partial<MaintenanceRecord>) {
        const { data, error: err } = await supabase
            .from("maintenance_records")
            .update(updates)
            .eq("id", id)
            .select();
        if (err) throw err;
        const updated = data?.[0];
        if (updated) setRecords(records.map((r) => (r.id === id ? updated : r)));
        return updated;
    }

    async function deleteRecord(id: string) {
        const { error: err } = await supabase.from("maintenance_records").delete().eq("id", id);
        if (err) throw err;
        setRecords(records.filter((r) => r.id !== id));
    }

    return { records, loading, error, addRecord, updateRecord, deleteRecord, refetch: fetchRecords };
}
