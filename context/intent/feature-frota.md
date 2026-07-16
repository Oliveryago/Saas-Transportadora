# Feature: Gestão de Frota (Fleet)

## What

Cadastro e gerenciamento centralizado de todos os veículos e implementos (carretas, baus, tanques, etc.) da transportadora.

Permite registrar veículos com placa, modelo, ano, capacidade do tanque e odômetro atual. Implementos podem ser vinculados a veículos com datas de associação e desassociação rastreadas.

## Why

Transportadoras operam múltiplos veículos e implementos que precisam ser identificados em todos os outros módulos (abastecimento, manutenção, pneus, etc.). Sem um cadastro centralizado de frota, seria impossível filtrar registros por veículo ou calcular métricas por ativo.

A capacidade de tanque registrada no veículo alimenta o simulador de autonomia no módulo de abastecimento.

## Acceptance Criteria

- [x] Cadastro de veículo com placa, modelo, ano, KM atual e capacidade do tanque
- [x] Cadastro de implementos (carretas) com tipo, placa e modelo
- [x] Vinculação de implemento a veículo com data de associação
- [x] Desvinculação com registro de data de saída
- [x] Listagem de veículos e implementos ativos do tenant
- [x] Edição e exclusão de veículos/implementos
- [x] KM atual do veículo atualizado automaticamente ao registrar abastecimento

## Related

- [Project Intent](project-intent.md)
- [Feature: Abastecimento](feature-abastecimento.md)
- [Feature: Manutenção](feature-manutencao.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
