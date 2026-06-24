# Feature: Interface do Motorista

## What

Interface mobile-first dedicada ao role "driver", acessível via celular 4G em campo. O motorista acessa um conjunto simplificado de telas para registrar operações sem a complexidade do painel administrativo completo.

## Why

Motoristas trabalham em campo, muitas vezes sem Wi-Fi, usando celular 4G. Precisam de uma interface simples, rápida e otimizada para tela pequena e toque. Expor o painel administrativo completo seria confuso e inadequado para o fluxo de trabalho do motorista.

## Acceptance Criteria

- [x] Motorista é redirecionado automaticamente para `/driver` após login
- [x] Tela home com saudação personalizada, card do veículo vinculado e resumo de abastecimentos
- [x] Lançamento de abastecimento: veículo, KM, litros, valor total, tipo, posto, Arla, tanque cheio
- [x] Foto da nota fiscal pela câmera do celular (capture="environment")
- [x] Histórico de abastecimentos com status de validação
- [x] Interface sem sidebar — layout limpo full-screen mobile
- [ ] Registro de pedágio pelo motorista
- [ ] Notificação quando abastecimento for validado pelo gestor
- [ ] Modo offline com sync quando voltar à conexão

## Related

- [Project Intent](project-intent.md)
- [Feature: Abastecimento](feature-abastecimento.md)
- [Decision: Auth e Roles](../decisions/003-auth-roles.md)
- [Decision: Driver Interface Approach](../decisions/008-driver-interface.md)
- [Pattern: Driver Route Guard](../knowledge/patterns/driver-route-guard.md)

## Status

- **Created**: 2026-06-23
- **Status**: Active (implementação em andamento — 2026-06-23)
