# Feature: Abastecimento (Fuel)

## What

Registro digital de abastecimentos de combustível realizados pela frota. O motorista ou gestor lança os dados do posto: veículo, KM, litros, tipo de combustível, valor, posto e foto da nota fiscal. O sistema calcula automaticamente o preço por litro e atualiza o hodômetro do veículo.

## Why

Controlar o consumo de combustível é o maior custo variável de uma transportadora. Sem registro centralizado, há risco de fraude, inconsistência de dados e impossibilidade de análise de performance por veículo ou motorista. O módulo garante rastreabilidade e auditoria de cada abastecimento.

## Acceptance Criteria

- [x] Motorista consegue registrar abastecimento pelo celular em campo (4G)
- [x] Suporte a Diesel S-500, S-10, Arla 32, Gasolina, Álcool, Gás Natural
- [x] Registro de Arla 32 junto com diesel (separado, com valor próprio)
- [x] Foto da nota fiscal obrigatória (upload para storage)
- [x] KM do veículo atualizado automaticamente após abastecimento
- [x] Gestor vê todos os abastecimentos do tenant com filtros
- [x] Abastecimentos ficam com status "pendente" até validação do gestor
- [x] Suporte a desconto por posto (preço com vs sem desconto)
- [x] Autocomplete de postos cadastrados como fornecedores
- [ ] Validação automática por limites (ex: litros acima da capacidade do tanque)

## Related

- [Project Intent](project-intent.md)
- [Decision: Tech Stack](../decisions/001-tech-stack.md)
- [Decision: Auth e Roles](../decisions/003-auth-roles.md)
- [Decision: Fuel Arla Integration](../decisions/006-fuel-arla-backdated.md)
- [Pattern: Hook de CRUD Supabase](../knowledge/patterns/supabase-crud-hook.md)
- [Pattern: Upload de Foto](../knowledge/patterns/photo-upload.md)

## Status

- **Created**: 2026-06-23 (Phase: Intent — retroativo)
- **Status**: Active (implementado, em evolução)
