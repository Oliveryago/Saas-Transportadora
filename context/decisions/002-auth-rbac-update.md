# Decision 002: Auth e Autorização — Atualização para Multi-Role e Multi-Tenant

**Status:** Atualizado  
**Data original:** (pré-existente na implementação)  
**Atualizado em:** 2026-02-24  
**Motivo da atualização:** Inclusão de múltiplos papéis de usuário, contexto de empresa (`tenant_id`) e diferenciação clara de permissões entre SuperAdmin, AdminEmpresa e Motorista

---

## Context

O sistema já possuía autenticação via Supabase Auth com:
- `AuthContext.tsx` gerenciando sessão e estado do usuário
- `isSuperAdmin` derivado de `user.role === "superadmin"`
- `tenant_id` no perfil do usuário para vincular ao tenant
- Roles definidas: `driver | manager | admin | superadmin`

A decisão original de autenticação precisava ser ajustada para refletir o modelo multi-tenant com RBAC aprovado em **Decision 001**.

---

## Decision

Manter Supabase Auth como provedor de autenticação, mas **expandir o `AuthContext`** com:

1. **Expor `userRole`** — além de `isSuperAdmin`, expor o role completo do usuário para decisões de autorização granulares no frontend
2. **Expor helpers de permissão** — ex: `isAdmin`, `isDriver`, `isManager` para uso nos componentes
3. **Manter `tenant`** no contexto — já existe, mas deve ser usado **obrigatoriamente** em todas as queries para filtro correto
4. **Proteger rotas por role** — `ProtectedRoute` deve aceitar prop `allowedRoles` para bloquear acesso por perfil, não apenas por autenticação
5. **SuperAdmin sem tenant obrigatório** — o SuperAdmin pode não ter `tenant_id` ou ter um tenant especial; seu acesso a dados de outros tenants ocorre via RLS bypass no banco

**Interface atualizada do AuthContext:**
```typescript
interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;      // role === "admin"
  isManager: boolean;    // role === "manager"
  isDriver: boolean;     // role === "driver"
  userRole: UserRole | null;
  signUp: (...) => Promise<void>;
  signIn: (...) => Promise<void>;
  signOut: () => Promise<void>;
}
```

---

## What Changed from Original

| Aspecto | Antes | Depois |
|---|---|---|
| Helpers de role | Apenas `isSuperAdmin` | `isSuperAdmin`, `isAdmin`, `isManager`, `isDriver` |
| Controle de rotas | Apenas autenticado/não autenticado | Por role (`allowedRoles` no ProtectedRoute) |
| Acesso ao role no contexto | Via `user.role` diretamente | Via `userRole` tipado e helpers |
| Isolamento de dados | Sem garantia formal de RLS | Garantido via RLS (Decision 001) + `tenant_id` obrigatório nas queries |

---

## Rationale

- Mudança mínima e não-breaking na API do contexto (adição de campos, não remoção)
- Helpers reduzem repetição de `user.role === "x"` espalhada pelos componentes
- Centralizar a lógica de autorização no `AuthContext` e `ProtectedRoute` facilita auditoria e manutenção

---

## Related

- [Feature: SuperAdmin](../intent/feature-superadmin.md)
- [Decision: Multi-Tenant RBAC](001-multitenant-rbac.md)
