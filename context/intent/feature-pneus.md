# Feature: Troca de Pneus

## What

Registro e controle do histórico de trocas de pneus da frota. Permite documentar marca, dimensão, quantidade de pneus, KM da troca, projeção do próximo KM de troca e valor pago.

Suporta descontos negociados com fornecedores.

## Why

Pneus representam um custo significativo e recorrente na operação de transportadoras. Controlar o histórico por veículo permite prever quando o próximo conjunto deve ser trocado, evitar desgaste excessivo e comparar custos entre fornecedores.

## Acceptance Criteria

- [x] Registro de troca com data, marca, dimensão, quantidade, KM atual e próximo KM de troca
- [x] Suporte a desconto (preço cheio vs. preço negociado)
- [x] Vinculação ao veículo
- [x] Listagem por veículo e período
- [x] Cálculo automático do valor total
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
