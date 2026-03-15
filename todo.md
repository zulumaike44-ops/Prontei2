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

## ETAPA 19 — Integração WhatsApp v1
- [x] 19A — Escopo e decisões do MVP (customer: opção B — criar automaticamente se não existir)
- [x] 19B — Schema: tabela whatsapp_settings (config por tenant)
- [x] 19B — Schema: tabela whatsapp_conversations (conversas tenant-scoped)
- [x] 19B — Schema: tabela whatsapp_messages (mensagens inbound/outbound)
- [x] 19B — db:push para aplicar schema
- [x] 19C — Backend: queries CRUD de whatsapp_settings em whatsappDb.ts
- [x] 19C — Backend: queries de conversations e messages
- [x] 19C — Backend: webhook POST /api/whatsapp/webhook (recebimento inbound)
- [x] 19C — Backend: webhook GET /api/whatsapp/webhook (verificação do provider)
- [x] 19C — Backend: rotas tRPC (getSettings, updateSettings, listConversations, getConversation, getMessages, reply, closeConversation)
- [x] 19D — Regra de vínculo: normalizar telefone → localizar customer → criar se não existir (implementado em whatsappWebhook.ts)
- [x] 19E — Resposta automática inicial (stub/mock de envio + registro outbound — sendWhatsappMessage é stub)
- [x] 19F — Frontend: página de configuração WhatsApp (/dashboard/whatsapp)
- [x] 19F — Frontend: lista de conversas (/dashboard/whatsapp/conversations)
- [x] 19F — Frontend: detalhe da conversa com mensagens e reply manual
- [x] 19F — Frontend: links no sidebar do dashboard
- [x] 19G — Testes vitest para módulo WhatsApp — 38 testes, 252 total
- [x] 19H — Validação final e checkpoint

## ETAPA 19.1 — Envio Real via Meta WhatsApp Cloud API
- [x] 19.1A — Substituir stub sendWhatsappMessage por chamada real à Meta Cloud API v21.0
- [x] 19.1B — Tratar erros de autenticação, configuração e rede no envio
- [x] 19.1C — Salvar external_message_id real retornado pela API
- [x] 19.1D — Validar webhook_verify_token no GET de verificação (busca no banco + fallback env)
- [x] 19.1E — Credenciais gerenciadas 100% pelo painel (whatsapp_settings no banco, sem env vars separadas)
- [x] 19.1F — Atualizar testes vitest — 261 testes passando (9 novos: validateSendCredentials + sendWhatsappMessage real)
- [x] 19.1G — Validação final, checkpoint e passo a passo de teste manual

## ETAPA W — Simplificação Total da Ativação do WhatsApp
- [x] W1 — Diagnóstico da UX atual (campos técnicos expostos ao usuário)

## ETAPA W2 — Embedded Signup (eliminar credenciais manuais)
- [x] W2.1 — Backend: endpoint whatsapp.getEmbeddedSignupConfig (retorna appId, configId, sdkVersion)
- [x] W2.2 — Backend: endpoint whatsapp.exchangeCode (code → access_token via Meta Graph API)
- [x] W2.3 — Backend: lógica integrada em exchangeCode (code exchange + fetch phone + save credentials)
- [x] W2.4 — Frontend: substituir dialog de credenciais por popup Meta Embedded Signup
- [x] W2.5 — Frontend: eliminar campos de credenciais (botão único + fallback manual avançado)
- [x] W2.6 — Frontend: fluxo clicar → popup Meta → autorizar → pronto
- [x] W2.7 — Segurança: META_APP_SECRET nunca exposto (só server-side em exchangeCode)
- [x] W2.8 — Testes vitest para Embedded Signup — 9 novos testes, 279 total passando
- [x] W2.9 — Validação final e checkpoint
- [x] W2 — Nova arquitetura: fluxo de conexão simplificado (Embedded Signup ready)
- [x] W2 — Backend: endpoints connect, disconnect, testConnection, getConnectionStatus, updateAutoReply, adminUpdateSettings
- [x] W2 — Backend: testConnection valida token via Meta API GET /v21.0/{phoneNumberId}
- [x] W3 — Frontend: nova tela /dashboard/whatsapp com 4 estados (não conectado/conectando/conectado/erro)
- [x] W3 — Frontend: esconder 100% dos campos técnicos do usuário final
- [x] W3 — Frontend: botão "Conectar WhatsApp" com fluxo guiado (dialog)
- [x] W3 — Frontend: botão "Testar conexão" no estado conectado
- [x] W3 — Frontend: botão "Desconectar" no estado conectado
- [x] W4 — Backend: captura automática de credenciais no callback (via connect mutation)
- [x] W5 — Segurança: getConnectionStatus nunca expor token/phoneNumberId/webhookToken
- [x] W5 — Segurança: getSettings removido, substituido por getConnectionStatus (sem dados sensíveis)
- [x] W6 — Testes vitest (estados, ocultação, multi-tenant, teste de conexão) — 270 testes passando
- [x] W7 — Validação final e checkpoint

