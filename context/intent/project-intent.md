# Project Intent: SaaS Fleet Manager para Transportadoras

## What

Sistema SaaS multi-tenant de gestão operacional para empresas de transporte rodoviário. Permite controlar toda a operação da frota: abastecimentos, manutenções, documentação de motoristas, custos financeiros e relatórios gerenciais.

## Why

Transportadoras operam com frotas grandes e precisam de controle centralizado sobre custos operacionais (combustível, manutenção, pneus, pedágios), conformidade documental (CNH, seguros) e visibilidade gerencial. O sistema substitui planilhas e processos manuais por uma plataforma digital acessível de qualquer dispositivo.

## Current State

Plataforma funcional e deployada na Vercel com múltiplos módulos operacionais implementados. Multi-tenant com RBAC (Role-Based Access Control). Motoristas acessam via 4G pelo celular para lançar dados em campo.

## Current Features

- **Autenticação e RBAC** — Login, roles (driver/manager/admin/superadmin), sessão com timeout
- **Dashboard** — Métricas consolidadas, alertas de troca de óleo, visão financeira
- **Frota (Fleet)** — Cadastro de veículos e implementos (carretas)
- **Abastecimento (Fuel)** — Registro de combustível com foto de nota, Arla 32, descontos
- **Manutenção** — Ordens de serviço, peças, valores
- **Troca de Óleo** — Alertas por KM e data
- **Troca de Pneus** — Histórico e próxima troca por KM
- **Lavagem** — Registro de lavagens por tipo
- **Pedágios (Tolls)** — Lançamento de pedágios por viagem/UF
- **Estacionamento (Parking)** — Controle de estacionamento
- **Rodízio (Rotation)** — Controle de rodízio de pneus
- **Seguros (Insurance)** — Apólices e vencimentos
- **Sinistros (Accidents)** — Registro de acidentes
- **Motoristas (Drivers)** — Cadastro com OCR de CNH, vínculo com veículo
- **Fornecedores (Suppliers)** — Cadastro de postos, oficinas, etc.
- **Financeiro** — Dashboard financeiro consolidado
- **Relatórios** — Exportação PDF/Excel
- **SuperAdmin** — Painel para gestão de todos os tenants
- **Interface Motorista** — Telas mobile-first para registro em campo (em implementação)

## Status

- **Created**: 2026-06-23 (Phase: Intent — retroativo)
- **Status**: Active
- **Note**: Documentado a partir de codebase existente

## Related

- [Decision: Tech Stack](../decisions/001-tech-stack.md)
- [Decision: Multi-Tenant RBAC](../decisions/002-multitenant-rbac.md)
- [Decision: Auth e Roles](../decisions/003-auth-roles.md)
- [Feature: Abastecimento](feature-abastecimento.md)
- [Feature: Motorista Interface](feature-motorista-interface.md)
- [Feature: SuperAdmin](feature-superadmin.md)
