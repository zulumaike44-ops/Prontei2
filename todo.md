# Project TODO — Prontei

- [x] 9A — Estrutura de pastas e configuração base
- [x] 9B — Tema visual (cores terracota/creme, fontes Outfit+Source Sans 3, CSS tokens)
- [x] 9C — Schema Drizzle com tabelas do MVP (adaptado do Prisma aprovado)
- [x] 9D — Autenticação com Manus OAuth + proteção de rotas
- [x] 9E — Tenant context e middleware multi-tenant
- [x] 9F — Módulo establishment funcional (CRUD + telas + onboarding)
- [x] 9G — Seed e dados mínimos de desenvolvimento
- [x] 9H — Landing page e tela de login
- [x] Testes vitest para rotas críticas (14 testes passando)
- [x] 9I — Diagnóstico da divergência Prisma vs Drizzle
- [x] 9J — Comparação objetiva Prisma vs Drizzle no contexto do projeto
- [x] 9K — Recomendação final (manter Drizzle ou alinhar para Prisma)
- [x] 9L — Plano de correção (6 ações definidas, nenhuma bloqueante)
- [x] Registrar decisão de stack (canônica vs adaptada) em DECISAO-STACK.md
- [x] 10A — Backend: queries de profissionais em server/db.ts
- [x] 10B — Backend: rotas tRPC para CRUD de profissionais
- [x] 10C — Backend: validações Zod e proteção multi-tenant
- [x] 10D — Frontend: tela de listagem de profissionais no dashboard
- [x] 10E — Frontend: formulário de criação de profissional
- [x] 10F — Frontend: formulário de edição de profissional
- [x] 10G — Frontend: soft delete (desativar) profissional
- [x] 10H — Testes vitest para rotas de profissionais (16 testes passando)
- [x] 10I — Navegação: adicionar link de Profissionais no sidebar

## ETAPA 11 — Módulo de Serviços
- [x] 11A — Verificar tabelas services e professional_services no schema Drizzle (já existem)
- [x] 11B — Backend: queries CRUD de serviços em server/db.ts
- [x] 11B — Backend: queries de vínculo profissional-serviço em server/db.ts
- [x] 11B — Backend: rotas tRPC para serviços (list, get, create, update, delete)
- [x] 11B — Backend: rotas tRPC para vínculos (list, set, remove)
- [x] 11C — Validações Zod para serviços e vínculos
- [x] 11D — Frontend: tela de listagem de serviços (/services)
- [x] 11D — Frontend: formulário de criação/edição de serviço
- [x] 11D — Frontend: soft delete de serviço
- [x] 11E — Frontend: seção de vínculos profissional-serviço
- [x] 11E — Frontend: customização de preço/duração por profissional
- [x] 11F — Testes vitest para rotas de serviços
- [x] 11F — Testes vitest para rotas de vínculos
- [x] 11F — Testes de isolamento multi-tenant
- [x] 11G — Validação final e checkpoint

## ETAPA 12 — Módulo de Horários de Funcionamento (working_hours)

- [x] 12A — Verificar tabela working_hours no schema Drizzle (já existe com todos os campos)
- [x] 12B — Backend: queries de working_hours em server/db.ts
- [x] 12B — Backend: regras de negócio (start < end, break dentro do expediente, sem duplicidade)
- [x] 12C — Backend: rotas tRPC (list por profissional, save semana completa)
- [x] 12D — Backend: validações Zod para grade semanal
- [x] 12E — Frontend: seção de horários na tela de profissionais
- [x] 12E — Frontend: grade semanal com toggle, hora início/fim, intervalo opcional
- [x] 12E — Frontend: botão salvar semana completa
- [x] 12F — Testes vitest para working_hours (17 testes passando)
- [x] 12F — Testes de isolamento multi-tenant
- [x] 12G — Validação final e checkpoint

## RENOMEAÇÃO — Concluída: Agiliza no Zap → Prontei

- [x] R1 — Diagnóstico: varredura completa de referências ao nome antigo (15 ocorrências em 11 arquivos)
- [x] R2 — Alterações no frontend (landing, dashboard, sidebar, onboarding, settings)
- [x] R3 — Alterações no backend (nenhuma referência encontrada no backend)
- [x] R4 — Alterações em documentação e testes (ideas.md, asset-urls.md, DECISAO-STACK.md, todo.md)
- [x] R5 — Validação final: 0 referências residuais em código visível, 75 testes passando, checkpoint salvo

## ETAPA 13 — Módulo de Bloqueios de Horário (blocked_times)