## Configuração de Credenciais Meta (novo app)
- [x] Receber META_APP_ID, META_APP_SECRET e META_CONFIG_ID do novo app Prontei
- [x] Salvar credenciais como secrets no projeto via webdev_request_secrets
- [x] Teste vitest validando formato e presença das 3 credenciais (4 testes, 283 total)
- [x] Reiniciar servidor para aplicar novas variáveis de ambiente

## Etapa 20 — Chatbot de Agendamento via WhatsApp

- [x] Atualizar schema: campos conversation_state, selected_service_id, selected_professional_id, selected_date, selected_time na whatsapp_conversations
- [x] Atualizar whatsappDb com funções de estado da conversa
- [x] Criar server/chatbotFlow.ts com máquina de estados (MENU, SERVICE_SELECTION, PROFESSIONAL_SELECTION, DATE_SELECTION, TIME_SELECTION, CONFIRMATION, COMPLETED)
- [x] Integrar chatbotFlow no webhook existente (whatsappWebhook.ts)
- [x] Implementar comandos globais (menu, voltar, cancelar, horarios, alterar)
- [x] Implementar timeout de 30 minutos com reset de estado
- [x] Implementar reagendamento rápido (último serviço)
- [x] Implementar cancelamento simples de agendamentos
- [x] Implementar link de agenda pública
- [x] Criar testes vitest completos para o chatbot
- [x] Rodar todos os testes e garantir que passam (329 testes passando)

## Bug — Chatbot não responde mensagens WhatsApp
- [x] Investigar se mensagens do webhook estão chegando ao servidor (mensagens NÃO chegam — webhook verify falhava)
- [x] Verificar configuração do webhook no Meta (URL, token, assinatura messages)
- [x] Diagnosticar e corrigir o problema (webhook verify agora prioriza env var, adicionada validação X-Hub-Signature-256)
- [ ] Testar fluxo completo

## ETAPA Z-API — Migração Meta Cloud API → Z-API

- [x] Z1 — Pesquisa: documentação Z-API (endpoints, QR code, webhooks, preços)
- [x] Z2 — Plano de migração: mapear todos os arquivos afetados
- [x] Z3 — Schema: substituir campos Meta (accessToken, phoneNumberId, wabaId) por Z-API (instanceId, instanceToken, clientToken)
- [x] Z4 — Backend: reescrever whatsappWebhook.ts (envio/recebimento via Z-API REST)
- [x] Z5 — Backend: reescrever whatsappDb.ts (getSettingsByInstanceId, saveZApiCredentials)
- [x] Z6 — Backend: refatorar routers.ts (saveZApiCredentials, getQrCode, getConnectionStatus via Z-API)
- [x] Z7 — Backend: adaptar chatbotFlow.ts (sendChatbotReply com 5 args Z-API)
- [x] Z8 — Frontend: reescrever WhatsAppSettings.tsx (QR Code + credenciais manuais em vez de Embedded Signup)
- [x] Z9 — Remover referências Meta: env.ts (metaAppId, metaAppSecret, metaConfigId), meta-secrets.test.ts
- [x] Z10 — Testes vitest: reescrever whatsapp.test.ts para Z-API — 320 testes passando (13 arquivos)
- [x] Z11 — Validação final e checkpoint

