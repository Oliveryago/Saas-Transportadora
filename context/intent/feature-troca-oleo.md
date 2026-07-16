# Feature: Troca de Óleo e Alertas

## What

Registro de trocas de óleo e filtros (motor, câmbio, diferencial). A funcionalidade central é o sistema de alertas preditivos que notifica os gestores quando uma próxima troca se aproxima, baseando-se no odômetro atualizado pelos abastecimentos ou por data.

## Why

A lubrificação deficiente é a principal causa de quebra de motores e caixas de câmbio, gerando custos altíssimos de reparo e tempo de frota parada. O controle proativo alerta a equipe antes que o óleo perca a viscosidade de segurança.

## Acceptance Criteria

- [x] Registro de troca de óleo (tipo, km, valor)
- [x] Configuração de alerta (intervalo de KM e/ou meses)
- [x] Cálculo automático da próxima troca
- [x] Painel de alertas no dashboard quando a troca está próxima ou vencida
- [x] Atualização da verificação de KM utilizando o KM mais recente lançado no sistema (ex: abastecimentos)

## Related

- [Project Intent](project-intent.md)
- [Feature: Abastecimento](feature-abastecimento.md)
- [Feature: Dashboard](feature-dashboard.md)
- [Decision: Oil Alert by Fuel KM](../decisions/004-oil-alert-fuel-km.md)
- [Pattern: Supabase CRUD Hook](../knowledge/patterns/supabase-crud-hook.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Active (implementado)
