# Feature: Dashboard Operacional

## What

Visão geral do estado operacional da frota. Apresenta métricas chave, alertas urgentes e um resumo do consumo e atividade dos veículos.

## Why

Gestores precisam de uma visão instantânea ("bird's eye view") para tomar decisões rápidas. O dashboard consolida dados espalhados por vários módulos para destacar o que exige atenção imediata, como trocas de óleo vencidas ou consumo excessivo de combustível.

## Acceptance Criteria

- [x] Exibição do total de veículos ativos
- [x] Resumo de alertas críticos (óleo, manutenção, documentos)
- [x] Gráficos ou indicadores de consumo médio (km/l) da frota
- [x] Filtros globais (ex: por período)
- [x] Links rápidos para os módulos principais

## Related

- [Project Intent](project-intent.md)
- [Feature: Dashboard Financeiro](feature-financeiro.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