## ETAPA ZAPI-REAL — Integração conta real Z-API ao PRONTEI

- [x] ZAPI 1 — Diagnóstico da arquitetura atual (schema, webhook, chatbot, frontend)
- [x] ZAPI 2 — Ajustes mínimos no schema/configuração (provider, status, connected_at)
- [x] ZAPI 3 — Implementação backend do provider Z-API (envio, status, QR code)
- [x] ZAPI 4 — Adaptação do webhook (payload Z-API, tenant resolution, chatbot)
- [x] ZAPI 5 — Adaptação da tela do WhatsApp (4 estados: não configurado, QR code, conectado, erro)
- [x] ZAPI 6 — Testes (credenciais, conexão, webhook, conversations, messages, multi-tenant)
- [x] ZAPI 7 — Validação final (preservação da arquitetura, instruções de uso)

## INTEGRAÇÃO GUIADA Z-API — Teste Real com Barbearia
- [x] Etapa 1 — Análise completa do projeto e diagnóstico técnico
- [x] Etapa 2 — Guiar criação da instância de teste na Z-API
- [x] Etapa 3 — Guiar conexão do WhatsApp (QR Code)
- [x] Etapa 4 — Configuração do webhook na Z-API
- [x] Etapa 5 — Validação da integração backend
- [x] Etapa 6 — Configuração das variáveis de ambiente
- [x] Etapa 7 — Testes reais de funcionamento
- [x] Etapa 8 — Simulação da Barbearia Alpha
- [x] Etapa 9 — Validação final e entrega

## BUG — Chatbot diz "não há horários disponíveis"
- [ ] Diagnosticar por que o chatbot não encontra horários disponíveis ao agendar
- [ ] Corrigir lógica de consulta de horários no chatbotFlow.ts
- [ ] Testar e validar correção

## PWA — Instalação do Prontei no celular
- [x] Verificar estado atual do PWA (manifest, service worker, meta tags)
- [x] Criar/atualizar manifest.json com dados do Prontei
- [x] Criar service worker para cache offline
- [x] Gerar ícones do app em diferentes tamanhos
- [x] Adicionar meta tags PWA no index.html
- [x] Testar e validar instalação
- [x] Entregar link de instalação ao usuário

## RENOMEAÇÃO — Agiliza no Zap → Prontei
- [ ] Buscar todas as referências ao nome antigo
- [ ] Atualizar VITE_APP_TITLE para "Prontei"
- [ ] Atualizar referências em código fonte
- [ ] Testar e validar

## BUG — Client-Token não enviado nas chamadas Z-API
- [x] Corrigir getQrCode para enviar Client-Token no header (já enviava, problema era clientToken null no banco)
- [x] Corrigir testConnection (getStatus) para enviar Client-Token (já enviava)
- [x] Corrigir sendWhatsappMessage para enviar Client-Token (já enviava)
- [x] Testar e validar (clientToken inserido no banco, Z-API retornou connected)

## Limpeza de dados — Excluir profissionais
- [x] Excluir profissionais BARBARA JARDIM (450001) e ZE MARIA (450002) do SALAO TESTE
- [x] Excluir working_hours associados (7 registros removidos)
- [x] Excluir vínculos professional_services associados (1 registro removido)
- [x] Verificar e confirmar exclusão (0 profissionais, 0 working_hours, 0 professional_services)

## Roteiro de Onboarding — Ativação WhatsApp para salões
- [x] Criar roteiro completo de ativação do WhatsApp para novos clientes

## BUG — establishment.mine retorna undefined
- [x] Diagnosticar causa do erro "establishment.mine data is undefined" (ownerId divergente: user 1440001 vs establishment ownerId 1290018)
- [x] Corrigir o problema (UPDATE ownerId para 1440001)
- [x] Testar e validar (painel carregando corretamente)

