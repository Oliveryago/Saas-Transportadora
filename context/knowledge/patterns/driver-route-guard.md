# Pattern: Driver Route Guard

## Description

Guard de rota dedicado para o role `"driver"`, que renderiza as páginas do motorista sem o `MainLayout` (sem Sidebar/BottomNav). Diferente do `ProtectedRoute` genérico, o `DriverRoute` garante layout limpo mobile-first.

## When to Use

Toda rota sob `/driver/*` deve usar `DriverRoute` em vez de `ProtectedRoute`.

## Pattern

```tsx
// src/components/DriverRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function DriverRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "driver") return <Navigate to="/" />;

  // SEM MainLayout — layout mobile-first puro
  return <>{children}</>;
}
```

```tsx
// App.tsx — Como usar
<Route path="/driver" element={
  <DriverRoute>
    <LazyPage><DriverHome /></LazyPage>
  </DriverRoute>
} />
```

## Example

Implementação em: `src/components/DriverRoute.tsx`

Rotas que usam este padrão:
- `/driver` → `DriverHome`
- `/driver/fuel` → `DriverFuel`  
- `/driver/history` → `DriverHistory`

## Redirect no Login

Após signIn, verificar o role e redirecionar:

```typescript
// Login.tsx
const { data: userData } = await supabase
  .from("users")
  .select("role")
  .eq("id", session.user.id)
  .maybeSingle();

if (userData?.role === "driver") {
  navigate("/driver");
} else {
  navigate("/");
}
```

## Files Using This Pattern

- `src/components/DriverRoute.tsx` — Guard principal
- `src/App.tsx` — Rotas /driver/*
- `src/pages/Login.tsx` — Redirect pós-login

## Related

- [Feature: Interface do Motorista](../../intent/feature-motorista-interface.md)
- [Decision: Driver Interface](../../decisions/008-driver-interface.md)

## Status

- **Created**: 2026-06-23
- **Status**: Active
