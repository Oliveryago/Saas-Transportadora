# Decision: PWA e Suporte Mobile Offline

## Context

Motoristas da frota precisam lançar despesas de abastecimento e outras informações operacionais diretamente do celular enquanto estão em trânsito. A conectividade de rede na estrada no Brasil frequentemente é instável ou inexistente, e o processo de login e carregamento inicial de uma SPA padrão pode frustrar o uso contínuo.

## Decision

Utilizar `vite-plugin-pwa` para transformar a aplicação web em um Progressive Web App (PWA).
- Configuração para permitir instalação via "Add to Home Screen".
- Service Workers configurados com estratégias de cache para assets estáticos e fallback offline.

## Rationale

- Uma abordagem PWA permite entregar uma experiência mobile "app-like" sem o custo (tempo, submissão a lojas e manutenção) de desenvolver apps nativos (React Native/Flutter).
- É nativamente suportado pelo Vite via `vite-plugin-pwa`.
- Garante acesso mais rápido nas aberturas subsequentes.

## Alternatives Considered

- **App Nativo / React Native**: Rejeitado pelo escopo e tempo de manutenção. Uma codebase baseada em web atende os motoristas e gestores simultaneamente.

## Outcomes

- A aplicação é instalável em Android e iOS.
- Melhor experiência do usuário final e redução das reclamações de "demora para abrir" devido à melhoria do cache.

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: Interface do Motorista](../intent/feature-motorista-interface.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Accepted
- **Note**: Documentado a partir das dependências do package.json (vite-plugin-pwa)