## BUG — Z-API send-text não conecta
- [x] Testar endpoint Z-API diretamente (curl) — HTTP 200, mensagem enviada com sucesso
- [x] Verificar status da instância Z-API — connected: true
- [x] Verificar código do Prontei que chama Z-API — credenciais no banco estavam de outra instância
- [x] Corrigir o problema — atualizado instanceId, instanceToken, clientToken e status para connected

## BUG — "your client-token is not configured" na tela WhatsApp
- [x] Investigar como Client-Token é enviado nas chamadas getQrCode e testConnection
- [x] Corrigir envio do Client-Token (tornar obrigatório no frontend e backend + mensagem de erro específica)
- [x] Testar e validar (59 testes whatsapp passando, TypeScript sem erros)

## Análise minuciosa — Conexão Z-API não funciona
- [x] Analisar estado completo da Z-API no banco de dados
- [x] Analisar código backend (routers, webhook, envio de mensagens)
- [x] Testar endpoints Z-API diretamente (curl) — endpoints autenticados dão timeout
- [x] Analisar código frontend (WhatsAppSettings)
- [x] Analisar logs do servidor
- [x] Compilar relatório completo de análise

## MIGRAÇÃO Z-API → META CLOUD API

### META 1 — Diagnóstico da arquitetura atual
- [x] Mapear todos os arquivos que referenciam Z-API
- [x] Identificar o que preservar vs remover

### META 2 — Remoção da Z-API e limpeza
- [x] Remover campos Z-API do schema (instanceId, instanceToken, clientToken)
- [x] Remover chamadas REST Z-API do backend
- [x] Remover QR Code flow
- [x] Remover parsing de payload Z-API do webhook
- [x] Remover testes específicos Z-API
- [x] Alterar provider padrão para "meta"
- [x] Migrar banco (pnpm db:push — 0009_awesome_boomer.sql)

### META 3 — Integração Meta Cloud API
- [x] Adicionar campos Meta ao schema (phoneNumberId, wabaId, accessToken, verifiedName, qualityRating, displayPhoneNumber)
- [x] Implementar Embedded Signup flow (backend — completeEmbeddedSignup)
- [x] Implementar envio de mensagens via Meta Cloud API (Graph API v21.0)
- [x] Configurar secrets (META_APP_ID, META_APP_SECRET, META_CONFIG_ID — já existentes)

### META 4 — Webhook oficial Meta
- [x] Adaptar GET /api/whatsapp/webhook (verify token)
- [x] Adaptar POST /api/whatsapp/webhook (payload Meta)
- [x] Validar assinatura do webhook (X-Hub-Signature-256)
- [x] Identificar tenant por phoneNumberId (getSettingsByPhoneNumberId)
- [x] Processar mensagens inbound Meta

### META 5 — Templates oficiais
- [ ] Criar estrutura de templates (confirmação, lembrete, reagendamento, cancelamento, avaliação)
- [ ] Implementar envio de template via Meta API
- [ ] Suporte a variáveis, botões, header/body/footer

### META 6 — Notificações automáticas
- [ ] Criar WhatsAppNotificationService
- [ ] Confirmação de agendamento
- [ ] Lembrete de agendamento
- [ ] Cancelamento de agendamento
- [ ] Reagendamento
- [ ] Lógica janela 24h (texto livre vs template)

### META 7 — Reformulação do agendamento
- [ ] Reagendar com facilidade
- [ ] Confirmação clara antes de criar appointment
- [ ] Calendário visual melhorado (verde/amarelo/cinza)
- [ ] Alterar agendamento facilmente
- [ ] Cancelamento simples
- [ ] Link de agenda compartilhável

### META 8 — Frontend WhatsApp
- [x] Refazer tela WhatsApp com Embedded Signup (Meta JS SDK)
- [x] Estados visuais (desconectado, conectando, conectado, erro)
- [x] Mostrar número, status, data conexão
- [x] Não expor segredos técnicos

