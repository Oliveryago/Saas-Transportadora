# AGENTS.md — SaaS Fleet Manager para Transportadoras

## Setup Commands

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## Contexto do Projeto

SaaS multi-tenant de gestão de frota para transportadoras brasileiras.
Stack: React 18 + TypeScript + Vite + Supabase + TailwindCSS

**Deploy**: Vercel (CI/CD automático via GitHub)
**Banco**: Supabase (PostgreSQL + RLS + Storage)

## Context Files — Carregar Antes de Trabalhar

```
context/
├── .context-mesh-framework.md   ← Framework rules (sempre ler)
├── intent/
│   ├── project-intent.md        ← Visão geral do projeto (sempre ler)
│   ├── feature-abastecimento.md ← Módulo de combustível
│   ├── feature-motorista-interface.md ← Interface mobile do motorista
│   └── feature-superadmin.md    ← Painel SuperAdmin
├── decisions/
│   ├── 001-tech-stack.md        ← React + Vite + Supabase
│   ├── 002-multitenant-rbac.md  ← Arquitetura multi-tenant
│   ├── 003-auth-roles.md        ← Auth + roles
│   └── 008-driver-interface.md  ← Interface motorista sem MainLayout
└── knowledge/patterns/
    ├── supabase-crud-hook.md    ← Padrão de hook CRUD
    ├── driver-route-guard.md    ← Guard de rota do motorista
    └── photo-upload.md          ← Upload de fotos
```

## Estrutura do Projeto

```
src/
├── pages/          ← Uma página por rota
│   ├── DriverHome.tsx    ← /driver (mobile-first)
│   ├── DriverFuel.tsx    ← /driver/fuel
│   ├── DriverHistory.tsx ← /driver/history
│   ├── Fuel.tsx          ← /fuel (admin/manager)
│   └── ...
├── components/
│   ├── Layout/
│   │   ├── MainLayout.tsx  ← Layout com Sidebar (não usar para motorista)
│   │   ├── Sidebar.tsx
│   │   └── BottomNav.tsx
│   ├── DriverRoute.tsx     ← Guard sem MainLayout para drivers
│   ├── ProtectedRoute.tsx  ← Guard com MainLayout para outros roles
│   └── fuel/FuelModal.tsx
├── contexts/
│   └── AuthContext.tsx     ← user, tenant, isSuperAdmin, role
├── hooks/
│   ├── useFuelRecords.ts   ← Padrão CRUD hook
│   └── use*.ts             ← Todos seguem o mesmo padrão
├── types/index.ts          ← Todos os tipos TypeScript
└── App.tsx                 ← Roteamento
```

## Regras Críticas — NUNCA Violar

1. **Sempre filtre por `tenant_id`** em queries Supabase — sem exceção
2. **Motoristas** acessam `/driver/*` com `DriverRoute` — SEM `MainLayout`
3. **Admin/Manager** acessam via `ProtectedRoute` com `MainLayout`
4. **SuperAdmin** pode acessar qualquer tenant
5. **Não exibir dados de outros tenants** no frontend (RLS garante no banco)

## Roles de Usuário

| Role | Rota inicial | Acesso |
|------|-------------|--------|
| `driver` | `/driver` | Interface mobile simplificada |
| `manager` | `/` | Dashboard + operações (sem config) |
| `admin` | `/` | Tudo do tenant |
| `superadmin` | `/` | Todos os tenants |

## Code Style

- **TypeScript strict** — sempre tipar, nunca usar `any` sem justificativa
- **Hooks customizados** para toda lógica de dados (padrão em `src/hooks/`)
- **TailwindCSS** para estilos — não usar CSS inline ou módulos
- **Lucide React** para todos os ícones
- **Supabase** para toda persistência — não criar fetch direto
- Componentes de página em `src/pages/`, reutilizáveis em `src/components/`

## Após Qualquer Mudança

- [ ] Atualizar `context/evolution/changelog.md`
- [ ] Atualizar feature file se funcionalidade mudou
- [ ] Criar decision file se escolha técnica foi feita
- [ ] Verificar se types/index.ts precisa de novos tipos
