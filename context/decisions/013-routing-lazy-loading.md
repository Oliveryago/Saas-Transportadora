# Decision: Rotas Lazy Loaded no React Router

## Context

Com o aumento no número de módulos no SaaS (Frota, Manutenção, Combustível, Pedágios, Pneus, Relatórios, etc.), o bundle principal do React estava ficando pesado. Isso resultava em tempos de carregamento (TTFB e TTI) demorados, o que é especialmente crítico para os motoristas acessando o sistema via rede 3G/4G no campo.

## Decision

Utilizar o `React.lazy` combinado com `Suspense` em nível de rota usando o `React Router DOM`. 
Cada página de módulo principal em `src/pages/*` é importada sob demanda e agrupada no componente `LazyPage` com um `PageSkeleton` de fallback.

## Rationale

- Code Splitting no nível da rota quebra a aplicação em pedaços (chunks) menores.
- O navegador do usuário só baixa o Javascript e o CSS da página que ele efetivamente acessar.
- O tempo inicial de load do `App.tsx` cai drasticamente, pois ele não faz o parse de módulos complexos de gráficos (recharts) ou exportação de PDF (jspdf) logo no início.

## Alternatives Considered

- Carregar tudo sincronicamente: Descartado por conta de lentidão (o app possui muitas dependências pesadas como jspdf, zxing e recharts).

## Outcomes

- A página de login e a de motorista agora carregam quase instantaneamente, independente do tamanho total da aplicação.
- A experiência de navegação entre módulos possui uma sutil tela de Skeleton.

## Related

- [Project Intent](../intent/project-intent.md)
- [Pattern: Lazy Loading Routes](../knowledge/patterns/lazy-loading-routes.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Accepted
- **Note**: Decisão extraída da implementação do `App.tsx`
