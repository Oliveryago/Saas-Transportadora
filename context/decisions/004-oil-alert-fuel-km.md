# Decision: Alerta de Troca de Óleo via KM do Abastecimento

**Status:** Aceita  
**Data:** 2026-03-21  

## Contexto

Os alertas de troca de óleo atualmente comparam `vehicle.current_km` com o próximo KM de troca. Porém, o `current_km` do veículo frequentemente está desatualizado. Os abastecimentos registram `km_digital` a cada ~1.500 km, sendo a fonte mais confiável.

## Decisão

Modificar `useOilChangeAlerts.ts` para buscar o último `km_digital` do `fuel_records` de cada veículo e usar esse valor na comparação dos alertas. Se não houver abastecimento, usar o `vehicle.current_km` como fallback.

Adicionalmente, ao registrar um abastecimento, atualizar automaticamente o `current_km` do veículo na tabela `vehicles`.

## Racional

- O KM do abastecimento é atualizado **organicamente** a cada ~1.500 km
- Não exige ação extra do usuário
- É a forma mais natural de manter o KM atual do veículo atualizado

## Alternativas Consideradas

1. **Pedir ao admin para atualizar KM manualmente** — Esquecimento causa alertas imprecisos
2. **Campo de KM obrigatório no login do motorista** — Intrusivo e complexo
3. **Serviço de GPS/Telemetria** — Custo elevado, fora do escopo

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: Alerta via KM Abastecimento](../intent/feature-oil-alert-fuel-km.md)
- [Decision: Multi-Tenant RBAC](001-multitenant-rbac.md)
