# Feature: Evolução para Escala Global

**Status:** Planejado  
**Criado em:** 2026-04-18  

## Objetivo

Elevar o SaaS de gestão de transportadoras para nível global — suportando milhares de usuários simultâneos com recursos modernos de upload de fotos, leitura de QR Code, dashboard completo com gráficos, relatórios exportáveis, geração de documentos PDF, experiência mobile otimizada, notificações em tempo real e segurança aprimorada.

## Contexto

O sistema já está em produção com todos os módulos operacionais funcionando (Dashboard, Frota, Combustível, Manutenção, Troca de Óleo, Fornecedores, Estacionamento, Pneus, Lavagem, Pedágios, Rotação, Seguro, Acidentes, Configurações, SuperAdmin). A evolução é necessária para:
- Suportar crescimento de base de clientes (performance e escalabilidade)
- Agregar funcionalidades que clientes demandam (relatórios, documentos)
- Diferenciar competitivamente (QR Code, notificações em tempo real)
- Melhorar adoção por motoristas (experiência mobile, PWA)

## Escopo — 10 Áreas de Evolução

### 1. Performance e Escalabilidade
- React.lazy + Suspense em todas as páginas
- React.memo, useMemo, useCallback nos componentes pesados
- Paginação server-side (máx 50/página) + infinite scroll
- Debounce em buscas (300ms)
- Skeleton loading em todos os fetches
- Error boundary global e por módulo
- Service Worker para cache offline (PWA)
- Compressão de imagens e conversão WebP
- Queries otimizadas no Supabase (select fields específicos, índices)

### 2. Upload de Fotos Universal
- Componente `PhotoUpload.tsx` reutilizável (câmera, galeria, preview, compressão, WebP)
- Upload para Supabase Storage `{tenant_id}/{modulo}/{uuid}.webp`
- Barra de progresso, remoção com confirmação
- Suporte a múltiplas fotos (até 5), modo offline via IndexedDB
- Expansão para: Abastecimento, Manutenção, Pneus, Lavagem, Acidentes, Estacionamento, Pedágio, Seguro, Veículos

### 3. Leitura de QR Code
- Componente `QRCodeScanner.tsx` com @zxing/library
- Suporte: QR Code, Code 128, Code 39, EAN-13
- Feedback visual (moldura animada) e sonoro (beep)
- Fallback: digitação manual, timeout 30s
- Uso em: Veículos (QR único), Abastecimento, Manutenção, Fornecedores

### 4. Dashboard Completo
- Cards de métricas: veículos, motoristas, abastecimentos, custos, KM, consumo médio, alertas
- Gráfico 1: Custo por categoria (6 meses) — barras agrupadas
- Gráfico 2: Consumo médio por veículo — barras horizontais
- Gráfico 3: Abastecimentos por dia (mês) — linha com 2 eixos Y
- Mapa de alertas com urgência colorida
- Feed de atividade recente (20 últimas ações)

### 5. Módulo de Relatórios
- Custo por veículo, Consumo de combustível, Manutenções, Motoristas, Financeiro consolidado
- Filtros por período, veículo, motorista, tipo
- Exportação PDF (jsPDF + autotable) e Excel (SheetJS)
- Cabeçalho com logo, empresa, período

### 6. Geração de Documentos
- OS de Manutenção (PDF)
- Comprovante de Abastecimento (PDF)
- Relatório completo de Veículo com histórico (PDF)

### 7. Experiência Mobile
- Bottom navigation para motoristas (role: driver)
- Campos touch-friendly (min 44px)
- Pull to refresh, feedback háptico
- Modo offline para abastecimento
- PWA manifest completo + Add to Home Screen

### 8. Notificações em Tempo Real
- Supabase Realtime para eventos (abastecimento, alerta, acidente, seguro, novo usuário)
- Sino no header com badge, dropdown com 10 últimas
- Marcar como lida, link direto para o registro
- Notificação push do browser (com permissão)

### 9. Segurança
- Rate limiting frontend (10 submissões/min)
- Limite de upload 5MB
- Sanitização de campos de texto
- Audit log (ações sensíveis com before/after)
- Timeout de sessão (8h com aviso 5min antes)

### 10. Navegação e UX
- Badges de alerta na sidebar
- Busca global (Ctrl+K)
- Atalhos de teclado (Ctrl+N novo registro)
- Breadcrumb em páginas internas

## Critérios de Aceitação

- [ ] Todas as páginas carregam em < 3s em 4G
- [ ] Lazy loading implementado em todas as rotas
- [ ] Skeleton loading em todos os componentes com fetch
- [ ] PhotoUpload funcional em todos os módulos listados
- [ ] QR Code Scanner funciona em mobile e desktop
- [ ] Dashboard mostra todos os cards, gráficos e alertas
- [ ] 5 relatórios disponíveis com exportação PDF e Excel
- [ ] Documentos (OS, comprovante, relatório de veículo) gerados corretamente
- [ ] Bottom nav funciona para role driver no mobile
- [ ] Notificações em tempo real com sino e badge
- [ ] Audit log registra ações sensíveis
- [ ] Busca global encontra veículos, motoristas e registros
- [ ] PWA instalável com ícone e manifest

## Dependências

```bash
npm install @zxing/library jspdf jspdf-autotable xlsx recharts
npm install -D @types/jspdf
```

## Ordem de Implementação

1. Performance (lazy loading + skeleton) — impacto imediato
2. PhotoUpload universal — base para outros módulos
3. Dashboard reformulado — visibilidade do valor
4. Relatórios — pedido mais comum de clientes
5. QR Code Scanner — diferencial competitivo
6. Geração de documentos — elimina trabalho manual
7. Melhorias mobile — adoção por motoristas
8. Notificações em tempo real — equipe informada
9. Segurança — essencial para escala
10. Navegação e UX — polimento final

## Related

- [Project Intent](project-intent.md)
- [Decision: Evolução para Escala Global](../decisions/005-global-scale-evolution.md)
- [Feature: SuperAdmin](feature-superadmin.md)
- [Feature: Alerta via KM Abastecimento](feature-oil-alert-fuel-km.md)
