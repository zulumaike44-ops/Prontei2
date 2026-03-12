# PRONTEI — Atualizações Necessárias para o Bot WhatsApp Funcionar

**Data:** 11/03/2026
**Escopo:** Análise completa do que já funciona, o que falta, e o que precisa ser feito.

---

## 1. O QUE JÁ FUNCIONA (implementado e testado)

| Componente | Status | Detalhes |
|---|---|---|
| **Webhook de recebimento (inbound)** | Pronto | `POST /api/whatsapp/webhook` recebe payload Meta, parseia mensagens |
| **Verificação de webhook** | Pronto | `GET /api/whatsapp/webhook` valida `verify_token` contra banco + fallback env |
| **Persistência de conversas** | Pronto | Tabela `whatsapp_conversations` com vínculo a customer |
| **Persistência de mensagens** | Pronto | Tabela `whatsapp_messages` (inbound + outbound) |
| **Vínculo automático com customer** | Pronto | Normaliza telefone → busca customer → cria se não existir |
| **Envio real via Meta Cloud API** | Pronto | `sendWhatsappMessage` chama `POST graph.facebook.com/v21.0/{phoneNumberId}/messages` |
| **Tratamento de erros de envio** | Pronto | Token expirado, janela 24h, rate limit, rede |
| **Resposta automática inicial** | Pronto | `sendAutoReply` envia mensagem real quando conversa é nova |
| **Configuração por tenant** | Pronto | Tabela `whatsapp_settings` com `accessToken`, `phoneNumberId`, etc. |
| **Embedded Signup** | Pronto | Botão "Conectar WhatsApp" → popup Meta → captura automática de credenciais |
| **Frontend de configuração** | Pronto | 4 estados visuais, zero campos técnicos |
| **Frontend de conversas** | Pronto | Lista de conversas, detalhe com mensagens, reply manual |
| **Motor de disponibilidade** | Pronto | Calcula slots livres (working_hours - break - blocked_times - appointments) |
| **CRUD de agendamentos** | Pronto | Criar, listar, alterar status, cancelar |
| **279 testes passando** | Pronto | Cobertura de todos os módulos |

---

## 2. O QUE FALTA PARA O BOT FUNCIONAR

### 2.1 — Credenciais da Plataforma (BLOQUEANTE)

Sem estas 3 variáveis de ambiente, o Embedded Signup não funciona e o bot não consegue se conectar:

| Variável | Onde obter | Para que serve |
|---|---|---|
| `META_APP_ID` | Meta for Developers → App Dashboard | Identifica o app do PRONTEI no Facebook SDK |
| `META_APP_SECRET` | Meta for Developers → Settings → Basic | Troca `code` por `access_token` (server-side) |
| `META_CONFIG_ID` | Facebook Login for Business → Configurations | Configura o popup do Embedded Signup |

**Guia completo:** `docs/guia-meta-embedded-signup.md`

**Alternativa sem Embedded Signup:** O usuário pode usar o "Conexão manual (avançado)" no painel, inserindo diretamente o `Access Token` e `Phone Number ID` obtidos no Meta Business. Neste caso, as 3 variáveis acima NÃO são necessárias.

### 2.2 — Configuração do Webhook na Meta (BLOQUEANTE)

Na página do app no Meta for Developers, é necessário configurar:

| Campo | Valor |
|---|---|
| **Callback URL** | `https://prontei.manus.space/api/whatsapp/webhook` |
| **Verify Token** | Qualquer string segura (ex: `prontei_verify_2024`) |
| **Campos assinados** | `messages` (obrigatório) |

O mesmo `Verify Token` deve ser salvo no campo `webhookVerifyToken` da tabela `whatsapp_settings` do tenant, OU na variável de ambiente `WHATSAPP_WEBHOOK_VERIFY_TOKEN` para setup inicial.

### 2.3 — Chatbot Conversacional (NÃO BLOQUEANTE, mas essencial para "bot")

Hoje o PRONTEI responde com uma **mensagem automática fixa** quando uma conversa nova é aberta. Ele **NÃO** interpreta o que o cliente escreveu e **NÃO** guia o agendamento por mensagem.

Para ter um **bot de agendamento pelo WhatsApp**, é necessário implementar:

