# Feature: Seguros

## What

Registro e controle das apólices de seguro dos veículos da frota. Permite documentar seguradora, corretor, tipo de seguro, número da apólice, valor e data de vencimento.

Alerta sobre vencimentos próximos para evitar que veículos circulem sem cobertura.

## Why

Veículos de carga devem obrigatoriamente manter seguros em dia para conformidade legal e proteção patrimonial. Perder o prazo de renovação expõe a empresa a riscos financeiros e legais graves. O sistema centraliza todas as apólices para facilitar o controle dos vencimentos.

## Acceptance Criteria

- [x] Registro de apólice com seguradora, corretor, tipo, número da apólice, valor e vencimento
- [x] Vinculação ao veículo
- [x] Listagem e filtro por veículo
- [x] Notas adicionais por apólice
- [x] Edição e exclusão de registros

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Dashboard](feature-dashboard.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
