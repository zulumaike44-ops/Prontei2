# Análise Minuciosa — Conexão Z-API no Prontei

**Data:** 14 de março de 2026  
**Autor:** Manus AI  
**Escopo:** Diagnóstico completo de por que a conexão Z-API não funciona no Prontei

---

## 1. Resumo Executivo

A integração Z-API do Prontei apresenta **três problemas simultâneos** que impedem o funcionamento. O mais crítico é um **bloqueio de rede** — a API da Z-API (`api.z-api.io`) não responde a chamadas autenticadas a partir do servidor de produção (Manus Cloud). Além disso, as credenciais estão **apagadas no banco** e a integração está **desabilitada** (`isEnabled=0`). Mesmo que as credenciais sejam restauradas, o servidor não conseguirá se comunicar com a Z-API enquanto o bloqueio de rede persistir.

---

## 2. Problemas Identificados

### Problema 1 — Bloqueio de Rede (CRÍTICO)

O servidor de produção do Prontei (hospedado na Manus Cloud) **não consegue acessar os endpoints autenticados da Z-API**. Todas as chamadas a `https://api.z-api.io/instances/{id}/token/{token}/...` resultam em **timeout após 10 segundos** (HTTP 000, exit code 28).

| Teste | Endpoint | Resultado | Tempo |
|-------|----------|-----------|-------|
| Raiz da API | `GET https://api.z-api.io/` | HTTP 200 `{"message":"hello world"}` | ~1.5s |
| Status (com Client-Token) | `GET .../status` | **Timeout** (HTTP 000) | 10s |
| Status (sem Client-Token) | `GET .../status` | **Timeout** (HTTP 000) | 10s |
| QR Code | `GET .../qr-code/image` | **Timeout** (HTTP 000) | 10s |
| Instância falsa | `GET .../FAKE/token/FAKE/status` | **Timeout** (HTTP 000) | 10s |
| Com User-Agent de browser | `GET .../status` | **Timeout** (HTTP 000) | 10s |

A raiz da API (`/`) responde normalmente com HTTP 200, o que confirma que o DNS resolve e a conexão TLS funciona. Porém, **qualquer endpoint com `/instances/`** resulta em timeout. Isso indica que a Z-API aplica algum tipo de bloqueio ou rate-limiting em IPs de datacenter/cloud para endpoints autenticados.

**Evidência nos logs do servidor:** Em 14/03 às 01:44 UTC, o servidor tentou enviar uma mensagem e obteve `"fetch failed"`:

> `[2026-03-14T01:44:30.786Z] [Z-API] Erro de rede ao enviar mensagem: fetch failed`

Anteriormente (13/03 entre 16:29 e 17:07 UTC), as mesmas credenciais **funcionavam perfeitamente** — 7 mensagens foram enviadas com sucesso via o mesmo endpoint. Isso sugere que o bloqueio é **intermitente ou recente**, possivelmente relacionado à expiração do plano TRIAL da Z-API.

### Problema 2 — Credenciais Apagadas no Banco

As credenciais Z-API do establishment 150001 (SALAO 01) estão **todas null** no banco de dados:

| Campo | Valor Atual | Valor Esperado |
|-------|-------------|----------------|
| `instanceId` | `null` | `3F006F9F9E8FB121D3764A9C06F44763` |
| `instanceToken` | `null` | `8B02F64979BF7613E9405734` |
| `clientToken` | `null` | `Fac749ddd94ef41688f251dc8695d69d2S` |
| `status` | `disconnected` | `connected` |
| `isEnabled` | `0` (false) | `1` (true) |
| `connectedAt` | `null` | Data da última conexão |

As credenciais foram apagadas pela procedure `disconnect` (chamada em 14/03 às 02:05 UTC e antes em 13/03 às 22:46 UTC). Essa procedure limpa **todos os campos** propositalmente — é o comportamento esperado quando o usuário clica "Desconectar". O problema é que, após desconectar, ao tentar reconectar com novas credenciais, o sistema não consegue validar (Problema 1) e fica em loop.

**Cronologia das ações no banco:**

| Horário (UTC) | Ação |
|---------------|------|
| 13/03 22:44 | Credenciais salvas (saveZApiCredentials) |
| 13/03 22:46 | Desconexão (disconnect) — credenciais apagadas |
| 14/03 00:02 | Credenciais salvas novamente |
| 14/03 00:03 | Credenciais salvas novamente |
| 14/03 01:44 | Tentativa de envio → `fetch failed` |
| 14/03 01:50 | Credenciais salvas novamente |
| 14/03 01:53 | Credenciais salvas novamente |
| 14/03 02:05 | Desconexão final — credenciais apagadas |

### Problema 3 — Integração Desabilitada

Mesmo que as credenciais sejam restauradas, o campo `isEnabled=0` impede o webhook de processar mensagens recebidas. No código do webhook (`whatsappWebhook.ts`, linha 289):

