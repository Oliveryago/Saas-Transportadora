# Decision: Módulo de Motoristas e OCR

## Contexto

A expansão do sistema exige uma gestão profissional dos motoristas da frota. Precisamos de uma estrutura que suporte o cadastro de dados pessoais e documentais, além de preparar o terreno para automação via OCR (Optical Character Recognition) de CNHs, visando escalabilidade e melhoria da UX para o usuário final (donos de transportadoras e gestores).

## Decisões

1. **Stack e Padrão**: Manter o projeto em **Vite + React + Supabase**. Não migrar para Next.js neste momento para manter a consistência e velocidade de entrega.
2. **Estrutura de Dados**: Criar uma tabela dedicada `drivers` no Supabase. Não utilizar a tabela de Auth `users` para dados de motoristas que não possuem acesso direto ao sistema como usuários (embora motoristas possam ser usuários, o "perfil de motorista" deve ser independente).
3. **Multi-tenancy**: Implementar o isolamento de dados via `tenant_id` em todos os níveis (Banco, API Client e UI).
4. **Camada de Serviço OCR**: Implementar um `ocrService` em `src/services/motorista/` que inicialmente retorna dados mockados, facilitando a transição futura para uma API real (ex: Supabase Edge Functions ou API de Terceiros).
5. **UI**: Criar um componente de formulário especializado (`MotoristaForm`) que suporte upload e gatilho de leitura OCR.

## Racional

- **Separation of Concerns**: Isolar a lógica de OCR em um serviço permite trocar o provedor de leitura sem alterar a UI.
- **Multitenant RLS**: Garante que cada empresa gerencie apenas seus próprios motoristas seguindo a arquitetura padrão do sistema.
- **Vite Consistency**: Evita a complexidade de uma migração parcial para Next.js agora, mantendo o ecossistema atual.

## Alternativas Consideradas

- **Extensão do Perfil de Usuário**: Rejeitada pois nem todo motorista cadastrado será um usuário logado no sistema.
- **Next.js API Routes**: Rejeitada para priorizar a consistência com a estrutura de cliente Supabase atual do projeto Vite.

## Status

**Proposed** (Aguardando implementação da estrutura base)

## Related

- [Project Intent](../intent/project-intent.md)
- [Feature: Cadastro de Motoristas](../intent/feature-motoristas.md)
- [Decision: Multi-Tenant RBAC](001-multitenant-rbac.md)