### META 9 — Segurança
- [x] Webhook sem fallback inseguro
- [x] Validação de assinatura (X-Hub-Signature-256 com HMAC SHA256)
- [x] access_token nunca exposto em respostas
- [x] Isolamento multi-tenant completo

### META 10 — Testes
- [x] Testes Embedded Signup / conexão (completeEmbeddedSignup)
- [x] Testes webhook GET/POST (validateSendCredentials Meta)
- [x] Testes inbound/outbound (sendWhatsappMessage Meta)
- [ ] Testes templates e notificações
- [x] Testes chatbot com Meta (chatbotFlow atualizado)
- [x] Testes isolamento multi-tenant
- [x] Testes credenciais nunca expostas — 56 testes whatsapp passando

### META 11 — Validação final
- [ ] Relatório completo de migração

## BUG — FB.login() called before FB.init()
- [x] Diagnosticar problema de inicialização do Facebook SDK no Embedded Signup (window.FB existia mas FB.init não era chamado ao navegar de volta)
- [x] Corrigir ordem de inicialização (sempre chamar FB.init quando window.FB já existe + verificar fbSdkLoaded antes de FB.login)
- [x] Testar e validar (56 testes passando, TypeScript sem erros)

## IMPLEMENTAÇÃO — Agendamento Público via Link Web

### Bloco 1 — Schema + APIs públicas
- [x] Adicionar campo manageToken na tabela appointments
- [x] Rodar pnpm db:push
- [x] Criar publicRouter (Express REST, não tRPC)
- [x] Criar GET /api/public/booking/:slug (dados do establishment)
- [x] Criar GET /api/public/availability (horários disponíveis)
- [x] Criar POST /api/public/appointments (criar agendamento)

### Bloco 2 — Cancelamento, reagendamento e histórico
- [x] Criar POST /api/public/appointments/:token/cancel
- [x] Criar POST /api/public/appointments/:token/reschedule
- [x] Criar GET /api/public/appointments/history (por telefone)

### Bloco 3 — PublicBookingPage
- [x] Criar página /agendar/:slug
- [x] Componente ServiceSelector
- [x] Componente ProfessionalSelector
- [ ] Componente QuickSlots (melhores horários hoje/amanhã)
- [x] Componente BookingCalendar
- [x] Componente TimeSlots
- [x] Componente CustomerForm
- [x] Componente BookingSummary
- [x] Componente BookingSuccess

### Bloco 4 — Telas de gerenciamento
- [x] Criar página /meu-agendamento/:token (PublicAppointmentManage)
- [x] Funcionalidade cancelar agendamento
- [x] Funcionalidade reagendar
- [ ] Funcionalidade agendar novamente (sugere serviço anterior)

### Bloco 5 — Notificações
- [ ] Criar NotificationService
- [ ] Notificação appointment.created (confirmação)
- [ ] Notificação appointment.cancelled
- [ ] Notificação appointment.rescheduled
- [ ] Lembrete 24h antes
- [ ] Lembrete 1h antes

### Bloco 6 — WhatsApp simplificado
- [ ] Simplificar chatbot para responder apenas com link de agendamento

### Bloco 7 — Testes
- [x] Testes APIs públicas (17 testes passando — availability, create, cancel, reschedule, history, validações)
- [ ] Testes de notificações
- [ ] Testes de isolamento multi-tenant

### Bloco 8 — UX final
- [ ] Mobile first responsivo
- [x] Formato Brasil (DD/MM/AAAA, HH:mm, R$)
- [ ] Tempo máximo de agendamento: 30 segundos
- [ ] Validação final e checkpoint

## Link de agendamento no painel
- [x] Exibir link de agendamento no Dashboard (card com botão copiar, QR Code, abrir em nova aba)
- [x] Exibir link de agendamento na tela de Configurações (com personalização do slug)
- [x] Permitir personalizar o slug do establishment (com validação de unicidade no backend)
- [x] Gerar QR Code do link de agendamento (via api.qrserver.com)
- [x] Testar e validar (73 testes passando, TypeScript sem erros)

