import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Supplier } from "../types";

export function useSuppliers() {
    const { tenant } = useAuth();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenant) return;
        fetchSuppliers();
    }, [tenant]);

    async function fetchSuppliers() {
        try {
            setLoading(true);
            setError(null);
            const { data, error: err } = await supabase
                .from("suppliers")
                .select("*")
                .eq("tenant_id", tenant!.id)
                .order("company_name", { ascending: true });
            if (err) throw err;
            setSuppliers(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }

    async function addSupplier(supplier: Omit<Supplier, "id" | "created_at" | "updated_at">) {
        const { data, error: err } = await supabase
            .from("suppliers")
            .insert([{ ...supplier, tenant_id: tenant!.id }])
            .select();
        if (err) throw err;
        const newItem = data?.[0];
        if (newItem) setSuppliers([newItem, ...suppliers]);
        return newItem;
    }

    async function updateSupplier(id: string, updates: Partial<Supplier>) {
        const { data, error: err } = await supabase
            .from("suppliers")
            .update(updates)
            .eq("id", id)
            .select();
        if (err) throw err;
        const updated = data?.[0];
        if (updated) setSuppliers(suppliers.map((s) => (s.id === id ? updated : s)));
        return updated;
    }

    async function deleteSupplier(id: string) {
        const { error: err } = await supabase.from("suppliers").delete().eq("id", id);
        if (err) throw err;
        setSuppliers(suppliers.filter((s) => s.id !== id));
    }

    function getSuppliersByType(type: string) {
        return suppliers.filter((s) => s.type === type);
    }

    return { suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier, getSuppliersByType, refetch: fetchSuppliers };
}
