# Feature: Alerta Inteligente de Troca de Óleo via KM do Abastecimento

**Status:** Planejado  
**Criado em:** 2026-03-21  

## Objetivo

Usar o KM registrado nos abastecimentos (`fuel_records.km_digital`) como fonte real de quilometragem atual do veículo para disparar alertas de troca de óleo. Como abastecimentos ocorrem a cada ~1.500 km, o KM mais recente do abastecimento é a referência mais confiável para calcular a proximidade da próxima troca.

## Contexto

Atualmente, os alertas de troca de óleo usam `vehicle.current_km` para calcular se está próximo da troca. Porém, esse valor pode estar desatualizado se o admin não atualizou manualmente o KM do veículo na tela de Frota. Os registros de abastecimento, por outro lado, sempre registram o KM atual (`km_digital`), tornando-se a fonte mais confiável de quilometragem.

## Comportamento Esperado

1. O sistema busca o **último abastecimento** de cada veículo e usa o `km_digital` como KM atual
2. Compara esse KM com o `last_change_km + km_interval` do alerta de troca de óleo
3. Se a diferença for ≤ 1.000 km, marca o alerta como **pendente**
4. Opcionalmente, atualiza o `current_km` do veículo na tabela `vehicles` quando um novo abastecimento é registrado

## Critérios de Aceitação

- [ ] Alertas de troca de óleo usam o KM mais recente dos abastecimentos
- [ ] Se não há abastecimento, fallback para `vehicle.current_km`
- [ ] Dashboard mostra alertas com base no KM real
- [ ] Tela de Troca de Óleo mostra KM atual correto (do último abastecimento)

## Related

- [Project Intent](project-intent.md)
- [Decision: Alerta via KM Abastecimento](../decisions/004-oil-alert-fuel-km.md)
