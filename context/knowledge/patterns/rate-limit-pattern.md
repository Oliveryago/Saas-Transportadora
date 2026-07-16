# Pattern: Rate Limit Pattern (UI Anti-Spam)

## Description

Padrão para botões de formulário e interações cruciais que bloqueiam cliques duplos (spam clicks) e re-submissões não intencionais no front-end, protegendo a API de requisições de duplicadas e falhas do Supabase por concorrência.

## When to Use

Utilize em qualquer botão `Submit` de formulário (ex: Salvar Combustível, Salvar Manutenção) ou botões de exclusão de registros.

## Pattern

```tsx
import { useRateLimit } from "../../hooks/useRateLimit";

export function MeuForm() {
  const rateLimit = useRateLimit(1500); // 1.5s de delay obrigatório entre execuções

  const handleSubmit = rateLimit.execute(async (e) => {
    e.preventDefault();
    await salvarDados();
  });

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Salvar Rápido</button>
    </form>
  );
}
```

## Files Using This Pattern

- `src/hooks/useRateLimit.ts` - Implementação com `useRef`
- A maioria dos componentes modais, por ex: `FuelModal.tsx`, `DriverFuel.tsx`

## Status

- **Created**: 2026-07-15
- **Status**: Active
