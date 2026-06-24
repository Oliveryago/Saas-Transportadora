# Pattern: Supabase CRUD Hook

## Description

Padrão de hook React para operações CRUD no Supabase, com isolamento por `tenant_id`, loading/error states, e atualização otimista do estado local.

## When to Use

Sempre que criar um novo módulo que precisa de operações de leitura/escrita no Supabase. Todos os hooks de dados do projeto seguem este padrão.

## Pattern

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { EntityType } from "../types";

export function useEntityRecords() {
  const { tenant, user } = useAuth();
  const [records, setRecords] = useState<EntityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!tenant || !user) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("table_name")
        .select("*")
        .eq("tenant_id", tenant.id)   // OBRIGATÓRIO — isolamento multi-tenant
        .order("created_at", { ascending: false });
      if (err) throw err;
      setRecords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [tenant, user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = useCallback(async (record: Omit<EntityType, "id" | "created_at" | "updated_at">) => {
    const { data, error: err } = await supabase
      .from("table_name")
      .insert([{ ...record, tenant_id: tenant!.id }])
      .select();
    if (err) throw err;
    const newItem = data?.[0];
    if (newItem) setRecords(prev => [newItem, ...prev]);
    return newItem;
  }, [tenant]);

  return { records, loading, error, addRecord, refetch: fetchRecords };
}
```

## Example

Ver implementação real: `src/hooks/useFuelRecords.ts`, `src/hooks/useVehicles.ts`

## Files Using This Pattern

- `src/hooks/useFuelRecords.ts` — Abastecimentos
- `src/hooks/useVehicles.ts` — Veículos
- `src/hooks/useDrivers.ts` — Motoristas
- `src/hooks/useMaintenanceRecords.ts` — Manutenções
- `src/hooks/useParkingRecords.ts` — Estacionamento
- `src/hooks/useTollRecords.ts` — Pedágios
- `src/hooks/useWashingRecords.ts` — Lavagens
- (todos os hooks de dados do projeto)

## Critical Rules

1. **SEMPRE** filtre por `tenant_id` — nunca liste dados sem filtro de tenant
2. Use `useCallback` com dependências corretas para evitar re-renders desnecessários
3. Separe loading state de error state
4. Faça atualização otimista do estado local (não refetch completo após insert)

## Related

- [Decision: Tech Stack](../../decisions/001-tech-stack.md)
- [Decision: Multi-Tenant RBAC](../../decisions/002-multitenant-rbac.md)

## Status

- **Created**: 2026-06-23
- **Status**: Active
