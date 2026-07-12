# Decision: Dupla Bomba — Registro de Litros por Bomba no Abastecimento

## Context

Caminhoes de transporte frequentemente abastecem em dois bicos/bombas distintos no mesmo processo de abastecimento. O cupom fiscal/nota emitida pelo posto registra dois lancamentos de litros separados (um por bomba). O campo `liters` atual na tabela `fuel_records` suporta apenas um valor unico, forcando o usuario a somar manualmente os dois bicos antes de registrar, o que e propenso a erros e impossibilita auditoria individual por bomba.

## Decision

- Adicionar as colunas `liters_pump1` `(numeric)` e `liters_pump2` `(numeric, nullable)` na tabela `fuel_records` do Supabase.
- A coluna `liters` existente passa a ser **calculada e salva como soma** de `liters_pump1 + liters_pump2` — mantendo backward compatibility com todos os relatórios, dashboards e consultas que ja usam `liters`.
- No frontend (`FuelModal.tsx` e `DriverFuel.tsx`), exibir dois campos separados: "Litros - Bomba 1" (obrigatorio) e "Litros - Bomba 2" (opcional), com um campo somente leitura de "Total de Litros" calculado em tempo real.
- O campo `liters` existente NAO e removido — e preenchido automaticamente com o total antes de salvar.
- `liters_pump2` aceita `null` (abastecimento em apenas uma bomba).

## Rationale

- **Sem breaking change**: a coluna `liters` continua existindo e sendo preenchida, portanto todos os dashboards, relatórios, calculos de KM/L e queries existentes funcionam sem alteração.
- **Auditabilidade**: salvar os valores individuais por bomba permite que o gestor rastreie discrepancias entre o cupom fiscal e o lancamento.
- **Simplicidade**: seguindo o padrao da ADR 006 (Arla Integration), que adicionou `arla_liters` diretamente na tabela principal ao inves de criar tabelas de items associativas — mesma logica se aplica aqui.
- **Consistencia**: o campo `liters` como "source of truth" para calculos evita ter que refatorar toda a camada de reports.

## Alternatives Considered

- **Criar coluna `liters` como GENERATED COLUMN no PostgreSQL (calculada automaticamente pelo banco)**: Descartado porque o Supabase/PostgREST nao expoe `GENERATED ALWAYS AS` de forma simples via ORM, e o cliente Supabase JS nao suporta override de colunas geradas no `upsert`.
- **Criar tabela `fuel_pump_items` associativa**: Descartado como over-engineering — seguindo o mesmo raciocinio da ADR 006 que rejeitou tabela de items para Arla. Aumentaria a complexidade de queries sem beneficio real dado que o maximo de bombas e 2.
- **Renomear `liters` para `liters_pump1` e usar apenas os dois campos separados**: Descartado porque quebraria todos os relatórios, dashboards e queries existentes que dependem do campo `liters`.
- **Calcular o total apenas no frontend sem salvar no banco**: Descartado porque as queries de relatorio e KM/L precisam de `liters` acessivel diretamente via SQL para filtros e agregacoes eficientes.

## Technical Context

- Tabela afetada: `fuel_records` no Supabase (PostgreSQL)
- Colunas a adicionar: `liters_pump1 NUMERIC`, `liters_pump2 NUMERIC NULL`
- Coluna a manter: `liters NUMERIC` (preenchida como soma antes de cada INSERT/UPDATE)
- Tipo TypeScript: `FuelRecord` em `src/types/index.ts` — adicionar `liters_pump1`, `liters_pump2`
- Hook afetado: `src/hooks/useFuelRecords.ts` — logica de soma antes do save
- Componentes afetados: `src/components/fuel/FuelModal.tsx`, `src/pages/DriverFuel.tsx`
- Sem alteracao necessaria em: `fuelReportGenerator.ts`, dashboard, KM/L — todos continuam usando `liters`

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: Dupla Bomba](../intent/feature-dupla-bomba.md)
- [Feature: Abastecimento](../intent/feature-abastecimento.md)
- [Decision: Fuel Updates (ADR 006)](006-fuel-updates.md)
- [Decision: Tech Stack](001-tech-stack.md)

## Status

Proposed — aguardando aprovacao para implementacao
