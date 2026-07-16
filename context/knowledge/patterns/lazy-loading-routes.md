# Pattern: Lazy Loading Routes

## Description

Padrão arquitetural de front-end para separar a aplicação em chunks (pedaços de código) que são baixados sob demanda, utilizando a API nativa do React de Lazy e Suspense com React Router.

## When to Use

Qualquer nova página raiz de um módulo que for adicionada ao `App.tsx` DEVE ser declarada através desse padrão, para evitar inchar o pacote inicial da aplicação.

## Pattern

```tsx
// App.tsx
import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageSkeleton } from "./components/shared/SkeletonLoader";

// 1. Declare o import dinâmico passando .then para pegar a exportação nomeada ou padrão
const MinhaNovaPagina = lazy(() => import("./pages/MinhaNovaPagina").then(m => ({ default: m.MinhaNovaPagina })));

// 2. Componente wrapper (já existente no App)
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  );
}

// 3. Aplique na rota
<Route path="/minha-pagina" element={<ProtectedRoute><LazyPage><MinhaNovaPagina /></LazyPage></ProtectedRoute>} />
```

## Files Using This Pattern

- `src/App.tsx` - Roteador global

## Related

- [Decision: Routing Lazy Loading](../../decisions/013-routing-lazy-loading.md)

## Status

- **Created**: 2026-07-15
- **Status**: Active
