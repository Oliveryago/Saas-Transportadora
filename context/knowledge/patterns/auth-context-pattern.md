# Pattern: Auth Context Pattern

## Description

Padrão de gerenciamento global de estado de autenticação e identificação de perfil (Role) do usuário conectado, bem como do tenant (empresa) ativo. Encapsula as regras de impersonation de superadmin.

## When to Use

Use o `useAuth` sempre que precisar:
- Exibir nome do usuário ou empresa logados
- Condicionar ações no front-end dependendo da permissão (ex: botão visível só para admin)
- Acessar o `tenant.id` ou `user.id` para realizar queries com o Supabase

## Pattern

```tsx
import { useAuth } from "../contexts/AuthContext";

export function MeuComponente() {
  const { user, tenant, isAdmin, isDriver } = useAuth();

  if (isDriver) {
    return <p>Acesso negado para motoristas neste componente.</p>;
  }

  return (
    <div>
      <h1>Bem-vindo, {user?.name}</h1>
      <p>Empresa: {tenant?.name}</p>

      {isAdmin && (
        <button>Ação Restrita de Administrador</button>
      )}
    </div>
  );
}
```

## Example

O hook exporta:
- `user`: Objeto usuário com metadata
- `tenant`: Tenant ativo (se superadmin impersonar, retorna o tenant selecionado)
- `realTenant`: O tenant original da conta
- `isAdmin`: boolean
- `isManager`: boolean
- `isDriver`: boolean
- `isSuperAdmin`: boolean

## Files Using This Pattern

- `src/components/ProtectedRoute.tsx` - Bloqueia rotas
- `src/components/Layout/Sidebar.tsx` - Oculta itens do menu
- Praticamente todos os hooks de banco de dados para filtrar por tenant

## Related

- [Decision: Auth e RBAC](../../decisions/003-auth-roles.md)

## Status

- **Created**: 2026-07-15
- **Status**: Active
