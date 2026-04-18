# Project Intent — SaaS Transportadora

**Projeto:** SaaS de Gestão para Transportadoras  
**Data:** 2026-02-24

## Objetivo

Sistema SaaS multi-empresa para gestão operacional de transportadoras, permitindo o controle de frota, combustível, manutenção, motoristas e todas as operações logísticas de múltiplas empresas a partir de uma única plataforma.

## Stack Técnica

- **Frontend:** React + TypeScript + Vite
- **Estilo:** Tailwind CSS
- **Backend / Auth / DB:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Roteamento:** React Router DOM

## Modelo de Negócio

- SaaS vendido para múltiplas empresas (transportadoras)
- Cada empresa tem seu próprio conjunto de dados (multi-tenant)
- Criador do sistema tem acesso global (SuperAdmin)

## Módulos Implementados

| Módulo | Rota | Descrição |
|---|---|---|
| Dashboard | `/` | Visão geral por empresa |
| Frota | `/fleet` | Gestão de veículos e implementos |
| Combustível | `/fuel` | Registro de abastecimentos |
| Manutenção | `/maintenance` | Ordens de serviço |
| Troca de Óleo | `/oil-change` | Alertas e registros |
| Fornecedores | `/suppliers` | Cadastro de fornecedores |
| Estacionamento | `/parking` | Controle de estacionamento |
| Troca de Pneus | `/tire-change` | Registros de pneus |
| Lavagem | `/washing` | Registros de lavagem |
| Pedágios | `/tolls` | Controle de pedágios |
| Rotação | `/rotation` | Controle de rotação |
| Seguro | `/insurance` | Apólices de seguro |
| Acidentes | `/accidents` | Registro de sinistros |
| Configurações | `/settings` | Configurações da empresa |
| SuperAdmin | `/superadmin` | Gestão global do sistema |

## Related

- [Feature: SuperAdmin](feature-superadmin.md)
- [Feature: Alerta via KM Abastecimento](feature-oil-alert-fuel-km.md)
- [Decision: Multi-Tenant RBAC](../decisions/001-multitenant-rbac.md)
- [Decision: Auth e Autorização](../decisions/002-auth-rbac-update.md)
- [Decision: SuperAdmin Tenant Switching](../decisions/003-superadmin-tenant-switching.md)
- [Decision: Alerta via KM Abastecimento](../decisions/004-oil-alert-fuel-km.md)
- [Feature: Evolução para Escala Global](feature-global-scale-evolution.md)
- [Decision: Evolução para Escala Global](../decisions/005-global-scale-evolution.md)
