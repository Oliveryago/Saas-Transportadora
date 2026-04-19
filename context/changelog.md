# Changelog

## [2026-04-19] — Feature: Cadastro de Motoristas
### Adicionado
- `context/intent/feature-motoristas.md`
- `context/decisions/007-motoristas.md`
- Escopo: Estruturação inicial do módulo de Motoristas (`/drivers`), incluindo serviços de OCR mockado, hooks de CRUD e esquema de banco de dados multi-tenant.

## [2026-04-18] — Feature: Fuel Updates
### Adicionado
- `context/intent/feature-fuel-updates.md`
- `context/decisions/006-fuel-updates.md`
- Escopo: Adição de customização de `date` nos abastecimentos retroativos, integração do consumo e custos de Arla 32 sem afetar médias de KM/L do Diesel e correção global da máscara de Reais.

## [2026-04-18] — Feature: Evolução para Escala Global

### Adicionado
- `context/intent/feature-global-scale-evolution.md` — Intent da feature de evolução global
- `context/decisions/005-global-scale-evolution.md` — ADR: decisões técnicas para as 10 áreas de evolução
- Escopo: Performance, PhotoUpload universal, QR Code, Dashboard completo, Relatórios, Documentos PDF, Mobile/PWA, Notificações em tempo real, Segurança e Navegação

### Dependências planejadas
- `@zxing/library` — leitura de QR/barcode
- `jspdf` + `jspdf-autotable` — geração de PDFs
- `xlsx` (SheetJS) — exportação Excel
- `recharts` — gráficos no dashboard e relatórios

## [2026-03-21] — Feature: Alerta de Troca de Óleo via KM do Abastecimento

### Adicionado
- `context/intent/feature-oil-alert-fuel-km.md` — Intent da feature
- `context/decisions/004-oil-alert-fuel-km.md` — ADR: usar KM do abastecimento nos alertas
- Alertas de troca de óleo agora baseados no KM real do último abastecimento

## [2026-03-21] — Feature: SuperAdmin Tenant Switching (Impersonação)

### Adicionado
- `context/decisions/003-superadmin-tenant-switching.md` — ADR: Impersonação de tenant via override no AuthContext
- Tenant override no `AuthContext` — `impersonateTenant()`, `stopImpersonation()`, `isImpersonating`
- Banner de impersonação na `Sidebar` e no `Dashboard`
- Ao clicar em empresa no painel SuperAdmin, redireciona para o Dashboard com dados da empresa

## [2026-02-24] — Feature Update: SuperAdmin / Multi-Tenant RBAC

### Adicionado
- `context/intent/feature-superadmin.md` — Intent da feature SuperAdmin com modelo multi-tenant e perfis de acesso
- `context/intent/project-intent.md` — Intent geral do projeto
- `context/decisions/001-multitenant-rbac.md` — **NOVA** decisão técnica: Multi-Tenant shared database + RBAC com RLS no Supabase
- `context/decisions/002-auth-rbac-update.md` — **ATUALIZAÇÃO** da decisão de autenticação/autorização para suportar múltiplos papéis e contexto de empresa

### Mudanças documentadas
- Reorganização da feature SuperAdmin para suportar claramente o modelo multiempresa
- Definição de 4 perfis: `superadmin`, `admin`, `manager`, `driver`
- Isolamento de dados entre empresas via RLS (Row Level Security) no Supabase
- Fluxo do motorista: lançamento operacional + foto da nota fiscal
- Expansão do `AuthContext` com helpers de role (`isAdmin`, `isDriver`, `isManager`)
- Proteção de rotas por role (`allowedRoles` no `ProtectedRoute`)
