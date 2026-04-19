# Feature: Cadastro de Motoristas

## Visão Geral

Implementação de um módulo dedicado para gestão de motoristas no SaaS. O objetivo é permitir o cadastro completo de profissionais, incluindo dados da CNH, com suporte a automação via OCR para agilizar o preenchimento e reduzir erros humanos.

## Problema e Motivação

Atualmente, o sistema possui referências a `driver_id` em diversas tabelas (Combustível, Sinistros, etc.), mas não possui um local centralizado para gerenciar os dados desses motoristas (perfil, categoria da CNH, validade de documentos). O preenchimento manual desses dados é propenso a erros e lento.

## Critérios de Aceite

- [ ] Formulário de cadastro de motorista funcional.
- [ ] Campos obrigatórios: Nome Completo, CPF.
- [ ] Campos de documento: Número da CNH, Categoria, Validade.
- [ ] Campo de endereço.
- [ ] Componente de Upload de Imagem/PDF da CNH.
- [ ] Integração com serviço de OCR (inicialmente mockado no front-end).
- [ ] Isolamento de dados por `tenant_id` (Multi-tenant).
- [ ] Políticas de RLS configuradas no Supabase.

## Arquitetura Sugerida

- **Banco de Dados**: Tabela `drivers` independente.
- **Serviço de OCR**: Camada de serviço em `src/services/motorista/` preparada para integração com API externa futuramente.
- **Hooks**: `useDrivers` para abstração da lógica de CRUD com Supabase.
- **Componentes**: Formulário especializado com preview de OCR.

## Related

- [Project Intent](project-intent.md)
- [Decision: Módulo de Motoristas e OCR](../decisions/007-motoristas.md)
