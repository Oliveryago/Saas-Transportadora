# Feature: Dupla Bomba (Dual Pump Fueling)

## What

Suporte ao registro de abastecimento com duas bombas diferentes no mesmo evento de abastecimento do caminhão. O formulário permite lançar os litros de cada bomba separadamente (Bomba 1 e Bomba 2), e o sistema soma automaticamente os dois valores para calcular o total abastecido naquele registro.

## Why

Na operação real das transportadoras, caminhões frequentemente abastecem em duas bombas distintas no mesmo processo. Isso gera um cupom fiscal com dois lançamentos de litros separados — um por bomba — referentes ao mesmo evento. Sem suporte a esse modelo, o gestor ou motorista seria forçado a somar manualmente os dois valores antes de digitar no sistema, o que é propenso a erro e perde a rastreabilidade de cada bomba individualmente. A funcionalidade garante precisão no lançamento e mantém auditabilidade completa por bomba para consultas futuras.

## Acceptance Criteria

- [ ] Campo "Litros - Bomba 1" presente no formulário de registro de abastecimento
- [ ] Campo "Litros - Bomba 2" opcional no formulário de registro de abastecimento
- [ ] Soma automática dos dois campos exibida em tempo real no formulário (campo "Total de Litros")
- [ ] O total calculado é usado em relatórios, cálculo de consumo e KM/L
- [ ] Valores de Bomba 1 e Bomba 2 salvos individualmente no banco de dados para auditoria
- [ ] Campos validam: sem valores negativos, sem texto não numérico
- [ ] Segundo campo (Bomba 2) pode ficar vazio — nao e obrigatorio
- [ ] Registros antigos (com apenas um valor de litros) continuam funcionando sem quebrar
- [ ] Interface do motorista (mobile) suporta os mesmos campos
- [ ] Relatórios e exportações usam o total consolidado (Bomba 1 + Bomba 2)

## Related

- [Project Intent](project-intent.md)
- [Feature: Abastecimento](feature-abastecimento.md)
- [Decision: Dupla Bomba](../decisions/010-dupla-bomba.md)
- [Decision: Fuel Updates](../decisions/006-fuel-updates.md)

## Status

- **Created**: 2026-07-11
- **Status**: Proposed
