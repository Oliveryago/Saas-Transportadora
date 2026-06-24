# Decision: Tech Stack

## Context

Projeto SaaS de gestão de frota para transportadoras brasileiras. Precisa de desenvolvimento rápido, deploy fácil, suporte a multi-tenant, armazenamento de arquivos (fotos de notas fiscais, CNH) e autenticação segura.

## Decision

**React 18 + TypeScript + Vite + Supabase + TailwindCSS**

- **React 18** com Suspense e lazy loading por rota
- **TypeScript** para tipagem completa do domínio
- **Vite** como bundler (build rápido, HMR)
- **Supabase** como BaaS: PostgreSQL, Auth, Storage, Realtime
- **TailwindCSS** para estilização utility-first
- **React Router v7** para roteamento client-side
- **Recharts** para gráficos do dashboard financeiro
- **jsPDF + jspdf-autotable** para exportação de relatórios PDF
- **xlsx** para exportação Excel
- **Tesseract.js** para OCR de CNH no browser
- **@zxing/library** para leitura de QR Code
- **Lucide React** para ícones
- **Deploy**: Vercel (CI/CD automático via GitHub)

## Rationale

- Supabase elimina a necessidade de backend próprio com RLS (Row Level Security) para isolamento multi-tenant
- Vite oferece DX superior ao CRA com build significativamente mais rápido
- TypeScript garante segurança de tipos em um domínio complexo (múltiplos tipos de registro)
- TailwindCSS permite prototipagem rápida com design consistente
- Vercel + GitHub = zero-config CI/CD com preview deployments

## Alternatives Considered

- **Next.js**: Considerado mas descartado pois o app é 100% client-side SPA sem necessidade de SSR/SSG
- **Firebase**: Alternativa ao Supabase, mas PostgreSQL + SQL nativo do Supabase é mais adequado para queries relacionais complexas da frota
- **Prisma + Express**: Backend próprio adicionaria complexidade desnecessária para o MVP

## Outcomes

Stack se mostrou adequada para o domínio. RLS do Supabase garantiu isolamento multi-tenant sem código adicional. Tesseract.js para OCR funciona mas é lento em mobile — pode ser substituído por API externa no futuro.

## Related

- [Project Intent](../intent/project-intent.md)
- [Decision: Multi-Tenant RBAC](002-multitenant-rbac.md)

## Status

- **Created**: 2026-06-23 (Phase: Intent — retroativo)
- **Status**: Accepted
- **Note**: Documentado a partir do package.json e estrutura existente