```typescript
if (!settings.isEnabled) {
  console.warn(`[Z-API Webhook] WhatsApp desabilitado para establishment ${settings.establishmentId}`);
  return; // Mensagem ignorada
}
```

Além disso, `autoReplyEnabled=0` no establishment 150001, o que desabilita a resposta automática.

---

## 3. Análise do Código — Fluxo Completo

### 3.1 Fluxo de Conexão (Frontend → Backend → Z-API)

O fluxo de conexão segue estas etapas:

1. **Usuário preenche credenciais** no formulário (Instance ID, Instance Token, Client Token — todos obrigatórios após correção recente).
2. **Frontend chama** `trpc.whatsapp.saveZApiCredentials.mutate()` com os 3 campos.
3. **Backend salva** no banco via `upsertWhatsappSettings()` com `isEnabled=true` e `status="waiting_qr"`.
4. **Frontend abre dialog de QR Code** e chama `trpc.whatsapp.getQrCode.query()`.
5. **Backend chama** `GET https://api.z-api.io/instances/{id}/token/{token}/qr-code/image` com header `Client-Token`.
6. **Z-API retorna** imagem base64 do QR Code (ou erro).
7. **Usuário escaneia** QR Code no celular.
8. **Frontend chama** `trpc.whatsapp.testConnection.mutate()` para verificar.
9. **Backend chama** `GET https://api.z-api.io/instances/{id}/token/{token}/status`.
10. **Se connected**, atualiza `status="connected"` e `connectedAt=now()`.

O código está **correto em todos os pontos**. O problema é que os passos 5 e 9 falham por timeout de rede.

### 3.2 Fluxo de Recebimento de Mensagens (Z-API → Webhook → Chatbot)

1. **Z-API envia POST** para `https://prontei.manus.space/api/whatsapp/webhook`.
2. **Servidor responde 200** imediatamente (linha 252).
3. **Resolve establishment** pelo `instanceId` do payload via `getSettingsByInstanceId()`.
4. **Verifica** `isEnabled` — se false, ignora a mensagem.
5. **Normaliza telefone**, localiza/cria customer, encontra/cria conversation.
6. **Registra mensagem** inbound no banco.
7. **Chatbot processa** via `handleChatbotFlow()`.
8. **Envia resposta** via `sendWhatsappMessage()` → POST para Z-API send-text.

O webhook está corretamente registrado no Express (`server/_core/index.ts`, linhas 40-41):

```typescript
app.get("/api/whatsapp/webhook", handleWebhookVerification);
app.post("/api/whatsapp/webhook", handleWebhookMessage);
```

**Problema no passo 8:** Mesmo que o webhook receba mensagens (Z-API → Prontei funciona, pois é a Z-API que inicia a conexão), a resposta do chatbot falhará no envio (Prontei → Z-API) pelo mesmo bloqueio de rede.

### 3.3 Fluxo de Envio de Mensagens

A função `sendWhatsappMessage()` em `whatsappWebhook.ts`:

1. Valida credenciais (`instanceId` e `instanceToken` presentes).
2. Monta URL: `https://api.z-api.io/instances/{id}/token/{token}/send-text`.
3. Monta headers com `Client-Token` se disponível.
4. Faz `fetch()` POST com payload `{ phone, message }`.
5. Trata resposta (sucesso, erro de autenticação, rate limit, rede).

O código está correto. O `Client-Token` é enviado condicionalmente (`if (clientToken)` na função `buildZApiHeaders`). Não há bug aqui — o problema é puramente de rede.

---

## 4. Análise do Banco de Dados

### 4.1 Estrutura da Tabela `whatsapp_settings`

| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| id | int | NO | auto |
| establishmentId | int | NO | — |
| isEnabled | tinyint(1) | NO | 0 |
| phoneNumber | varchar(20) | YES | null |
| provider | varchar(50) | NO | z-api |
| autoReplyEnabled | tinyint(1) | NO | 1 |
| autoReplyMessage | text | YES | null |
| instanceId | varchar(100) | YES | null |
| instanceToken | varchar(200) | YES | null |
| clientToken | text | YES | null |
| status | varchar(30) | NO | disconnected |
| connectedAt | datetime | YES | null |

### 4.2 Registros Atuais

| establishmentId | isEnabled | status | instanceId | clientToken | autoReply |
|-----------------|-----------|--------|------------|-------------|-----------|
| 150001 (Souza) | **0** | disconnected | **null** | **null** | **0** |
| 180001 (Junior R.) | 0 | disconnected | null | null | 1 |

### 4.3 Establishments

| ID | Nome | Dono | WhatsApp |
|----|------|------|----------|
| 150001 | SALAO 01 | Souza Junior (1440001) | Desconectado |
| 180001 | SALAO 01 | Junior Rodrigues (1470082) | Desconectado |

---

## 5. Histórico de Funcionamento

Os logs comprovam que a integração **já funcionou corretamente** no dia 13/03:

