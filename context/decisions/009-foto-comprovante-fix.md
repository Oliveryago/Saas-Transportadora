# ADR 009 — Correção do Upload de Foto no Modal de Abastecimento

**Status:** Accepted  
**Data:** 2026-07-05  
**Feature:** [Bug: Foto do Comprovante Fiscal](../intent/bug-foto-comprovante-abastecimento.md)

---

## Contexto

A foto do comprovante fiscal no modal de abastecimento não persiste após salvar. O problema está no fluxo de UX do componente `PhotoUpload`: o usuário seleciona a foto, mas o upload só ocorre após clicar em um botão de confirmação (✓). Se o usuário vai direto para "Salvar" sem confirmar a foto, o estado `photos[]` ainda está vazio.

## Decisão

**Alterar o fluxo de upload para ser imediato (sem etapa de confirmação).**

Ao invés de exibir um preview e exigir confirmação explícita com ✓, o upload para o Supabase Storage ocorre assim que o arquivo é selecionado pelo usuário, eliminando o estado intermediário de "preview não confirmado".

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **Upload imediato ao selecionar** ✅ | Simples, direto, sem estado perdido | Pode fazer upload desnecessário se usuário cancelar o form |
| Auto-confirmar antes do submit | Mantém preview; upload no submit | Complexidade: await assíncrono dentro do handleSubmit |
| Adicionar verificação no submit | Sem mudar UX | Require await durante loading, mais complexo |

## Motivo da Escolha

A abordagem de upload imediato é a mais robusta e simples. Como o `FuelModal` já chama `clearPhotos()` ao fechar sem salvar, fotos órfãs no Storage são um problema aceitável e já existente (qualquer upload cancelado deixa o arquivo no bucket). O ganho de UX (confiabilidade do salvamento) supera o custo de eventuais arquivos órfãos.

## Mudanças Técnicas

### `src/components/shared/PhotoUpload.tsx`
- Remover estado `previewUrl` e `previewFile`
- Remover o step de confirmação com botões ✓/✗
- Chamar `onUpload(file)` diretamente no `handleFileSelect`
- Mostrar barra de progresso imediatamente após seleção

### Arquivos Impactados
- `src/components/shared/PhotoUpload.tsx` — Remove passo de confirmação
- `src/components/fuel/FuelModal.tsx` — Nenhuma mudança necessária (já usa a URL corretamente)

## Consequências

- ✅ Foto sempre estará em `photos[]` quando o form for submetido
- ✅ UX mais simples — menos cliques
- ⚠️ Upload ocorre mesmo se o usuário cancelar o form (arquivos órfãos no bucket — comportamento já existente)
