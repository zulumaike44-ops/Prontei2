# Project TODO — Agiliza no Zap (Etapa 9)

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