## REFORMULAÇÃO — Página Pública de Agendamento (Prompt Completo)

### Etapa 3 — Mudanças no Banco
- [x] Adicionar primaryColor e secondaryColor ao schema establishments
- [x] Rodar pnpm db:push

### Etapa 4 — Serviços de Backend
- [x] Criar server/eventBus.ts (EventEmitter para appointment.created/cancelled/rescheduled)
- [x] Criar server/publicBookingService.ts (getBookingPageData)
- [x] Criar server/publicAvailabilityService.ts (getDayAvailability, getQuickSlots)
- [x] Criar server/publicAppointmentService.ts (createPublicAppointment, cancelByToken, rescheduleByToken)
- [x] Criar server/rebookService.ts (getLastBookingOptions)
- [x] Criar server/notificationService.ts (confirmação, lembrete 24h/1h, cancelamento, reagendamento)
- [x] Refatorar publicRouter.ts para usar os novos serviços
- [x] Adicionar endpoint GET /api/public/quickslots (melhores horários hoje/amanhã)
- [x] Adicionar endpoint GET /api/public/rebook (sugestão de rebook por telefone)
- [x] Atualizar resposta da API availability com summary (availableCount, status: good/limited/full)

### Etapa 5 — Arquitetura Gráfica (Componentes)
- [x] Criar client/src/components/booking/BookingHeroCard.tsx
- [x] Criar client/src/components/booking/ServiceSelector.tsx
- [x] Criar client/src/components/booking/ProfessionalSelector.tsx
- [x] Criar client/src/components/booking/QuickSlotsSection.tsx
- [x] Criar client/src/components/booking/BookingCalendar.tsx (cores verde/amarelo/cinza/azul)
- [x] Criar client/src/components/booking/DaySlotsGrid.tsx
- [x] Criar client/src/components/booking/CustomerForm.tsx
- [x] Criar client/src/components/booking/BookingSummaryCard.tsx
- [x] Criar client/src/components/booking/BookingSuccess.tsx

### Etapa 6 — Rotas e Páginas
- [x] Refatorar PublicBooking.tsx para usar componentes separados
- [ ] Criar página /meus-agendamentos (MyAppointmentsPage.tsx)
- [ ] Criar página /reagendar/:token (PublicReschedulePage.tsx)
- [ ] Criar página /cancelar/:token (PublicCancelPage.tsx)
- [ ] Registrar novas rotas no App.tsx
- [ ] Implementar rebook flow ("Agendar novamente" com sugestão de serviço anterior)
- [x] Opção "Qualquer profissional" no ProfessionalSelector

### Etapa 7 — Notificações
- [x] Templates de notificação em PT-BR (confirmação, lembrete, cancelamento, reagendamento)
- [x] Integrar eventBus com NotificationService
- [x] Stubs para email e SMS preparados para implementação futura

### Etapa 8 — Testes
- [x] Testes publicBookingService
- [x] Testes publicAvailabilityService (availability + quickslots)
- [x] Testes publicAppointmentService (create, cancel, reschedule)
- [x] Testes rebookService
- [x] Testes eventBus (eventos disparados)
- [x] Testes notificationService

### Etapa 9 — Validação Final
- [x] TypeScript sem erros
- [x] Todos os testes passando (36 novos testes + 330 existentes)
- [x] Fluxo completo testável no preview
- [x] Mobile-first responsivo
- [x] Formato Brasil (DD/MM/AAAA, HH:mm, R$)
- [ ] Simplificar chatbot WhatsApp (responder apenas com link)
- [x] Checkpoint final salvo

## Página /meus-agendamentos
- [x] Criar página MyAppointments.tsx (busca por telefone, lista de agendamentos)
- [x] Registrar rota /meus-agendamentos no App.tsx
- [x] Testar e salvar checkpoint

## Bug — Erro de runtime no site publicado
- [x] Investigar crash "An unexpected error occurred" no prontei.manus.space
- [x] Corrigir o bug (API retornava {summary} mas frontend esperava {appointment})
- [ ] Testar e salvar checkpoint