- [x] 13A — Verificar tabela blocked_times no schema Drizzle (adicionados title e isActive)
- [x] 13B — Decisões de negócio: sobreposição permitida, edição de antigos permitida, soft delete via isActive
- [x] 13B — Backend: queries CRUD de blocked_times em server/db.ts
- [x] 13C — Backend: rotas tRPC (list, get, create, update, delete) com filtros
- [x] 13D — Backend: validações Zod (title, datas, isAllDay, professionalId)
- [x] 13D — Backend: validação cross-tenant de professionalId
- [x] 13E — Frontend: tela de bloqueios (/blocked-times) com listagem e filtros
- [x] 13E — Frontend: formulário de criação/edição de bloqueio
- [x] 13E — Frontend: exclusão/desativação de bloqueio
- [x] 13E — Frontend: link no sidebar do dashboard
- [x] 13F — Testes vitest para blocked_times (24 testes passando, 99 total)
- [x] 13G — Validação final e checkpoint

## ETAPA 14 — Módulo de Clientes (customers)

- [x] 14A — Verificar/ajustar tabela customers no schema (adicionar normalizedPhone, phone notNull)
- [x] 14B — Decisão de negócio: rejeitar telefone duplicado com erro (opção A)
- [x] 14B — Estratégia de normalização: remover tudo exceto dígitos
- [x] 14C — Backend: queries CRUD de customers em server/db.ts
- [x] 14C — Backend: rotas tRPC (list, get, create, update, delete) com busca
- [x] 14D — Backend: validações Zod (name, phone, email, notes)
- [x] 14D — Backend: deduplicação por normalized_phone + establishment_id
- [x] 14D — Backend: proteção multi-tenant via resolveTenant
- [x] 14E — Frontend: tela de clientes (/customers) com listagem e busca
- [x] 14E — Frontend: formulário de criação/edição de cliente
- [x] 14E — Frontend: exclusão/desativação de cliente
- [x] 14E — Frontend: link Clientes no sidebar do dashboard
- [x] 14F — Testes vitest para customers (CRUD, deduplicação, multi-tenant, busca) — 30 testes, 129 total
- [x] 14G — Validação final e checkpoint

## ETAPA 15 — Motor de Disponibilidade + Agendamentos (appointments)

- [x] 15A — Verificar/ajustar tabela appointments no schema (customerId notNull)
- [x] 15B — Regras de negócio: validações de tenant, cálculo de duração/preço efetivos
- [x] 15C — Motor de disponibilidade: calcular slots livres (working_hours - break - blocked_times - appointments)
- [x] 15D — Backend: queries CRUD de appointments em server/appointmentDb.ts
- [x] 15D — Backend: rotas tRPC (list, get, create, updateStatus, cancel, count)
- [x] 15D — Backend: rota de availability (professionalId, serviceId, date)
- [x] 15E — Backend: detecção de conflito centralizada (hasOverlap + hasDateOverlap)
- [x] 15E — Backend: validações Zod e proteção multi-tenant
- [x] 15F — Frontend: tela de agendamentos (/appointments) com listagem e filtros
- [x] 15F — Frontend: fluxo de criação guiado (profissional → serviço → cliente → data → slot → confirmar)
- [x] 15F — Frontend: alteração de status e cancelamento
- [x] 15F — Frontend: link Agendamentos no sidebar do dashboard
- [x] 15G — Testes vitest para availability engine e appointments — 50 testes, 179 total
- [x] 15H — Validação final e checkpoint

## ETAPA 16 — Agenda Visual do MVP
- [x] 16A — Analisar contexto atual e definir escopo da agenda
- [x] 16B — Verificar endpoints existentes (appointment.list com filtros dateFrom/dateTo/professionalId)
- [x] 16C — Frontend: tela /dashboard/agenda com view DIA (lista cronológica)
- [x] 16C — Frontend: view SEMANA (agrupamento por dia)
- [x] 16C — Frontend: cores de status (pending, confirmed, cancelled, completed, no_show)
- [x] 16D — Frontend: filtro por profissional
- [x] 16D — Frontend: interações (abrir detalhes, alterar status, cancelar)
- [x] 16D — Frontend: rota e link no sidebar
- [x] 16E — Testes vitest para agenda (renderização, filtros, status, cancelamento, multi-tenant) — 23 testes, 202 total
- [x] 16F — Validação final e checkpoint

## ETAPA 17 — Dashboard Dinâmico do MVP
- [x] 17A — Analisar dashboard atual e definir escopo/métricas
- [x] 17B — Backend: criar endpoint dashboard.summary via tRPC (appointmentsToday, appointmentsThisMonth, activeProfessionals, activeServices, activeCustomers)
- [x] 17B — Backend: queries de contagem com isolamento multi-tenant
- [x] 17C — Frontend: conectar cards do dashboard a dados reais
- [x] 17C — Frontend: links rápidos nos cards (agenda, profissionais, serviços)
- [x] 17D — Frontend: estados de loading (skeleton) e vazio amigável
- [x] 17E — Testes vitest para dashboard dinâmico (contagens, multi-tenant) — 12 testes, 214 total
- [x] 17F — Validação final e checkpoint
