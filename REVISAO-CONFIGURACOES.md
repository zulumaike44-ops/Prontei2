# Revisão Completa das Configurações — Prontei

**Data:** 13 de março de 2026  
**Projeto:** Prontei — Plataforma SaaS de Agendamento  
**Domínio de produção:** https://prontei.manus.space

---

## 1. Estado Geral do Sistema

O servidor de desenvolvimento está **ativo e funcionando** na porta 3000, sem erros de TypeScript e com todas as dependências instaladas corretamente. O sistema está logado com o usuário **Souza Junior** (sj9244421@gmail.com), vinculado ao establishment **SALAO TESTE** (id=150001).

| Item | Status | Detalhes |
|------|--------|----------|
| Servidor dev | Rodando | Porta 3000, sem erros |
| TypeScript | Sem erros | LSP limpo |
| Dependências | OK | Todas instaladas |
| Testes | 320 passando | 13 arquivos de teste |
| Domínios | Ativos | prontei.manus.space, agilizaapp-divfgdbr.manus.space |

---

## 2. Credenciais Z-API no Banco de Dados

A tabela `whatsapp_settings` contém **1 registro** para o establishment 150001 (SALAO TESTE). Atualmente, as credenciais estão **vazias** porque a última ação executada foi uma desconexão.

| Campo | Valor Atual | Observação |
|-------|-------------|------------|
| `id` | 60001 | Auto-incremento |
| `establishmentId` | 150001 | SALAO TESTE |
| `instanceId` | **null** | Limpo após desconexão |
| `instanceToken` | **null** | Limpo após desconexão |
| `clientToken` | **null** | Limpo após desconexão |
| `status` | **disconnected** | Desconectado |
| `connectedAt` | null | Sem conexão ativa |
| `autoReplyEnabled` | true (1) | Resposta automática ativada |
| `autoReplyMessage` | null | Usa mensagem padrão |
| `isEnabled` | — | Campo existe na tabela |
| `provider` | z-api | Provedor configurado |

> **Situação:** As credenciais foram limpas pela ação "Desconectar" executada em 13/03/2026 às 22:46 UTC. Para reconectar, é necessário inserir novamente as credenciais pelo formulário na tela de WhatsApp.

---

## 3. Credenciais da Instância Z-API (Painel Z-API)

Com base nas informações fornecidas pelo usuário e capturas de tela do painel Z-API:

| Campo | Valor |
|-------|-------|
| Nome da instância | Zulumeu numero |
| Instance ID | `3F006F9F9E8FB121D3764A9C06F44763` |
| Instance Token | `8B02F64979BF7613E9405734` |
| Client-Token | `Fac749ddd94ef41688f251dc8695d69d2S` |
| Status no painel Z-API | **Conectado** |
| Versão | Multi Device |
| Assinatura | **TRIAL** — expira em aprox. 1 dia |
| WhatsApp conectado | 5533984058111 |

> **Alerta:** A assinatura TRIAL expira em aproximadamente 1 dia. Após a expiração, a instância deixará de funcionar. É necessário assinar um plano pago (a partir de R$ 99,90/mês) para manter o serviço ativo.

---

## 4. Configuração do Webhook

O webhook está registrado no servidor Express em duas rotas:

| Rota | Método | Função |
|------|--------|--------|
| `/api/whatsapp/webhook` | GET | Verificação — retorna `{ status: "ok", provider: "z-api" }` |
| `/api/whatsapp/webhook` | POST | Recebimento de mensagens — processa payload Z-API |

O fluxo do webhook POST funciona da seguinte forma:

1. Recebe o payload da Z-API com `instanceId`, `phone`, `text`, etc.
2. Ignora mensagens `fromMe`, de grupo e status updates (delivery/read)
3. Resolve o tenant pelo `instanceId` na tabela `whatsapp_settings`
4. Valida o `Client-Token` se configurado (comparação com header `client-token`)
5. Normaliza o telefone do remetente e localiza/cria o customer
6. Encontra ou cria a conversation
7. Registra a mensagem inbound
8. Encaminha para o chatbot de agendamento (se texto)
9. Fallback: envia resposta automática se habilitada e conversa nova

**URL do webhook para configurar na Z-API:**

| Ambiente | URL |
|----------|-----|
| Produção | `https://prontei.manus.space/api/whatsapp/webhook` |
| Desenvolvimento (sandbox) | URL temporária do sandbox (muda a cada sessão) |

---

## 5. Dados Cadastrados no Establishment

### 5.1 Establishment

| Campo | Valor |
|-------|-------|
| ID | 150001 |
| Nome | SALAO TESTE |
| Slug | salao-teste |
| Owner ID | 1290018 |

### 5.2 Profissionais (2 ativos)

| ID | Nome | Ativo | Working Hours |
|----|------|-------|---------------|
| 450001 | BARBARA JARDIM | Sim | 7 dias configurados (Seg-Sex 09:00-18:00/21:00, Sáb 09:00-18:00, Dom 12:00-18:00) |
| 450002 | ZE MARIA | Sim | **Nenhum horário cadastrado** |

