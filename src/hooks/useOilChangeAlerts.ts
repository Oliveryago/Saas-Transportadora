import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { OilChangeAlert } from "../types";
import { resolveDateFilter } from "./useDateFilter";
import type { DateFilter } from "../types";

export function useOilChangeAlerts(vehicleId?: string, dateFilter?: DateFilter | null) {
    const { tenant } = useAuth();
    const [alerts, setAlerts] = useState<OilChangeAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenant) return;
        fetchAlerts();
    }, [tenant, vehicleId, dateFilter]);

    async function fetchAlerts() {
        try {
            setLoading(true);
            setError(null);
            let query = supabase
                .from("oil_change_alerts")
                .select("*")
                .eq("tenant_id", tenant!.id);

            if (vehicleId) query = query.eq("vehicle_id", vehicleId);

            const { fromISO, toISO } = resolveDateFilter(dateFilter ?? null);
            if (fromISO) query = query.gte("last_change_date", fromISO);
            if (toISO) query = query.lte("last_change_date", toISO);

            const { data, error: err } = await query.order("created_at", { ascending: false });
            if (err) throw err;
            setAlerts(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }

    async function addAlert(alert: Omit<OilChangeAlert, "id" | "created_at" | "updated_at">) {
        if (alert.vehicle_id && alert.oil_type) {
            const { error: updateErr } = await supabase
                .from("oil_change_alerts")
                .update({ alert_status: "inactive" })
                .eq("tenant_id", tenant!.id)
                .eq("vehicle_id", alert.vehicle_id)
                .eq("oil_type", alert.oil_type)
                .eq("alert_status", "active");

            if (updateErr) {
                console.error("Erro ao desativar alertas antigos:", updateErr);
            }
        }

        const { data, error: err } = await supabase
            .from("oil_change_alerts")
            .insert([{ ...alert, tenant_id: tenant!.id }])
            .select();
        if (err) throw err;
        const newItem = data?.[0];
        
        if (newItem) {
            setAlerts((prevAlerts) => {
                const updatedAlerts = prevAlerts.map(a => 
                    (a.vehicle_id === alert.vehicle_id && a.oil_type === alert.oil_type && a.alert_status === "active")
                        ? { ...a, alert_status: "inactive" as const }
                        : a
                );
                return [newItem, ...updatedAlerts];
            });
        }
        return newItem;
    }

    async function updateAlert(id: string, updates: Partial<OilChangeAlert>) {
        const { data, error: err } = await supabase
            .from("oil_change_alerts")
            .update(updates)
            .eq("id", id)
            .select();
        if (err) throw err;
        const updated = data?.[0];
        if (updated) setAlerts(alerts.map((a) => (a.id === id ? updated : a)));
        return updated;
    }

    async function deleteAlert(id: string) {
        const { error: err } = await supabase.from("oil_change_alerts").delete().eq("id", id);
        if (err) throw err;
        setAlerts(alerts.filter((a) => a.id !== id));
    }

    function getPendingAlerts(vehicles: { id: string; current_km: number }[], kmMap?: Map<string, number>) {
        return alerts.filter((alert) => {
            if (alert.alert_status !== "active") return false;
            
            const vehicle = vehicles.find((v) => v.id === alert.vehicle_id);
            if (!vehicle) return false;

            // Use the provided KM (from fuel records) if available, otherwise fallback to vehicle.current_km
            const currentKm = kmMap?.get(alert.vehicle_id) ?? vehicle.current_km;

            if (alert.alert_type === "km" || alert.alert_type === "both") {
                if (alert.last_change_km !== undefined && alert.km_interval !== undefined) {
                    const nextChangeKm = Number(alert.last_change_km) + Number(alert.km_interval);
                    // Alert when current KM is within 1000km of the next change or already passed it
                    if (currentKm >= nextChangeKm - 1000) return true;
                }
            }

            if (alert.alert_type === "date" || alert.alert_type === "both") {
                if (alert.last_change_date && alert.days_interval) {
                    const lastDate = new Date(alert.last_change_date);
                    const nextDate = new Date(lastDate.getTime() + alert.days_interval * 86400000);
                    const today = new Date();
                    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / 86400000);
                    if (daysUntil <= 7) return true;
                }
            }

            return false;
        });
    }

    return { alerts, loading, error, addAlert, updateAlert, deleteAlert, getPendingAlerts, refetch: fetchAlerts };
}
