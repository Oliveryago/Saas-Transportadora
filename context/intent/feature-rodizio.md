# Feature: Rodízio de Pneus

## What

Controle do rodízio periódico de pneus dos veículos da frota. Registra cada evento de rodízio com data, odômetro atual e projeção do próximo rodízio por KM.

## Why

O rodízio regular de pneus aumenta a vida útil dos pneus e melhora a segurança e estabilidade do veículo. Sem controle, os pneus desgastam de forma irregular levando a substituições prematuras e custos maiores. O sistema permite que a gestão acompanhe a conformidade dos veículos.

## Acceptance Criteria

- [x] Registro de rodízio com data, KM atual e próximo KM de rodízio previsto
- [x] Campo de notas/observações
- [x] Vinculação ao veículo
- [x] Listagem e filtro por veículo
- [x] Edição e exclusão de registros

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Troca de Pneus](feature-pneus.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
