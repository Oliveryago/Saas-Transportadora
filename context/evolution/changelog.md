# Changelog

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
