# Feature: Dashboard Financeiro

## What

Visão consolidada dos custos da transportadora. Agrega despesas de todos os módulos (combustível, manutenção, pneus, pedágios, lavagem, estacionamento, seguros, etc.) em gráficos e tabelas para análise de gastos por veículo, por tipo de despesa e por período.

## Why

Saber exatamente para onde o dinheiro está indo é crucial para a lucratividade da transportadora. O dashboard financeiro transforma dados operacionais brutos em inteligência de negócios, permitindo identificar gargalos, desperdícios e o custo real de cada veículo por quilômetro rodado (R$/km).

## Acceptance Criteria

- [x] Gráficos de distribuição de custos (pie charts) por categoria de despesa
- [x] Gráficos de evolução temporal (bar/line charts) dos custos
- [x] Tabela consolidada de custos totais por veículo
- [x] Cálculo de R$/km por veículo
- [x] Filtro global de datas para análise de períodos específicos
- [x] Acesso restrito apenas a administradores e gestores

## Related

- [Project Intent](project-intent.md)
- [Feature: Dashboard Operacional](feature-dashboard.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
