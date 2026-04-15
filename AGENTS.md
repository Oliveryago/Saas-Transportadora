# AGENTS.md — Contexto para Agentes de IA

Este arquivo fornece contexto essencial para agentes de IA que trabalham neste projeto.

## Visão Geral do Projeto

**SaaS de Gestão para Transportadoras** — React + TypeScript + Vite + Supabase  
Multi-tenant: cada empresa tem dados isolados. SuperAdmin tem acesso global.

## Arquivos de Contexto

```
context/
├── intent/
│   ├── project-intent.md        # Objetivo geral, stack, módulos
│   └── feature-superadmin.md    # Feature SuperAdmin + model multi-tenant
├── decisions/
│   ├── 001-multitenant-rbac.md  # Decisão: Multi-Tenant + RBAC + RLS
│   └── 002-auth-rbac-update.md  # Decisão: Auth atualizada com múltiplos roles
└── changelog.md                  # Histórico de mudanças de contexto
```

## Regras Críticas

1. **Sempre filtre por `tenant_id`** em queries — nunca busque dados sem filtro de tenant
2. **Nunca mostre dados de outros tenants** a usuários comuns (RLS garante isso no banco, mas respeite também no frontend)
3. **SuperAdmin ignora isolamento** — pode acessar qualquer tenant; use com cuidado
4. **Verifique o role antes de renderizar** funcionalidades restritas

## Perfis de Usuário

| Role | Constante | Acesso |
|---|---|---|
| SuperAdmin | `"superadmin"` | Total — todas as empresas |
| Admin da Empresa | `"admin"` | Gerencia usuários + dados do próprio tenant |
| Gestor | `"manager"` | Visualiza e gerencia operações do próprio tenant |
| Motorista | `"driver"` | Apenas lançamento de dados operacionais |

## Feature-Specific Context

### SuperAdmin (`/superadmin`)

- **Arquivo:** `src/pages/SuperAdmin.tsx`
- **Contexto:** `src/contexts/AuthContext.tsx` — `isSuperAdmin`, `user.role`
- **Tipos:** `src/types/index.ts` — `UserRole`, `Tenant`, `User`
- **Estado atual:** Tela básica existe; faltam RLS real, fluxo do motorista e edição pelo SuperAdmin
- **Decisões relacionadas:**
  - [001-multitenant-rbac.md](context/decisions/001-multitenant-rbac.md)
  - [002-auth-rbac-update.md](context/decisions/002-auth-rbac-update.md)
- **Próximos passos:**
  1. Revisar/criar RLS policies no Supabase para todas as tabelas
  2. Criar função `SECURITY DEFINER` para SuperAdmin bypass
  3. Expandir `AuthContext` com helpers (`isAdmin`, `isDriver`, `isManager`, `userRole`)
  4. Atualizar `ProtectedRoute` para aceitar `allowedRoles`
  5. Atualizar `Sidebar` para renderizar itens por role
  6. Implementar interface simplificada de lançamento para motorista
  7. Conectar upload de foto de nota fiscal no `FuelModal`

### Fuel (`/fuel`)

- **Arquivo:** `src/pages/Fuel.tsx`, `src/components/fuel/FuelModal.tsx`
- **Hook:** `src/hooks/useFuelRecords.ts`
- **Atenção:** `FuelRecord.invoice_photo_url` já existe no tipo — precisa de UI para upload no fluxo do motorista
