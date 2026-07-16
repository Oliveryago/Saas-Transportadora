# Feature: Pedágios

## What

Registro de despesas com pedágios por viagem. Permite documentar data, valor, UF (estado), cidade, motorista responsável e observações de contexto (ex: nome da rota/viagem).

## Why

Pedágio é uma despesa variável ligada a rotas específicas. Registrar cada evento permite calcular o custo médio de pedágio por rota, identificar rotas mais caras e incluir esse custo no cálculo do frete cobrado ao cliente.

## Acceptance Criteria

- [x] Registro de pedágio com data, valor, UF, cidade e motorista
- [x] Campo de observações para identificar a viagem/rota
- [x] Vinculação ao veículo
- [x] Listagem e filtro por veículo e período
- [x] Edição e exclusão de registros

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Dashboard Financeiro](feature-financeiro.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
