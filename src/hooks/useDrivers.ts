import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { User } from "../types";

export function useDrivers() {
    const { tenant } = useAuth();
    const [drivers, setDrivers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenant) return;
        fetchDrivers();
    }, [tenant]);

    async function fetchDrivers() {
        try {
            setLoading(true);
            const { data } = await supabase
                .from("users")
                .select("*")
                .eq("tenant_id", tenant!.id)
                .order("name");
            setDrivers(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    return { drivers, loading, refetch: fetchDrivers };
}