| Horário (UTC) | Evento | Resultado |
|---------------|--------|-----------|
| 13/03 16:28 | Webhook recebeu mensagem, mas instanceId não encontrado | Ignorado (antes da correção do ownerId) |
| 13/03 16:29 | Customer criado + mensagem inbound + envio de resposta | **Sucesso** (ID: CD81B9E284B027BC4279) |
| 13/03 16:35 | Novo customer + mensagem + resposta | **Sucesso** (ID: 3EB065CE4D208C3F4C706E) |
| 13/03 16:43 | 3 mensagens inbound + 3 respostas | **Sucesso** (todas com messageId) |
| 13/03 17:06 | 2 mensagens inbound + 2 respostas | **Sucesso** |
| 14/03 01:44 | Tentativa de envio | **Falhou** (`fetch failed`) |

Isso confirma que entre 13/03 17:07 e 14/03 01:44 (intervalo de ~8h), algo mudou na conectividade entre o servidor Manus e a Z-API.

---

## 6. Diagnóstico Final

A causa raiz é um **bloqueio de rede entre o servidor Manus Cloud e os endpoints autenticados da Z-API**. As hipóteses mais prováveis são:

**Hipótese A — Expiração do plano TRIAL da Z-API.** A assinatura trial estava próxima de expirar. Quando expira, a Z-API pode bloquear chamadas à instância, resultando em timeout em vez de uma resposta de erro clara. Esta é a hipótese mais provável dado que funcionava antes e parou subitamente.

**Hipótese B — Rate limiting ou bloqueio de IP.** A Z-API pode ter implementado bloqueio de IPs de datacenter (AWS, GCP, etc.) para prevenir uso automatizado não autorizado. O endpoint raiz (`/`) funciona porque não requer autenticação de instância.

**Hipótese C — Instância suspensa ou removida.** Se a instância Z-API foi suspensa por inatividade ou violação de termos, as chamadas podem ficar pendentes sem resposta.

---

## 7. Ações Necessárias para Resolver

### Ação Imediata (Usuário)

1. **Verificar status da assinatura Z-API** — Acessar [painel.z-api.io](https://painel.z-api.io) e confirmar se o plano TRIAL ainda está ativo ou se expirou. Se expirou, assinar um plano pago.

2. **Testar a API de fora do Manus** — Abrir o terminal do computador pessoal e executar:
   ```bash
   curl -H "Client-Token: Fac749ddd94ef41688f251dc8695d69d2S" \
     "https://api.z-api.io/instances/3F006F9F9E8FB121D3764A9C06F44763/token/8B02F64979BF7613E9405734/status"
   ```
   Se funcionar do computador pessoal mas não do servidor, confirma bloqueio de IP.

3. **Verificar se a instância ainda existe** — No painel da Z-API, confirmar que a instância `3F006F9F9E8FB121D3764A9C06F44763` aparece e está ativa.

### Ação Técnica (Após resolver rede)

4. **Restaurar credenciais no banco** — Após confirmar que a API responde, salvar as credenciais pelo formulário do Prontei (WhatsApp → Credenciais):
   - Instance ID: `3F006F9F9E8FB121D3764A9C06F44763`
   - Instance Token: `8B02F64979BF7613E9405734`
   - Client Token: `Fac749ddd94ef41688f251dc8695d69d2S`

5. **Escanear QR Code** — Após salvar credenciais, clicar "Gerar QR Code" e escanear com o WhatsApp.

6. **Habilitar autoReply** — Ativar a resposta automática na seção de configurações.

### Ação Alternativa (Se Z-API não funcionar)

7. **Considerar trocar de provedor** — Se a Z-API continuar bloqueando, avaliar alternativas como:
   - **Evolution API** (self-hosted, sem bloqueio de IP)
   - **Baileys** (biblioteca Node.js direta, sem intermediário)
   - **WhatsApp Business API oficial** (Meta, mais complexo mas sem bloqueios)

---

## 8. Resumo do Estado Atual do Código

| Componente | Estado | Observação |
|------------|--------|------------|
| Schema do banco | Correto | Todos os campos necessários existem |
| `whatsappWebhook.ts` | Correto | Envio, recebimento e tratamento de erros OK |
| `whatsappDb.ts` | Correto | CRUD, state management e upsert OK |
| `routers.ts` (WhatsApp) | Correto | saveCredentials, disconnect, testConnection, getQrCode OK |
| `WhatsAppSettings.tsx` | Correto | Formulário com 3 campos obrigatórios, QR dialog, status OK |
| `chatbotFlow.ts` | Correto | Fluxo de agendamento funcional |
| Webhook Express | Correto | Registrado em `/api/whatsapp/webhook` (GET e POST) |
| Client-Token | Corrigido | Agora obrigatório no formulário (antes era opcional) |

O código não tem bugs. O problema é exclusivamente de **infraestrutura/rede** entre o servidor e a Z-API.
