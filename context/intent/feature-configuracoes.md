# Feature: Configurações da Empresa

## What

Painel de administração onde o responsável pelo tenant (transportadora) pode gerenciar dados da empresa e acessos de usuários.

## Why

Como um SaaS multi-tenant, cada empresa precisa customizar seu ambiente (logo, nome, endereço) e gerenciar sua própria equipe (convidar novos usuários, alterar permissões, revogar acesso) com total autonomia, sem depender do suporte do SaaS.

## Acceptance Criteria

- [x] Edição de dados da empresa (Nome, CNPJ, Endereço, Contatos)
- [x] Upload de logo da transportadora (utilizado em PDFs gerados)
- [x] Gerenciamento de usuários do tenant (convite, edição de roles, exclusão)
- [x] Acesso estritamente restrito ao role "admin" (e superadmin global)

## Related

- [Project Intent](project-intent.md)
- [Feature: SuperAdmin](feature-superadmin.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
