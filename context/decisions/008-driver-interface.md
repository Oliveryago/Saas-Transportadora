# Decision: Driver Interface — Rota Separada sem MainLayout

## Context

Motoristas de transportadora usam o sistema exclusivamente pelo celular 4G em campo. O layout padrão do app (com Sidebar desktop + BottomNav) é inadequado para o fluxo de trabalho do motorista, que precisa de uma interface rápida, sem distrações, otimizada para toque em tela pequena.

## Decision

Criar rotas `/driver/*` com um `DriverRoute` guard dedicado que:
1. Verifica role `"driver"` — outros roles são redirecionados para `/`
2. Renderiza os children **sem** o `MainLayout` (sem Sidebar, sem BottomNav)
3. Usa layout dark full-screen com gradiente dark para melhor legibilidade outdoor

As páginas do motorista são:
- `/driver` — Home com resumo e ação principal
- `/driver/fuel` — Formulário de abastecimento simplificado  
- `/driver/history` — Histórico de abastecimentos

Após login, se o role for `"driver"`, o `Login.tsx` redireciona para `/driver` (não para `/`).

## Rationale

- Separar completamente o layout evita que o motorista veja menus/funcionalidades irrelevantes
- Dark mode é mais fácil de ler ao ar livre (brilho do sol)
- Formulário simplificado remove campos desnecessários para o motorista (preço/litro calculado, não digitado)
- `capture="environment"` no input de foto abre direto a câmera traseira do celular

## Alternatives Considered

- **Reutilizar MainLayout com itens filtrados por role**: Mais simples, mas ainda mostraria a sidebar vazia/incompleta no desktop e seria visualmente confuso
- **PWA separado**: Mais isolamento, mas duplicaria código e complicaria o deploy

## Outcomes

A ser documentado após testes com motoristas reais.

## Related

- [Feature: Interface do Motorista](../intent/feature-motorista-interface.md)
- [Decision: Auth e Roles](003-auth-roles.md)
- [Pattern: Driver Route Guard](../knowledge/patterns/driver-route-guard.md)

## Status

- **Created**: 2026-06-23
- **Status**: Accepted
