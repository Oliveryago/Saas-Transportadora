# Decision: SuperAdmin Tenant Switching (Impersonação)

**Status:** Aceita  
**Data:** 2026-03-21  

## Contexto

O SuperAdmin precisa poder selecionar uma empresa e visualizar o dashboard completo com os dados daquela empresa. A implementação anterior mostrava apenas uma lista de usuários e veículos inline.

## Decisão

Usar **tenant override no AuthContext**. Quando o SuperAdmin seleciona uma empresa, setamos `impersonatedTenant` no estado do contexto. A propriedade `tenant` retorna `impersonatedTenant ?? realTenant`, fazendo com que todos os hooks existentes carreguem automaticamente os dados da empresa selecionada.

## Racional

- **Zero duplicação de lógica** — Todos os hooks já usam `tenant` do `useAuth()`, então funcionam automaticamente
- **Mudança localizada** — Apenas `AuthContext`, `SuperAdmin.tsx`, `Sidebar.tsx` e `Dashboard.tsx` precisaram de alteração
- **Reversível** — A impersonação é apenas estado in-memory, sem persistência

## Alternativas Consideradas

1. **Contexto separado TenantContext** — Redundante, pois AuthContext já expõe o tenant
2. **Rotas parametrizadas (`/company/:id/dashboard`)** — Complexidade desnecessária, exigiria refatorar cada hook
3. **Duplicar hooks com parâmetro tenantId** — Violaria DRY e exigiria mudanças em todos os componentes

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: SuperAdmin](../intent/feature-superadmin.md)
- [Decision: Multi-Tenant RBAC](001-multitenant-rbac.md)
- [Decision: Auth e Autorização](002-auth-rbac-update.md)