| Funcionalidade | Descrição | Complexidade |
|---|---|---|
| **Interpretação de intenção** | Detectar se o cliente quer agendar, cancelar, ver horários, etc. | Média (LLM ou regras) |
| **Fluxo conversacional de agendamento** | Perguntar profissional → serviço → data → horário → confirmar | Alta |
| **Integração com availability engine** | Consultar slots livres e apresentar opções ao cliente | Média |
| **Criação de agendamento via chat** | Chamar `appointment.create` a partir da conversa | Média |
| **Confirmação e cancelamento via chat** | Permitir que o cliente confirme ou cancele pelo WhatsApp | Média |
| **Gerenciamento de estado da conversa** | Saber em que etapa do fluxo o cliente está | Média |

**Estimativa:** Esta é a funcionalidade mais complexa restante. Pode ser implementada com:
- **Opção A — Regras simples:** palavras-chave ("agendar", "horários", "cancelar") + fluxo de menus numerados
- **Opção B — LLM (recomendada):** usar `invokeLLM` já disponível no template para interpretar mensagens naturais e guiar o fluxo

### 2.4 — Status de Entrega de Mensagens (NÃO BLOQUEANTE)

Hoje o webhook processa apenas mensagens (`field: "messages"`). A Meta também envia callbacks de status (`field: "statuses"`) com informações de entrega:

| Status | Significado |
|---|---|
| `sent` | Mensagem enviada ao servidor da Meta |
| `delivered` | Mensagem entregue ao dispositivo do cliente |
| `read` | Mensagem lida pelo cliente |
| `failed` | Falha na entrega |

**Implementação necessária:** Processar `change.field === "statuses"` no webhook e atualizar o campo `status` da mensagem outbound correspondente no banco.

### 2.5 — Notificações ao Operador (NÃO BLOQUEANTE)

Quando uma nova mensagem chega, o operador do salão não é notificado. Opções:

| Opção | Descrição |
|---|---|
| **Badge no sidebar** | Contador de conversas abertas no link "WhatsApp" |
| **Notificação push** | Usar `notifyOwner` já disponível no template |
| **Som/alerta na tela** | Polling ou WebSocket para atualização em tempo real |

---

## 3. PRIORIZAÇÃO — O QUE FAZER PRIMEIRO

### Nível 1 — Para o WhatsApp responder de verdade (resposta automática fixa)

Tudo já está implementado no código. Falta apenas:

1. **Configurar credenciais Meta** (META_APP_ID, META_APP_SECRET, META_CONFIG_ID) OU usar conexão manual
2. **Configurar webhook** no Meta for Developers apontando para o PRONTEI
3. **Ativar integração** no painel do salão (Conectar WhatsApp)

**Com isso, o WhatsApp já responde com a mensagem automática configurada.**

### Nível 2 — Para ter um bot de agendamento inteligente

4. **Implementar chatbot conversacional** (interpretar intenção + fluxo de agendamento)
5. **Integrar com availability engine** (consultar e apresentar slots livres)
6. **Criar agendamento via chat** (confirmar e salvar no banco)

### Nível 3 — Melhorias de experiência

7. **Status de entrega** (delivered, read) no webhook
8. **Badge de conversas abertas** no sidebar
9. **Notificação ao operador** quando nova mensagem chega
10. **Templates de mensagem** (para enviar fora da janela de 24h)

---

## 4. RESUMO EXECUTIVO

| Pergunta | Resposta |
|---|---|
| O código de envio real está implementado? | **SIM** — `sendWhatsappMessage` chama a Meta Cloud API v21.0 |
| O webhook de recebimento funciona? | **SIM** — parseia payload, cria customer, salva conversa/mensagem |
| A resposta automática é enviada de verdade? | **SIM** — se credenciais estiverem configuradas e auto-reply ativado |
| O bot interpreta mensagens e agenda? | **NÃO** — só envia resposta fixa. Chatbot conversacional não implementado |
| O que bloqueia o funcionamento agora? | **Credenciais Meta** + **Webhook configurado** no Meta for Developers |
| O que falta para ter um "bot"? | **Chatbot conversacional** com fluxo de agendamento (Etapa 20) |

---

## 5. PRÓXIMO PASSO RECOMENDADO

**Se você quer que o WhatsApp responda AGORA (resposta fixa):**
→ Configure as credenciais Meta e o webhook. Tudo já funciona.

**Se você quer um bot de agendamento inteligente:**
→ Peça a implementação da **Etapa 20 — Chatbot de Agendamento pelo WhatsApp**, que vai:
- Interpretar mensagens do cliente via LLM
- Apresentar profissionais, serviços e horários disponíveis
- Confirmar e criar agendamentos diretamente pelo chat
- Permitir cancelamento e consulta de agendamentos existentes
