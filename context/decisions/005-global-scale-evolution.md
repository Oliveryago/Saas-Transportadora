# Decision: Evolução para Escala Global

**Status:** Aceita  
**Data:** 2026-04-18  

## Contexto

O SaaS de gestão de transportadoras está em produção com 15+ módulos funcionando. Para escalar para centenas/milhares de empresas simultaneamente e agregar funcionalidades demandadas pelos clientes, é necessária uma evolução significativa em 10 frentes: performance, upload de fotos, QR Code, dashboard, relatórios, documentos, mobile, notificações, segurança e navegação.

O sistema atual usa React + TypeScript + Vite + Tailwind + Supabase. Todas as evoluções devem manter a compatibilidade com o código existente e respeitar o modelo multi-tenant (tenant_id + RLS).

## Decisão

### 1. Performance — Code Splitting e Otimização de Queries

**Abordagem:** React.lazy + Suspense para code splitting por rota. React.memo, useMemo, useCallback para otimizar re-renders. Paginação server-side com `.range()` do Supabase (50 items/página). Skeleton loading com componentes reutilizáveis. Error boundaries por módulo.

**No Supabase:** Substituir `select("*")` por campos específicos. Criar índices compostos em `(tenant_id, created_at)` e `(tenant_id, vehicle_id)`. Usar realtime apenas no dashboard.

### 2. Upload de Fotos — Componente Universal com Supabase Storage

**Abordagem:** Componente `PhotoUpload.tsx` universal usando `<input type="file" accept="image/*" capture="environment">` para câmera nativa do celular. Compressão no browser com Canvas API (max 800KB, 85% qualidade). Conversão WebP via `canvas.toBlob('image/webp')`. Upload para Supabase Storage organizado em `{tenant_id}/{modulo}/{uuid}.webp`. IndexedDB como fallback offline.

**Biblioteca:** Nenhuma adicional — Canvas API nativo é suficiente para compressão e conversão.

### 3. QR Code — @zxing/library

**Abordagem:** Usar `@zxing/library` (BrowserMultiFormatReader) para leitura de câmera. Componente `QRCodeScanner.tsx` com feedback visual (overlay animado via CSS) e sonoro (Web Audio API para beep). Geração de QR Code por veículo usando canvas + dados em JSON (placa, modelo, tenant_id). Fallback de digitação manual.

### 4. Dashboard — Recharts para Gráficos

**Abordagem:** Instalar `recharts` para gráficos. Reformular `Dashboard.tsx` com cards de métricas no topo e gráficos (BarChart, LineChart, PieChart) abaixo. Dados agregados via queries no Supabase com `select` + filtros por período. Alerta map com cores por urgência (vermelho/amarelo/verde). Feed de atividade via tabela `activity_log`.

### 5. Relatórios — jsPDF + SheetJS

**Abordagem:** Novo módulo `/reports` com 5 relatórios pré-definidos. Filtros por período, veículo, motorista. Tabelas renderizadas no browser com componentes React. Exportação PDF via `jsPDF` + `jspdf-autotable` (formatação de tabelas). Exportação Excel via `xlsx` (SheetJS). Cabeçalho com dados da empresa.

### 6. Geração de Documentos — jsPDF no Browser

**Abordagem:** Serviço `documentGenerator.ts` que gera PDFs no browser usando jsPDF. Templates para: OS de Manutenção, Comprovante de Abastecimento, Relatório de Veículo. Preview em modal antes do download. Sem dependência de servidor para geração.

### 7. Mobile — PWA + Bottom Navigation

**Abordagem:** Adicionar `manifest.json` completo para PWA. Service Worker com `workbox` para cache offline. Bottom navigation condicional (visible apenas para `role === 'driver'` em viewport mobile). Pull to refresh via touch event handlers. Feedback háptico com `navigator.vibrate()`. Formulários com campos min-height 44px.

### 8. Notificações — Supabase Realtime + Browser Notifications

**Abordagem:** Hook `useNotifications.ts` que escuta channels do Supabase Realtime. Tabela `notifications` no banco (type, recipient_role, tenant_id, read, related_id). Componente `NotificationBell` no header com badge de não lidos. Dropdown com últimas 10. Notification API do browser para push (com `Notification.requestPermission()`).

### 9. Segurança — Rate Limiting + Audit Log

**Abordagem:** Rate limiting no frontend via contador em memória (10 submissões/minuto). Validação de tamanho de upload (5MB max via `file.size`). Sanitização de texto com regex (strip HTML/scripts). Audit log via tabela `audit_logs` (user_id, action, table_name, record_id, old_data, new_data, timestamp). Timeout de sessão via setInterval verificando último activity timestamp.

### 10. Navegação — Busca Global + Badges

**Abordagem:** Componente `GlobalSearch` com Ctrl+K shortcut. Busca em tabelas vehicles, users, e registros mais recentes. Badges na sidebar via contagem de alertas pendentes. Breadcrumb via React Router location parsing.

## Racional

- **React.lazy/Suspense** é nativo do React — sem dependências extras, suportado em produção
- **Recharts** é a lib de gráficos mais popular para React, boa performance com SVG
- **jsPDF + SheetJS** rodam no browser sem servidor — reduz custo de infraestrutura
- **@zxing/library** é a lib mais madura para leitura de códigos no browser
- **Supabase Realtime** já faz parte do stack — aproveitamos infraestrutura existente
- **Canvas API** é nativo do browser — compressão e conversão de imagem sem bibliotecas extras
- **PWA com Service Worker** permite instalar o app e usar offline — essencial para motoristas

## Alternativas Consideradas

1. **SSR com Next.js** — Exigiria migração completa do projeto. Custo/benefício não justifica para SPA com Supabase.
2. **React Native para mobile** — Duas codebases para manter. PWA é mais pragmático para MVP.
3. **Server-side PDF generation** — Exigiria backend dedicado para gerar PDFs. jsPDF no browser é suficiente e elimina custo de servidor.
4. **Firebase Cloud Messaging** para push notifications — Supabase Realtime já cobre o caso de uso e evita adicionar Firebase ao stack.
5. **Backend rate limiting** — Supabase edge functions poderiam implementar, mas rate limiting frontend é mais simples para o nível de proteção necessário neste estágio.
6. **React Query (TanStack Query)** para cache de dados — Excelente opção mas adiciona complexidade. Para esta fase, otimizar os hooks existentes com memoização é suficiente.

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: Evolução para Escala Global](../intent/feature-global-scale-evolution.md)
- [Decision: Multi-Tenant RBAC](001-multitenant-rbac.md)
- [Decision: Auth e Autorização](002-auth-rbac-update.md)
- [Decision: SuperAdmin Tenant Switching](003-superadmin-tenant-switching.md)
- [Decision: Alerta via KM Abastecimento](004-oil-alert-fuel-km.md)
