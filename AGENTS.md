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
- **Decisões relacionadas:**
  - [006-fuel-updates.md](context/decisions/006-fuel-updates.md) - Arla Integration & Backdated Logging

### Global Scale Evolution (Planejado)

- **Feature Context:** `context/intent/feature-global-scale-evolution.md`
- **ADR:** `context/decisions/005-global-scale-evolution.md`
- **Status:** ADR aprovado, aguardando implementação por fases
- **Dependências novas:** `@zxing/library`, `jspdf`, `jspdf-autotable`, `xlsx`, `recharts`
- **Impacto:**
  - Performance: React.lazy + Suspense em todas as rotas, skeleton loading, paginação server-side
  - Componentes shared: `PhotoUpload.tsx`, `QRCodeScanner.tsx`, `GlobalSearch.tsx`, `NotificationBell.tsx`
  - Novo módulo: `/reports` — 5 relatórios com exportação PDF/Excel
  - Novo serviço: `documentGenerator.ts` — geração de OS, comprovante, relatório de veículo
  - Dashboard: reformulação completa com Recharts (gráficos), cards de métricas, alertas por urgência
  - Mobile: PWA manifest, bottom navigation para motoristas, pull to refresh
  - Notificações: Supabase Realtime + tabela `notifications`
  - Segurança: audit log, rate limiting, timeout de sessão
  - Navegação: busca global (Ctrl+K), badges na sidebar, breadcrumb
- **Ordem de implementação:**
  1. Performance (lazy loading + skeleton)
  2. PhotoUpload universal
  3. Dashboard reformulado
  4. Relatórios
  5. QR Code Scanner
  6. Geração de documentos
  7. Melhorias mobile
  8. Notificações em tempo real
  9. Segurança
  10. Navegação e UX
