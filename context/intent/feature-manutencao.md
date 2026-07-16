# Feature: Manutenção

## What

Registro de ordens de serviço de manutenção para veículos e implementos. Permite documentar reparos, peças utilizadas, valor da mão de obra, data e fornecedor (oficina).

Cada registro pode conter múltiplas peças com seus respectivos custos e foto do comprovante/nota fiscal da oficina.

## Why

Manutenção é um dos maiores custos operacionais de uma frota. Registrar cada OS com peças e valores permite à gestão calcular o custo total de manutenção por veículo, identificar veículos com alto índice de falhas e negociar melhores contratos com oficinas.

## Acceptance Criteria

- [x] Registro de manutenção com data, tipo, descrição, valor e KM do veículo
- [x] Lista de peças utilizadas na manutenção (nome + custo individual)
- [x] Vinculação a veículo ou implemento
- [x] Upload de foto do comprovante/nota fiscal
- [x] Listagem e filtro por veículo e período
- [x] Edição e exclusão de registros
- [x] Valor total calculado automaticamente (soma das peças)

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Dashboard Financeiro](feature-financeiro.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)
- [Pattern: Photo Upload](../knowledge/patterns/photo-upload.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
