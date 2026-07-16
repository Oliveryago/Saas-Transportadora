# Feature: Estacionamento

## What

Registro de despesas com estacionamentos utilizados pela frota. Controla entrada, saída (data/hora), valor e observações por evento.

## Why

Estacionamentos são uma despesa recorrente especialmente em operações urbanas e para veículos que pernoitam fora da base. Registrar cada evento permite controlar e auditar esse custo, que muitas vezes é pago pelo motorista e reembolsado pela empresa.

## Acceptance Criteria

- [x] Registro com data de entrada, data de saída e valor
- [x] Vinculação ao veículo e motorista
- [x] Campo de notas/observações
- [x] Listagem e filtro por veículo e período
- [x] Edição e exclusão de registros

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Dashboard Financeiro](feature-financeiro.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
