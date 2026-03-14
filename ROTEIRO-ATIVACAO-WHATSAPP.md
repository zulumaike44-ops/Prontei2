# Roteiro de Ativação do WhatsApp — Prontei

**Guia completo para ativar o chatbot de agendamento via WhatsApp para salões, barbearias, clínicas e consultórios.**

---

## Visão Geral

Este roteiro orienta o processo completo de ativação do WhatsApp com chatbot de agendamento automático no Prontei. Ao final, o salão terá um número de WhatsApp que recebe mensagens dos clientes e agenda automaticamente, sem intervenção humana.

**Tempo estimado:** 30 a 45 minutos para a configuração completa.

**Pré-requisitos:**
- Conta ativa no Prontei (https://prontei.manus.space)
- Um número de WhatsApp dedicado para o salão (pode ser o mesmo do celular ou um chip separado)
- Acesso ao celular com o WhatsApp do salão para escanear o QR Code

---

## ETAPA 1 — Cadastro no Prontei

O primeiro passo é criar a conta do salão na plataforma.

**1.1** Acesse **https://prontei.manus.space** e clique em **"Entrar"** ou **"Começar agora"**.

**1.2** Faça login com sua conta (Google, e-mail ou outro método disponível).

**1.3** Na tela de boas-vindas, preencha os dados do estabelecimento:

| Campo | O que preencher | Exemplo |
|-------|----------------|---------|
| Nome do estabelecimento | Nome completo do salão | Barbearia do João |
| Tipo de negócio | Selecione o tipo | Barbearia |
| Telefone | Telefone de contato | (33) 99840-5811 |
| Endereço | Endereço completo (opcional) | Rua das Flores, 123 |

**1.4** Clique em **"Salvar"** para criar o estabelecimento.

---

## ETAPA 2 — Cadastrar Profissionais

Cadastre todos os profissionais que atendem no salão. Cada profissional terá sua própria agenda.

**2.1** No menu lateral, clique em **"Profissionais"**.

**2.2** Clique em **"Novo profissional"** e preencha:

| Campo | O que preencher | Exemplo |
|-------|----------------|---------|
| Nome | Nome do profissional | João Silva |
| Telefone | Celular do profissional (opcional) | (33) 99999-0000 |
| E-mail | E-mail do profissional (opcional) | joao@email.com |

**2.3** Repita para cada profissional do salão.

> **Dica:** Se o salão tem apenas um barbeiro (o próprio dono), cadastre apenas ele. O chatbot vai pular a etapa de "escolher profissional" automaticamente quando houver só um.

---

## ETAPA 3 — Cadastrar Serviços

Cadastre todos os serviços oferecidos pelo salão com seus respectivos preços e durações.

**3.1** No menu lateral, clique em **"Serviços"**.

**3.2** Clique em **"Novo serviço"** e preencha:

| Campo | O que preencher | Exemplo |
|-------|----------------|---------|
| Nome do serviço | Nome claro e objetivo | Corte Masculino |
| Duração | Tempo em minutos | 30 |
| Preço | Valor em reais | 40,00 |

**3.3** Repita para cada serviço. Exemplos comuns para barbearias:

| Serviço | Duração sugerida | Preço (exemplo) |
|---------|-----------------|-----------------|
| Corte Masculino | 30 min | R$ 35,00 - R$ 50,00 |
| Barba | 20 min | R$ 25,00 - R$ 35,00 |
| Corte + Barba | 50 min | R$ 55,00 - R$ 75,00 |
| Sobrancelha | 10 min | R$ 10,00 - R$ 15,00 |
| Pigmentação | 40 min | R$ 60,00 - R$ 80,00 |
| Corte Infantil | 20 min | R$ 25,00 - R$ 35,00 |

**3.4** Após criar os serviços, **vincule cada serviço aos profissionais** que o realizam. Na tela do serviço, selecione quais profissionais atendem aquele serviço.

> **Importante:** O chatbot só mostra serviços que estejam vinculados a pelo menos um profissional. Se um serviço não estiver vinculado, ele não aparecerá no menu do WhatsApp.

---

## ETAPA 4 — Configurar Horários de Funcionamento

Configure os dias e horários em que cada profissional atende. Sem essa configuração, o chatbot não consegue oferecer horários disponíveis.

**4.1** No menu lateral, clique em **"Profissionais"**.

**4.2** Clique no profissional desejado e vá até a seção **"Horários de trabalho"**.

**4.3** Para cada dia da semana, configure:

| Campo | O que preencher | Exemplo |
|-------|----------------|---------|
| Dia ativo | Marque os dias que trabalha | Seg a Sáb |
| Hora início | Horário de abertura | 09:00 |
| Hora fim | Horário de fechamento | 19:00 |
| Intervalo (opcional) | Horário de almoço | 12:00 - 13:00 |

**4.4** Exemplo de grade semanal para uma barbearia:

| Dia | Horário | Intervalo |
|-----|---------|-----------|
| Segunda | 09:00 - 19:00 | 12:00 - 13:00 |
| Terça | 09:00 - 19:00 | 12:00 - 13:00 |
| Quarta | 09:00 - 19:00 | 12:00 - 13:00 |
| Quinta | 09:00 - 19:00 | 12:00 - 13:00 |
| Sexta | 09:00 - 19:00 | 12:00 - 13:00 |
| Sábado | 09:00 - 14:00 | — |
| Domingo | Fechado | — |

**4.5** Clique em **"Salvar horários"**.

> **Atenção:** Esta é a etapa mais importante. Se os horários não estiverem cadastrados, o chatbot vai responder "não há horários disponíveis" para os clientes.

---

## ETAPA 5 — Criar Instância na Z-API

A Z-API é o serviço que conecta o WhatsApp do salão ao Prontei. Cada salão precisa de uma instância própria.

**5.1** Acesse **https://z-api.io** e crie uma conta (ou faça login se já tiver).

**5.2** No painel da Z-API, clique em **"Criar nova instância"**.

**5.3** Dê um nome para a instância (ex: "Barbearia do João") e clique em **"Criar"**.

**5.4** Após criar, a Z-API mostrará os dados da instância. Anote os 3 valores:

| Dado | Onde encontrar | Exemplo |
|------|---------------|---------|
| **Instance ID** | Na página da instância, campo "ID da instância" | `3F006F9F9E8FB121D3764A9C06F44763` |
| **Instance Token** | Na página da instância, campo "Token da instância" | `8B02F64979BF7613E9405734` |
| **Client-Token** | Em **Segurança** no painel da conta Z-API | `Fac749ddd94ef41688f251dc8695d69d2S` |

> **Onde encontrar o Client-Token:** No painel da Z-API, clique no seu perfil/conta → **Segurança** → copie o **Token de segurança**. Este token é da conta, não da instância.

**5.5** Conecte o WhatsApp à instância:
- Na página da instância, clique em **"Gerar QR Code"**
- Abra o WhatsApp no celular do salão
- Vá em **Configurações → Aparelhos conectados → Conectar aparelho**
- Escaneie o QR Code exibido na tela
- Aguarde a confirmação "Conectado"

**Custo:** R$ 99,90/mês por instância (plano Starter). A Z-API oferece um período de teste gratuito (TRIAL) de alguns dias.

---

## ETAPA 6 — Configurar Webhook na Z-API

O webhook é o que permite que as mensagens recebidas no WhatsApp cheguem ao Prontei.

**6.1** Na página da instância na Z-API, vá em **"Webhooks"**.

**6.2** Configure a URL do webhook:

| Campo | Valor |
|-------|-------|
| URL do webhook | `https://prontei.manus.space/api/whatsapp/webhook` |

**6.3** Marque os eventos que deseja receber (recomendado: **Mensagens recebidas**).

**6.4** Salve a configuração.

> **Nota:** A URL do webhook é sempre a mesma para todos os salões: `https://prontei.manus.space/api/whatsapp/webhook`. O sistema identifica automaticamente qual salão está recebendo a mensagem pelo Instance ID.

---

## ETAPA 7 — Conectar WhatsApp no Prontei

Agora vamos conectar as credenciais da Z-API ao Prontei.

**7.1** No Prontei, clique em **"WhatsApp"** no menu lateral.

**7.2** Clique em **"Conectar WhatsApp"** ou **"Configurar credenciais"**.

**7.3** Preencha os 3 campos com os dados anotados na Etapa 5:

| Campo no Prontei | Valor da Z-API |
|-------------------|---------------|
| Instance ID | ID da instância (copiado da Z-API) |
| Instance Token | Token da instância (copiado da Z-API) |
| Client Token | Token de segurança da conta (copiado da Z-API) |

**7.4** Clique em **"Salvar e Conectar"**.

**7.5** O status deve mudar para **"Conectado"** (indicador verde). Se aparecer erro, verifique se os dados foram copiados corretamente e se a instância está conectada no painel da Z-API.

---

## ETAPA 8 — Testar o Chatbot

Com tudo configurado, é hora de testar o chatbot de agendamento.

**8.1** De um **outro celular** (não o do salão), envie uma mensagem para o número do WhatsApp do salão.

**8.2** O chatbot deve responder automaticamente com o menu de opções:

```
Olá! Bem-vindo(a) à Barbearia do João! 😊

O que você gostaria de fazer?

1 - Agendar um horário
2 - Ver meus agendamentos
3 - Cancelar um agendamento

Digite o número da opção desejada.
```

**8.3** Teste o fluxo completo de agendamento:

| Passo | O que o cliente digita | O que o bot responde |
|-------|----------------------|---------------------|
| 1 | `1` | Lista de serviços disponíveis |
| 2 | Número do serviço (ex: `1`) | Lista de profissionais (se houver mais de um) |
| 3 | Número do profissional (ex: `1`) | Datas disponíveis nos próximos dias |
| 4 | Número da data (ex: `1`) | Horários disponíveis naquele dia |
| 5 | Número do horário (ex: `3`) | Resumo do agendamento + confirmação |
| 6 | `1` (confirmar) | Agendamento confirmado com detalhes |

**8.4** Após confirmar, verifique no Prontei:
- O agendamento deve aparecer em **"Agendamentos"** e na **"Agenda"**
- O cliente deve aparecer em **"Clientes"** (criado automaticamente)
- A conversa deve aparecer em **"WhatsApp"** → conversas

**Comandos úteis durante a conversa:**

| Comando | O que faz |
|---------|-----------|
| `menu` ou `inicio` | Volta ao menu principal |
| `voltar` | Volta ao passo anterior |
| `cancelar` | Cancela o agendamento em andamento |
| `horarios` | Mostra próximos agendamentos |

---

## ETAPA 9 — Validação Final

Antes de liberar para os clientes reais, confirme todos os itens:

| Verificação | Como testar | Esperado |
|-------------|------------|----------|
| Profissionais cadastrados | Menu lateral → Profissionais | Todos os profissionais listados |
| Serviços cadastrados | Menu lateral → Serviços | Todos os serviços com preço e duração |
| Horários configurados | Profissionais → Horários | Todos os dias de trabalho preenchidos |
| Serviços vinculados | Serviços → Profissionais | Cada serviço vinculado aos profissionais corretos |
| WhatsApp conectado | Menu lateral → WhatsApp | Status "Conectado" (verde) |
| Bot respondendo | Enviar mensagem de outro celular | Menu de opções aparece |
| Agendamento completo | Fazer agendamento teste | Agendamento aparece na agenda |
| Cliente criado | Menu lateral → Clientes | Cliente do teste aparece na lista |

---

## Resumo das Etapas

| Etapa | Ação | Onde |
|-------|------|------|
| 1 | Cadastrar o salão no Prontei | prontei.manus.space |
| 2 | Cadastrar profissionais | Prontei → Profissionais |
| 3 | Cadastrar serviços e vincular aos profissionais | Prontei → Serviços |
| 4 | Configurar horários de trabalho | Prontei → Profissionais → Horários |
| 5 | Criar instância na Z-API e conectar WhatsApp | z-api.io |
| 6 | Configurar webhook na Z-API | z-api.io → Webhooks |
| 7 | Conectar credenciais Z-API no Prontei | Prontei → WhatsApp |
| 8 | Testar o chatbot de agendamento | Enviar mensagem de outro celular |
| 9 | Validação final | Checklist completo |

---

## Custos

| Item | Valor | Recorrência |
|------|-------|-------------|
| Prontei | A definir | Mensal |
| Z-API (por instância) | R$ 99,90 | Mensal |
| **Total mínimo** | **R$ 99,90 + Prontei** | **Mensal** |

> Cada salão/barbearia precisa de uma instância Z-API própria. O custo da Z-API é por número de WhatsApp conectado.

---

## Problemas Comuns e Soluções

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| Bot não responde mensagens | Webhook não configurado na Z-API | Configurar URL do webhook (Etapa 6) |
| "Não há horários disponíveis" | Profissional sem horários cadastrados | Cadastrar horários de trabalho (Etapa 4) |
| Serviço não aparece no bot | Serviço não vinculado a profissional | Vincular serviço ao profissional (Etapa 3.4) |
| Status "Desconectado" no Prontei | Credenciais incorretas ou instância offline | Verificar dados na Z-API e reconectar (Etapa 7) |
| Erro ao salvar credenciais | Client-Token não preenchido | Copiar o Client-Token da aba Segurança da Z-API |
| WhatsApp desconectou sozinho | Celular ficou sem internet ou WhatsApp foi deslogado | Reconectar via QR Code na Z-API (Etapa 5.5) |
| Agendamento não aparece na agenda | Horário ou data incorretos | Verificar se a data está dentro dos horários configurados |

---

## Suporte

Em caso de dúvidas ou problemas durante a ativação, entre em contato pelo canal de suporte do Prontei.
