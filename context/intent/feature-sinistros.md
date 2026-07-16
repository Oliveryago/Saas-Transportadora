# Feature: Sinistros (Acidentes)

## What

Registro de acidentes e sinistros envolvendo veículos da frota. Documenta data, descrição do ocorrido, boletim de ocorrência, localização (UF/cidade), motorista envolvido e observações.

## Why

Acidentes com veículos de carga geram impactos financeiros, legais e de segurança. Registrar cada sinistro com detalhes permite acionar o seguro corretamente, acompanhar processos judiciais, identificar motoristas com alto índice de acidentes e implementar treinamentos preventivos.

## Acceptance Criteria

- [x] Registro de acidente com data, descrição, B.O. e localização
- [x] Vinculação ao veículo e motorista
- [x] Campo de notas adicionais
- [x] Listagem e filtro por veículo
- [x] Edição e exclusão de registros

## Related

- [Project Intent](project-intent.md)
- [Feature: Gestão de Frota](feature-frota.md)
- [Feature: Seguros](feature-seguros.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
