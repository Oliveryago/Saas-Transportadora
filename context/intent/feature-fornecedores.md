# Feature: Fornecedores

## What

Cadastro centralizado de fornecedores utilizados pela transportadora. Permite registrar postos de combustível, oficinas mecânicas, lavajatos, estacionamentos e outros tipos de parceiros.

## Why

Para ter rastreabilidade de custos e controle de qualidade, é necessário saber onde os serviços e produtos foram adquiridos. O cadastro de fornecedores centralizado evita duplicidade de dados e permite que motoristas e gestores selecionem rapidamente o fornecedor correto (ex: posto de combustível) ao lançar uma despesa.

## Acceptance Criteria

- [x] Cadastro com nome, CNPJ, tipo de fornecedor, endereço e telefones
- [x] Categorização por tipo (posto, oficina, lavajato, etc.)
- [x] Campo de observações e notas
- [x] Listagem geral
- [x] Edição e exclusão
- [x] Integração com formulários de despesas (seleção de posto no abastecimento, oficina na manutenção, etc.)

## Related

- [Project Intent](project-intent.md)
- [Feature: Abastecimento](feature-abastecimento.md)
- [Feature: Manutenção](feature-manutencao.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
