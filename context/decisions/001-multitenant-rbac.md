# Decision 001: Multi-Tenant com RBAC (Role-Based Access Control)

**Status:** Aprovado  
**Data:** 2026-02-24  
**Deciders:** Dono do Produto

---

## Context

O sistema SaaS de Transportadora atende múltiplas empresas (tenants), cada uma com usuários, veículos e operações próprias. São necessários:

- **Isolamento total de dados** entre empresas diferentes
- **Controle de acesso por papel** para diferenciar SuperAdmin, Admin da Empresa, Gestor e Motorista
- **Visão global** para o criador do sistema sem comprometer a segurança entre tenants
- **Escalabilidade** para crescimento do número de empresas sem aumento proporcional de complexidade

A arquitetura anterior não garantia isolamento real de dados entre tenants nem separava claramente as responsabilidades dos perfis de usuário.

---

## Decision

Implementar modelo **multi-tenant shared database** com **RBAC (Role-Based Access Control)** usando:

1. **`tenant_id` em todas as entidades** — cada registro pertence a exatamente um tenant
2. **RLS (Row Level Security) no Supabase** — queries de usuários comuns são automaticamente filtradas pelo `tenant_id` do usuário logado
3. **`SECURITY DEFINER` function para SuperAdmin** — o SuperAdmin bypassa RLS via função com permissões elevadas, sem desativar RLS globalmente
4. **Roles tipadas** no sistema: `superadmin` | `admin` | `manager` | `driver`
5. **Controle de rotas no frontend** — cada role acessa apenas as rotas permitidas

**Estrutura de permissões:**

| Role | DB Access | Frontend Routes |
|---|---|---|
| `superadmin` | Todos os tenants (via SECURITY DEFINER) | Todas, incluindo `/superadmin` |
| `admin` | Somente próprio tenant (via RLS) | Dashboard, Fleet, Fuel, Maint., Settings, Users |
| `manager` | Somente próprio tenant (via RLS) | Dashboard, Fleet, Fuel, Maint. (sem Settings/Users) |
| `driver` | Somente próprio tenant (via RLS) | Apenas lançamento: Fuel (simplificado) |

---

## Rationale

- **Segurança e isolamento**: RLS garante que mesmo queries mal escritas no frontend não vazem dados de outros tenants
- **Escalabilidade**: shared database é mais simples e barato que bancos separados por empresa; basta adicionar um novo tenant
- **Simplicidade de permissões**: roles claras eliminam lógica ad-hoc espalhada pelo código
- **Reflexo fiel do modelo de negócio**: separa claramente dono do sistema, gestor da empresa e motorista
- **Compatibilidade com stack existente**: Supabase já oferece RLS nativo; `tenant_id` já existe em todas as entidades do projeto

---

## Alternatives Considered

### 1. Banco de dados separado por empresa
- **Rejeitado**: Altamente complexo de manter, custo operacional elevado, sem ganho de segurança significativo dado que já usamos Supabase com RLS
- **Problema adicional**: Impossibilita dashboards consolidados para o SuperAdmin sem um serviço de agregação extra

### 2. Controle de acesso apenas por flags simples (`is_admin: boolean`)
- **Rejeitado**: Não escala para 4 perfis distintos com permissões diferentes
- **Problema adicional**: Lógica de permissão fica espalhada e frágil; difícil auditar

### 3. Middleware de autorização no backend (Edge Functions)
- **Rejeitado por enquanto**: Adiciona complexidade de infraestrutura desnecessária; RLS resolve o problema na camada de dados e o frontend resolve nas rotas; pode ser adicionado futuramente se necessário

---

## Implementation Notes

- `UserRole` já está definido no `types/index.ts`: `"driver" | "manager" | "admin" | "superadmin"`
- `tenant_id` já existe em todas as entidades
- `isSuperAdmin` já existe no `AuthContext.tsx` (verificação via `user.role === "superadmin"`)
- **Próximos passos de implementação**:
  1. Revisar/criar RLS policies no Supabase para todas as tabelas
  2. Criar função `SECURITY DEFINER` para SuperAdmin acessar qualquer tenant
  3. Atualizar sidebar e rotas protegidas por role no frontend
  4. Implementar interface de lançamento simplificada para o perfil `driver`
  5. Conectar campo `invoice_photo_url` ao fluxo de upload no `FuelModal`

---

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: SuperAdmin](../intent/feature-superadmin.md)
- [Decision: Auth e Autorização (Atualizada)](002-auth-rbac-update.md)
