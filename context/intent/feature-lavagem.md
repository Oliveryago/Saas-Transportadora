# Feature: Lavagem de Veículos

## What

Registro de lavagens realizadas nos veículos da frota. Cobre diferentes tipos de serviço (lavagem interna, externa, cavalo, carreta, lubrificação, etc.) e permite vincular ao fornecedor (lavajato) e motorista responsável.

## Why

Lavagem é uma despesa operacional recorrente que precisa ser controlada para fins de custo por veículo e conformidade operacional (caminhões limpos representam a empresa). Registrar cada evento permite calcular frequência e custo médio de lavagem.

## Acceptance Criteria

- [x] Registro de lavagem com data, tipo de serviço, valor e fornecedor
- [x] Suporte a múltiplos tipos de lavagem por categoria (cavalo, carreta, interna, etc.)
- [x] Vinculação a veículo e motorista
- [x] Seleção de fornecedor cadastrado (lavajato)
- [x] Listagem e filtro por veículo e período
- [x] Edição e exclusão de registros

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Fornecedores](feature-fornecedores.md)
- [Feature: Dashboard Financeiro](feature-financeiro.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
