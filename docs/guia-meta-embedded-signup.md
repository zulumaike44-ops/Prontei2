# Guia: Configurar Meta Embedded Signup para o PRONTEI

Este guia explica como obter as 3 credenciais necessárias para que o botão "Conectar WhatsApp" funcione no PRONTEI via Meta Embedded Signup.

---

## Pré-requisitos

- Conta no Facebook com acesso ao [Meta for Developers](https://developers.facebook.com/)
- Conta Business verificada no [Meta Business Suite](https://business.facebook.com/)

---

## ETAPA 1 — Criar ou localizar o App da Meta

1. Acesse [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)
2. Se já existir um app do PRONTEI, clique nele. Caso contrário:
   - Clique em **"Criar App"**
   - Selecione **"Business"** como tipo
   - Nome: **"Prontei"** (ou "Prontei - Agendamentos")
   - Associe ao seu Business Manager
   - Clique em **"Criar App"**
3. Anote o **App ID** (visível no topo do painel do app)

> **META_APP_ID** = o App ID exibido no painel (ex: `123456789012345`)

---

## ETAPA 2 — Obter o App Secret

1. No painel do app, vá em **Configurações → Básico** (Settings → Basic)
2. Localize o campo **"Chave Secreta do App"** (App Secret)
3. Clique em **"Mostrar"** e confirme sua senha
4. Copie o valor

> **META_APP_SECRET** = a chave secreta do app (ex: `abc123def456...`)

**IMPORTANTE:** Este valor NUNCA é exposto no frontend. Ele é usado apenas no servidor para trocar o `code` por `access_token`.

---

## ETAPA 3 — Adicionar o produto WhatsApp ao App

1. No menu lateral do app, clique em **"Adicionar Produto"** (Add Product)
2. Encontre **"WhatsApp"** e clique em **"Configurar"** (Set Up)
3. Siga as instruções para associar ao seu Business Manager

---

## ETAPA 4 — Configurar Facebook Login for Business

1. No menu lateral do app, clique em **"Adicionar Produto"** (Add Product)
2. Encontre **"Facebook Login for Business"** e clique em **"Configurar"**
3. Vá em **Facebook Login for Business → Configurações** (Settings)
4. Em **"Valid OAuth Redirect URIs"**, adicione:
   ```
   https://prontei.manus.space/
   ```
5. Em **"Allowed Domains"**, adicione:
   ```
   prontei.manus.space
   ```
6. Salve as alterações

---

## ETAPA 5 — Criar a Configuração do Embedded Signup

1. No menu lateral, vá em **Facebook Login for Business → Configurations**
2. Clique em **"Create Configuration"**
3. Selecione o template: **"WhatsApp Embedded Signup Configuration With 60 Day Expiration Token"**
   - Se não aparecer esse template, selecione "WhatsApp Embedded Signup" e configure manualmente
4. Preencha:
   - **Configuration Name:** `Prontei WhatsApp Connection`
   - **Permissions:** marque `whatsapp_business_messaging` e `whatsapp_business_management`
5. Clique em **"Create"**
6. Anote o **Configuration ID** exibido

> **META_CONFIG_ID** = o ID da configuração (ex: `987654321098765`)

---

## ETAPA 6 — Configurar o Webhook

1. No menu do app, vá em **WhatsApp → Configuração** (Configuration)
2. Na seção **Webhook**, clique em **"Editar"** (Edit)
3. Preencha:
   - **Callback URL:** `https://prontei.manus.space/api/whatsapp/webhook`
   - **Verify Token:** qualquer string segura (ex: `prontei_verify_2024`)
4. Clique em **"Verificar e Salvar"**
5. Marque os campos de webhook que deseja receber:
   - `messages` (obrigatório)
   - `message_deliveries` (opcional, para status de entrega)

---

## ETAPA 7 — Inserir as credenciais no PRONTEI

No painel do PRONTEI, vá em **Settings → Secrets** e preencha:

| Variável | Valor |
|---|---|
| `META_APP_ID` | App ID do passo 1 |
| `META_APP_SECRET` | App Secret do passo 2 |
| `META_CONFIG_ID` | Configuration ID do passo 5 |

Ou forneça os valores ao Manus para que ele configure via `webdev_request_secrets`.

---

## Resumo das 3 Credenciais

| Credencial | Onde encontrar | Exemplo |
|---|---|---|
| **META_APP_ID** | Painel do App → topo | `123456789012345` |
| **META_APP_SECRET** | Configurações → Básico → App Secret | `abc123def456ghi789` |
| **META_CONFIG_ID** | Facebook Login for Business → Configurations | `987654321098765` |

---

## Fluxo após configuração

1. Usuário do salão acessa `/dashboard/whatsapp`
2. Clica em **"Conectar WhatsApp"**
3. Popup da Meta abre → usuário autoriza
4. PRONTEI recebe `code` + `phone_number_id` + `waba_id`
5. Servidor troca `code` por `access_token` (usando META_APP_SECRET)
6. Credenciais salvas automaticamente → WhatsApp conectado

**Zero campos técnicos para o usuário final do salão.**

---

## Checklist de Segurança

- [ ] App está em modo **"Live"** (não Development) para produção
- [ ] Valid OAuth Redirect URIs inclui o domínio do PRONTEI
- [ ] Allowed Domains inclui o domínio do PRONTEI
- [ ] META_APP_SECRET está APENAS no servidor (nunca no frontend)
- [ ] Webhook verificado e recebendo mensagens
