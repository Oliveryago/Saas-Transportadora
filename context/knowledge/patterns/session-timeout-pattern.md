# Pattern: Session Timeout Pattern

## Description

Padrão de segurança passiva que desloga automaticamente o usuário após 30 minutos de inatividade da sessão. A inatividade é calculada por ausência de eventos no DOM (movimento de mouse, cliques, scrolls, teclas pressionadas).

## When to Use

Esse hook deve ser instanciado globalmente em `ProtectedRoute.tsx` (que encapsula toda a aplicação que não seja pública) para que a contagem seja unificada entre todas as páginas acessadas.

## Pattern

```tsx
// useSessionTimeout.ts (Hook isolado)
import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  // ... lógica de addEventListener('mousemove', etc)
}

// ProtectedRoute.tsx (Uso do pattern)
import { useSessionTimeout } from "../hooks/useSessionTimeout";

export function ProtectedRoute({ children }) {
  // Inicializa o timer de sessão global para qualquer página protegida
  useSessionTimeout();
  // ... validações de login
}
```

## Files Using This Pattern

- `src/hooks/useSessionTimeout.ts` - Implementação do Timer
- `src/components/ProtectedRoute.tsx` - Instanciação

## Status

- **Created**: 2026-07-15
- **Status**: Active
