# Project Intent: SaaS Fleet Manager para Transportadoras

## What

Sistema SaaS multi-tenant de gestão operacional para empresas de transporte rodoviário. Permite controlar toda a operação da frota: abastecimentos, manutenções, documentação de motoristas, custos financeiros e relatórios gerenciais.

## Why

Transportadoras operam com frotas grandes e precisam de controle centralizado sobre custos operacionais (combustível, manutenção, pneus, pedágios), conformidade documental (CNH, seguros) e visibilidade gerencial. O sistema substitui planilhas e processos manuais por uma plataforma digital acessível de qualquer dispositivo.

## Current State

Plataforma funcional e deployada na Vercel com múltiplos módulos operacionais implementados. Multi-tenant com RBAC (Role-Based Access Control). Motoristas acessam via 4G pelo celular para lançar dados em campo.

## Current Features

- **Autenticação e RBAC** — Login, roles (driver/manager/admin/superadmin), sessão com timeout
- **Dashboard Operacional** — [Feature: Dashboard](feature-dashboard.md)
- **Frota (Fleet)** — [Feature: Gestão de Frota](feature-frota.md)
- **Abastecimento (Fuel)** — [Feature: Abastecimento](feature-abastecimento.md), [Feature: Dupla Bomba](feature-dupla-bomba.md)
- **Manutenção** — [Feature: Manutenção](feature-manutencao.md)
- **Troca de Óleo** — [Feature: Troca de Óleo](feature-troca-oleo.md)
- **Troca de Pneus** — [Feature: Troca de Pneus](feature-pneus.md)
- **Lavagem** — [Feature: Lavagem](feature-lavagem.md)
- **Pedágios (Tolls)** — [Feature: Pedágios](feature-pedagios.md)
- **Estacionamento (Parking)** — [Feature: Estacionamento](feature-estacionamento.md)
- **Rodízio (Rotation)** — [Feature: Rodízio](feature-rodizio.md)
- **Seguros (Insurance)** — [Feature: Seguros](feature-seguros.md)
- **Sinistros (Accidents)** — [Feature: Sinistros](feature-sinistros.md)
- **Motoristas (Drivers)** — [Feature: Motoristas](feature-motoristas.md), [Feature: Motorista Interface](feature-motorista-interface.md)
- **Fornecedores (Suppliers)** — [Feature: Fornecedores](feature-fornecedores.md)
- **Financeiro** — [Feature: Dashboard Financeiro](feature-financeiro.md)
- **Relatórios** — [Feature: Relatórios](feature-relatorios.md)
- **SuperAdmin** — [Feature: SuperAdmin](feature-superadmin.md)
- **Configurações** — [Feature: Configurações](feature-configuracoes.md)

## Status

- **Created**: 2026-06-23 (Phase: Intent — retroativo)
- **Status**: Active
- **Note**: Documentado a partir de codebase existente e atualizado 2026-07-15.

## Related

- [Decision: Tech Stack](../decisions/001-tech-stack.md)
- [Decision: Multi-Tenant RBAC](../decisions/002-multitenant-rbac.md)
- [Decision: Auth e Roles](../decisions/003-auth-roles.md)
