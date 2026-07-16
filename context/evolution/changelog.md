# Changelog

## [2026-07-16] — Implementação do Módulo de Estoque

**Alterações:**
- Criação das tabelas `itens_estoque`, `movimentacoes_estoque`, `manutencao_itens` e `fornecedores` (com RLS via `tenant_id`).
- Criação dos tipos `ItemEstoque`, `MovimentacaoEstoque` e inputs em `src/types/estoque.ts`.
- Hook `useEstoque` implementado para CRUD e cálculo de saldo e custo médio.
- Criação da página `/estoque` e do modal `NovaEntradaModal` em `src/components/estoque/NovaEntradaModal.tsx`.
- Rotas atualizadas no `App.tsx` (com lazy loading) e item adicionado à Sidebar.

## [2026-07-15] — Expansão do Context Mesh

**Alterações:**
- Criação de features retroativas para cobrir 100% dos módulos do sistema: Frota, Manutenção, Troca de Pneus, Lavagem, Pedágios, Estacionamento, Rodízio, Seguros, Sinistros, Fornecedores, Dashboard, Financeiro, Relatórios e Configurações.
- Adição de decisões arquiteturais: PWA Mobile (011), Relatórios PDF Client-Side (012), Rotas Lazy Loading (013).
- Adição de padrões estruturais: Auth Context, Lazy Loading Routes, Session Timeout, Rate Limit.
- Atualização do `project-intent.md` mapeando os arquivos recém-criados.

## [2026-07-05] — Bugfix: Upload de Foto no PhotoUpload (Abastecimento)

**Problema:** Foto do comprovante fiscal não persistia após salvar o abastecimento.
**Causa:** Fluxo de dois passos no `PhotoUpload.tsx` (selecionar → confirmar) permitia que o form fosse submetido antes do upload ocorrer.
**Correção:** `src/components/shared/PhotoUpload.tsx` — upload imediato ao selecionar arquivo. Removido step intermediário de confirmação.
**Impacto:** Afeta todos os módulos que usam `PhotoUpload` (abastecimento, manutenção, motoristas) — UX melhorada em todos eles.

## [2026-07-04] — Bugfix: Correção no Modal de Abastecimento (Ajuste de Altura e Bug do KM)

**Alterações:**
- `src/components/fuel/FuelModal.tsx` — Redução da altura máxima da janela do modal com rolagem interna, correção do bug onde o KM não era inserido nem atualizado (adicionando campo de input de KM e exibição do KM atual na UI).

## [2026-06-23] — Context Mesh Adicionado + Interface do Motorista

### Context Mesh
Documentação Context Mesh adicionada ao projeto para orientar agentes de IA e desenvolvedores.

### Interface do Motorista (Novo)

**Páginas criadas:**
- `src/pages/DriverHome.tsx` — Home mobile-first com saudação, card do veículo, resumo de abastecimentos
- `src/pages/DriverFuel.tsx` — Formulário simplificado de abastecimento (motorista no campo)
- `src/pages/DriverHistory.tsx` — Histórico de abastecimentos com fotos

**Componentes criados:**
- `src/components/DriverRoute.tsx` — Guard de rota para role "driver" sem MainLayout

**Alterações:**
- `src/App.tsx` — Rotas `/driver`, `/driver/fuel`, `/driver/history` adicionadas
- `src/pages/Login.tsx` — Redirect para `/driver` após login se role for "driver"

### Features Documentadas (Context Mesh)

- Abastecimento (Fuel)
- Interface do Motorista
- SuperAdmin (já existia)

### Decisões Documentadas

- `001-tech-stack.md` — React + Vite + Supabase + TailwindCSS
- `008-driver-interface.md` — Rota separada sem MainLayout para motoristas

### Padrões Identificados

- `supabase-crud-hook.md` — Hook CRUD com tenant_id isolation
- `driver-route-guard.md` — Guard de rota para motorista
- `photo-upload.md` — Upload de foto via usePhotoUpload

---

*Context Mesh adicionado: 2026-06-23*
*Estado documentado: Plataforma funcional na Vercel com 19+ módulos*