> **Problema identificado:** O profissional **ZE MARIA** não tem horários de trabalho (`working_hours`) cadastrados. O chatbot não conseguirá agendar com ele até que os horários sejam configurados na tela de Profissionais.

### 5.3 Serviços (1 ativo)

| ID | Nome | Duração | Preço | Ativo |
|----|------|---------|-------|-------|
| 360001 | CORTE FEMININO | 60 min | R$ 150,00 | Sim |

### 5.4 Clientes

Nenhum cliente cadastrado no establishment 150001.

### 5.5 Conversas WhatsApp

Nenhuma conversa registrada no establishment 150001 (as conversas anteriores foram do establishment antigo que foi removido).

### 5.6 Agendamentos

Nenhum agendamento registrado no establishment 150001.

---

## 6. Variáveis de Ambiente (Secrets)

As seguintes variáveis de ambiente estão configuradas no projeto:

| Variável | Uso | Status |
|----------|-----|--------|
| `DATABASE_URL` | Conexão MySQL/TiDB | Configurada (sistema) |
| `JWT_SECRET` | Assinatura de cookies de sessão | Configurada (sistema) |
| `VITE_APP_ID` | ID do app Manus OAuth | Configurada (sistema) |
| `OAUTH_SERVER_URL` | URL do servidor OAuth | Configurada (sistema) |
| `VITE_OAUTH_PORTAL_URL` | URL do portal de login | Configurada (sistema) |
| `OWNER_OPEN_ID` | OpenID do proprietário | Configurada (sistema) |
| `OWNER_NAME` | Nome do proprietário | Configurada (sistema) |
| `BUILT_IN_FORGE_API_URL` | URL das APIs internas | Configurada (sistema) |
| `BUILT_IN_FORGE_API_KEY` | Chave das APIs internas | Configurada (sistema) |
| `VITE_APP_TITLE` | Título do app | "Prontei" |
| `VITE_APP_LOGO` | Logo do app | URL CDN |
| `META_APP_ID` | ID do app Meta (legado) | 972309978694761 |
| `META_APP_SECRET` | Secret do app Meta (legado) | Configurada |
| `META_CONFIG_ID` | Config ID Meta (legado) | 1660312611985385 |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token de verificação do webhook | Configurada |

> **Nota:** As variáveis `META_APP_ID`, `META_APP_SECRET` e `META_CONFIG_ID` são legado da integração com Meta Cloud API. Não são mais utilizadas após a migração para Z-API, mas permanecem configuradas. Podem ser removidas futuramente sem impacto.

---

## 7. Fluxo de Salvamento de Credenciais Z-API

Quando um novo cliente salva credenciais pelo formulário, o fluxo é:

1. **Frontend** envia `instanceId`, `instanceToken` e `clientToken` (opcional) via mutation `whatsapp.saveZApiCredentials`
2. **Backend** valida os campos com Zod (instanceId e instanceToken obrigatórios, clientToken opcional)
3. **Backend** chama `upsertWhatsappSettings()` que faz INSERT ou UPDATE na tabela `whatsapp_settings`
4. **Backend** define `status = "waiting_qr"`, `isEnabled = true`, `provider = "z-api"`
5. **Backend** salva os 3 campos: `instanceId`, `instanceToken`, `clientToken`
6. **Log** registra `[Z-API] Credenciais salvas para establishment {id}`

O `clientToken` é enviado em todas as chamadas à Z-API através do header `Client-Token`:
- `sendWhatsappMessage()` — envio de mensagens
- `getQrCode` — geração de QR Code
- `getConnectionStatus` — verificação de status
- `testConnection` — teste de conexão

---

## 8. Pendências e Problemas Identificados

| Prioridade | Item | Descrição |
|------------|------|-----------|
| **Alta** | Reconectar Z-API | Credenciais foram limpas pela desconexão. Reconectar com instanceId, instanceToken e clientToken |
| **Alta** | Assinatura TRIAL | Expira em ~1 dia. Assinar plano pago na Z-API |
| **Média** | Working hours ZE MARIA | Profissional sem horários cadastrados — chatbot não consegue agendar com ele |
| **Média** | Webhook produção | Verificar se o webhook na Z-API aponta para `https://prontei.manus.space/api/whatsapp/webhook` |
| **Baixa** | Secrets legado Meta | META_APP_ID, META_APP_SECRET, META_CONFIG_ID podem ser removidas |
| **Baixa** | Renomeação pendente | Ainda existem referências ao nome antigo em alguns locais |

---

## 9. Ações Recomendadas (Ordem de Prioridade)

1. **Assinar plano Z-API** antes que o TRIAL expire (R$ 99,90/mês no plano Starter)
2. **Reconectar WhatsApp no Prontei:** Ir em WhatsApp → Configurar credenciais → Preencher os 3 campos → Salvar e Conectar
3. **Configurar webhook na Z-API** para apontar para `https://prontei.manus.space/api/whatsapp/webhook`
4. **Cadastrar horários de ZE MARIA** na tela de Profissionais para que o chatbot funcione com ambos os profissionais
5. **Testar fluxo completo** do chatbot: enviar mensagem → selecionar serviço → profissional → data → horário → confirmar
