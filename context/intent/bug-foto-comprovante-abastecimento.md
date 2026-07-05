# Bug: Foto do Comprovante Fiscal não persiste no Abastecimento

**Status:** Identificado — Aguardando correção  
**Impacto:** Alto  
**Feature afetada:** Módulo de Abastecimento (`/fuel`)

---

## Descrição do Bug

O campo "Foto do Comprovante Fiscal" no modal de novo abastecimento permite ao usuário selecionar e pré-visualizar uma imagem, porém após clicar em "Salvar" e recarregar o sistema, a foto não aparece vinculada ao registro.

## Comportamento Esperado

1. Usuário abre o modal "Novo Abastecimento"
2. Clica em "Câmera" ou "Galeria" na seção "Foto do Comprovante Fiscal"
3. Seleciona uma imagem → aparece preview
4. Clica no botão ✓ para confirmar o upload → foto sobe para o Supabase Storage
5. Clica em "Salvar" → registro é gravado com `invoice_photo_url` preenchida
6. Após recarregar, a foto aparece vinculada ao registro no histórico

## Comportamento Atual

O upload da foto funciona visualmente (preview aparece, confirmação funciona), mas após salvar e recarregar:
- A coluna `invoice_photo_url` no banco de dados fica nula ou vazia
- A foto não aparece no histórico do registro

## Causa Raiz Identificada

**Problema 1 — Upload não confirmado antes do submit:**  
O componente `PhotoUpload.tsx` exige que o usuário clique no botão ✓ de confirmação após selecionar a imagem para que o upload real ocorra via `usePhotoUpload.uploadPhoto()`. Se o usuário seleciona a foto mas não confirma (ou a foto ainda está em estado de preview), o estado `photos[]` do hook fica vazio no momento do `handleSubmit`.

**Problema 2 — `invoice_photo_url` não está na coluna SELECT do hook:**  
O hook `useFuelRecords.ts` faz `.select("id, tenant_id, ..., is_full_tank, created_at, updated_at")` com colunas explícitas. A coluna `invoice_photo_url` **JÁ ESTÁ incluída** na query, então o problema de persistência está no fluxo de upload/confirmação, não na leitura.

**Problema 3 — Estado `photos` reiniciado no `useEffect`:**  
O `useEffect` no `FuelModal.tsx` chama `clearPhotos()` toda vez que o modal abre (quando `editingRecord` é null). Se o modal fechar e reabrir por qualquer motivo antes do submit, o estado das fotos é perdido.

## Impacto

- **Usuário:** Perde a foto mesmo após realizar todo o processo de upload
- **Administrador:** Registros ficam sem comprovante fiscal vinculado
- **Auditoria:** Impossível verificar notas fiscais dos abastecimentos

## Feature Relacionada

- [006-fuel-updates.md](../decisions/006-fuel-updates.md)
- [Decisão: 009-foto-comprovante-fix.md](../decisions/009-foto-comprovante-fix.md)
