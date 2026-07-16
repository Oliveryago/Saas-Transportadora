# Decision: Geração de Relatórios em PDF e Excel no Client-Side

## Context

Gestores de frota precisam compartilhar dados (comprovantes de abastecimento, faturamento, relatórios de custo) com contabilidade, clientes ou outros setores que não possuem acesso direto ao sistema. A infraestrutura backend atual (Supabase puro) carece de servidores Node dedicados para rodar rotinas pesadas de geração de PDF.

## Decision

A geração de arquivos PDF e Excel ocorre 100% no client-side do navegador usando bibliotecas Javascript.

Bibliotecas escolhidas:
- **PDF**: `jspdf` + `jspdf-autotable`
- **Excel**: `xlsx`

## Rationale

- Evita a necessidade de gerenciar um servidor Node (ex: Vercel serverless functions) dedicado à geração de documentos, contornando o limite de timeout e memória severos no Vercel (Hobby).
- As bibliotecas `jspdf` e `xlsx` lidam muito bem com dados tabulares e suportam adição de logo e estilo de cabeçalho diretamente pelo navegador.
- Reduz custos e tráfego de rede, uma vez que o cliente já possui os dados renderizados localmente para exibição.

## Alternatives Considered

- **Server-side (Puppeteer / wkhtmltopdf)**: Seria a abordagem ideal para relatórios com visual muito complexo, mas adicionaria alto custo de infraestrutura e fugiria do escopo de "zero-config server".
- **Bibliotecas pagas**: Rejeitado devido à disponibilidade de boas alternativas open source.

## Outcomes

- Relatórios fluem rapidamente. A responsabilidade por uso de processamento e memória é transferida ao dispositivo do usuário.

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: Relatórios e Exportação](../intent/feature-relatorios.md)

## Status

- **Created**: 2026-07-15 (Phase: Intent — retroativo)
- **Status**: Accepted
- **Note**: Inferido a partir do `package.json` e arquivo `documentGenerator.ts`
