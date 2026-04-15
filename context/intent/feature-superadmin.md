# Feature: SuperAdmin — Gestão Multi-Empresa e Controle de Acesso

**Status:** Em atualização  
**Criado em:** 2026-02-24  
**Atualizado em:** 2026-02-24

## Objetivo

Prover ao dono/criador do sistema uma visão macro de todas as empresas cadastradas, com capacidade de acesso total a qualquer empresa para fins de suporte, auditoria e edição. Ao mesmo tempo, garantir isolamento total de dados entre empresas e separação clara de responsabilidades por perfil de usuário.

## Contexto

O sistema é um **SaaS de Transportadora** vendido para múltiplas empresas. Cada empresa tem seus próprios usuários, veículos e operações. O criador do sistema (SuperAdmin) precisa de visão consolidada do negócio e controle total para suporte. Gestores da empresa precisam gerenciar seus usuários e visualizar dashboards. Motoristas precisam de acesso restrito apenas para lançamento de dados operacionais.

A tela atual do SuperAdmin existia mas não refletia corretamente o modelo de negócio: faltavam isolamento real de dados entre empresas, fluxo específico do motorista e separação clara de responsabilidades entre os três perfis.

## Perfis de Usuário

| Role | Acesso |
|---|---|
| `superadmin` | Acesso total ao sistema e a todas as empresas; ignora isolamento por tenant |
| `admin` | Admin da Empresa — gerencia usuários, motoristas e visualiza dashboards da própria empresa |
| `manager` | Gestor operacional — visualização e gestão de operações da própria empresa |
| `driver` | Motorista — acesso restrito ao lançamento de dados operacionais |

## Comportamento Esperado

### Painel SuperAdmin
- Visão geral com cards de: total de empresas, total de usuários, total de veículos
- Lista com busca de todas as empresas cadastradas
- Ao clicar em uma empresa: visualizar usuários, motoristas, veículos e operações
- Capacidade de editar qualquer informação de qualquer empresa

### Isolamento de Dados (Multi-Tenant)
- Todas as entidades vinculadas a `tenant_id`
- Usuários comuns (`admin`, `manager`, `driver`) acessam **somente** dados do próprio tenant
- RLS (Row Level Security) no Supabase garante o isolamento na camada de banco de dados
- SuperAdmin bypassa o isolamento via `SECURITY DEFINER` functions ou política específica

### Fluxo do Motorista (`driver`)
- Acesso restrito ao módulo de lançamento de dados operacionais
- Pode registrar: posto abastecido, KM do veículo, litros e valor do abastecimento
- Pode anexar foto da nota fiscal no registro de abastecimento
- **Não acessa** dashboards, relatórios, gestão de usuários ou configurações

### Dados para Dashboard
- Lançamentos dos motoristas ficam disponíveis imediatamente para análise no dashboard da empresa
- Admin e Manager da empresa visualizam todos os dados do tenant

## Critérios de Aceitação

- [ ] SuperAdmin consegue visualizar todas as empresas cadastradas em lista com busca
- [ ] SuperAdmin consegue acessar individualmente qualquer empresa e ver seus dados
- [ ] SuperAdmin consegue visualizar e editar usuários, motoristas e operações de qualquer empresa
- [ ] Cada empresa tem acesso **apenas** aos seus próprios dados (RLS ativo)
- [ ] Admin da empresa consegue gerenciar usuários internos
- [ ] Motorista tem acesso restrito apenas ao lançamento de dados operacionais
- [ ] Motorista consegue anexar foto da nota fiscal no registro de abastecimento
- [ ] Dados lançados pelo motorista aparecem corretamente no dashboard da empresa
- [ ] Não há vazamento de dados entre empresas diferentes

## Mudanças em Relação ao Estado Original

A tela de SuperAdmin já existia com estrutura básica (`SuperAdmin.tsx`) e o `AuthContext.tsx` já definia `isSuperAdmin`. As seguintes capacidades **precisam ser adicionadas/corrigidas**:

1. **Isolamento real de dados por empresa** — RLS policies precisam ser revisadas para garantir que queries de usuários comuns não retornem dados de outros tenants
2. **Perfil de Motorista (`driver`)** — sidebar, rotas e permissões para acesso restrito ao lançamento de dados
3. **Upload de foto de nota fiscal** — campo `invoice_photo_url` já existe em `FuelRecord`, mas o fluxo de upload pelo motorista precisa ser implementado no `FuelModal`
4. **Diferenciação de Admin da Empresa** — separar claramente o que `admin` e `manager` podem fazer vs. o que `driver` pode fazer
5. **Edição pelo SuperAdmin** — adicionar capacidade de edição de registros de qualquer empresa

## Related

- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)
- [Decision: Auth e Autorização (Atualizada)](../decisions/002-auth-rbac-update.md)
- [Decision: SuperAdmin Tenant Switching](../decisions/003-superadmin-tenant-switching.md)
