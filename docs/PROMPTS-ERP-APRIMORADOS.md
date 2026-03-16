# 10 Prompts Otimizados para Desenvolvimento de ERP SaaS (Varejo de Moda) com o Manus

Estes prompts foram reescritos aplicando as melhores práticas de engenharia de software, arquitetura de sistemas e regras de negócio específicas para o varejo de moda brasileiro. Eles foram projetados para serem usados em sequência com o Manus, garantindo que o contexto seja mantido e que o resultado final seja um sistema coeso, escalável e pronto para produção.

---

## 🔷 PROMPT 1 — ARQUITETURA MESTRA E FUNDAÇÕES

**Contexto:** Este é o primeiro passo do projeto. Você atuará como um Arquiteto de Software Sênior. Nosso objetivo é construir um ERP SaaS em nuvem para uma loja de varejo de moda (roupas, calçados, acessórios).

**Tarefa:** Projete a arquitetura de software completa e o blueprint técnico do sistema.

**Requisitos Técnicos e de Negócio:**
1. **Padrões de Projeto:** Utilize Clean Architecture e Domain-Driven Design (DDD) para separar as regras de negócio da infraestrutura.
2. **Stack Tecnológica:** Defina uma stack moderna e escalável (ex: Node.js/NestJS ou Python/FastAPI no backend; React/Next.js no frontend; PostgreSQL como banco de dados principal).
3. **Módulos Principais:** Defina os limites de contexto (Bounded Contexts) para: PDV, Estoque (com grade de cor/tamanho), Financeiro, CRM/Clientes, Fiscal (NF-e/NFC-e), Caixa Operacional e Admin/Segurança.
4. **Infraestrutura Cloud:** Especifique a topologia na AWS ou GCP, incluindo balanceamento de carga, alta disponibilidade, CDN para imagens de produtos e estratégia de cache (Redis).
5. **Integração:** Defina o padrão de comunicação entre os módulos (ex: APIs RESTful, mensageria assíncrona com RabbitMQ/Kafka para eventos como "venda concluída").

**Entregáveis Esperados:**
- Documento detalhado descrevendo a arquitetura.
- Estrutura de pastas sugerida para o repositório (monorepo ou microserviços).
- Diagrama C4 (Nível 1 e 2) em formato Mermaid.

---

## 🔷 PROMPT 2 — MODELAGEM DO BANCO DE DADOS

**Contexto:** Baseado na arquitetura definida no Prompt 1, você agora atuará como um Especialista em Banco de Dados (DBA) e Modelagem de Dados.

**Tarefa:** Projete o esquema de banco de dados relacional (PostgreSQL) para suportar todos os módulos do ERP.

**Requisitos Técnicos e de Negócio:**
1. **Normalização e Performance:** O modelo deve estar na 3ª Forma Normal (3FN), mas prever índices otimizados para consultas pesadas (ex: relatórios de vendas).
2. **Padrões de Tabela:** Todas as tabelas devem incluir UUID como chave primária, timestamps (`created_at`, `updated_at`) e suporte a Soft Delete (`deleted_at`).
3. **Entidades Críticas:**
   - **Produtos:** Suporte a produtos simples e produtos com variações (matriz de grade: Tamanho x Cor), SKUs únicos e códigos de barras (EAN-13).
   - **Vendas e Financeiro:** Relacionamento forte entre Cabeçalho de Venda, Itens da Venda, Contas a Receber e Movimentações de Caixa.
   - **Fiscal:** Tabelas preparadas para armazenar dados tributários brasileiros (NCM, CFOP, CST, ICMS).
4. **Auditoria:** Crie uma estratégia para rastrear quem alterou o quê (tabelas de log ou triggers de auditoria).

**Entregáveis Esperados:**
- Script SQL DDL completo para criação das tabelas principais.
- Diagrama Entidade-Relacionamento (ER) em formato Mermaid.
- Explicação das decisões de modelagem para a grade de produtos.

---

## 🔷 PROMPT 3 — MÓDULO DE PONTO DE VENDA (PDV)

**Contexto:** Com o banco de dados modelado (Prompt 2), você atuará como um Especialista em Sistemas de Frente de Caixa.

**Tarefa:** Projete e detalhe o módulo de PDV (Ponto de Venda) do ERP.

**Requisitos Técnicos e de Negócio:**
1. **Usabilidade e Performance:** O PDV deve ser otimizado para operação rápida via teclado (atalhos) e leitor de código de barras. O tempo de resposta para adicionar um item deve ser inferior a 1 segundo.
2. **Resiliência:** O PDV deve possuir um modo de contingência offline (Local-First ou Service Workers) que permita continuar vendendo se a internet cair, sincronizando os dados posteriormente.
3. **Fluxos de Venda:** Suporte a vendas diretas, aplicação de descontos (percentual ou valor fixo, com limite por perfil de usuário), cancelamento de itens e da venda completa.
4. **Condicional (Bag):** Fluxo específico para moda onde o cliente leva peças para provar em casa. O sistema deve registrar a saída temporária, controlar o prazo de devolução e permitir a conversão parcial em venda.
5. **Integração de Hardware:** Arquitetura para comunicação com impressoras térmicas não fiscais e gavetas de dinheiro.

**Entregáveis Esperados:**
- Especificação técnica dos endpoints da API do PDV.
- Fluxograma (Mermaid) do processo de venda com contingência offline.
- Estrutura do payload JSON para o fechamento de uma venda.

---

## 🔷 PROMPT 4 — MÓDULO DE ESTOQUE E PRODUTOS

**Contexto:** Integrando com o PDV (Prompt 3), você atuará como um Especialista em Logística e Gestão de Estoque para Varejo de Moda.

**Tarefa:** Projete o módulo de controle de estoque e cadastro de produtos.

**Requisitos Técnicos e de Negócio:**
1. **Gestão de Grade:** O sistema deve tratar a complexidade de roupas e calçados. Um "Produto Pai" (ex: Camiseta Básica) deve ter múltiplos "Produtos Filhos/SKUs" (ex: P-Branca, M-Branca, G-Preta), cada um com seu próprio estoque e código de barras.
2. **Movimentações:** Rastreabilidade total usando o método FIFO (First In, First Out). Tipos de movimento: Entrada por Compra, Saída por Venda, Saída para Condicional, Retorno de Condicional, Troca, Devolução, Ajuste de Inventário e Perda/Roubo.
3. **Alertas e Reposição:** Lógica para cálculo de estoque mínimo de segurança e geração de alertas de reposição baseados no giro do produto (Curva ABC).
4. **Inventário Físico:** Fluxo para contagem cega de estoque usando coletores de dados ou smartphones, com conciliação automática das divergências.

**Entregáveis Esperados:**
- Especificação das regras de negócio para movimentação de estoque.
- Design da API para consulta rápida de disponibilidade de grade.
- Diagrama de transição de estados (Mermaid) para o ciclo de vida de um produto no estoque.

---

## 🔷 PROMPT 5 — MÓDULO FINANCEIRO E PAGAMENTOS

**Contexto:** Com as vendas ocorrendo (Prompt 3) e o estoque baixando (Prompt 4), você atuará como um Especialista em Sistemas Financeiros.

**Tarefa:** Projete o módulo financeiro e a integração de pagamentos.

**Requisitos Técnicos e de Negócio:**
1. **Contas a Receber e a Pagar:** Gestão completa do fluxo de caixa, separando o regime de competência (quando a venda ocorreu) do regime de caixa (quando o dinheiro efetivamente entrou).
2. **Integração PIX:** Arquitetura para geração de QR Code dinâmico via API bancária (ex: Banco Central/PSPs), com Webhooks para confirmação de pagamento em tempo real na tela do PDV.
3. **Integração TEF (Transferência Eletrônica de Fundos):** Fluxo de comunicação com maquininhas de cartão integradas (PinPads) para evitar erros de digitação de valores, suportando débito, crédito à vista e parcelado.
4. **Conciliação:** Estrutura para importação de arquivos OFX bancários e conciliação automática de recebimentos de cartões (descontando as taxas das adquirentes).

**Entregáveis Esperados:**
- Arquitetura de integração com gateways de pagamento (diagrama de sequência Mermaid).
- Estrutura de dados para o Plano de Contas e Centros de Custo.
- Especificação dos Webhooks de confirmação de pagamento.

---

## 🔷 PROMPT 6 — MÓDULO DE CLIENTES, CRM E COMISSÕES

**Contexto:** Para fidelizar o público do varejo de moda, você atuará como um Especialista em CRM e Regras de Comissionamento.

**Tarefa:** Projete o módulo de gestão de clientes e cálculo de comissões de vendedores.

**Requisitos Técnicos e de Negócio:**
1. **Visão 360º do Cliente:** Cadastro completo com histórico de compras, ticket médio, preferências de marcas/tamanhos, limite de crédito para compras a prazo (crediário próprio) e controle de inadimplência.
2. **Fidelização e Marketing:** Sistema de pontuação (Cashback), segmentação de clientes (RFM - Recência, Frequência, Valor) e gatilhos para envio de mensagens (ex: integração com API do WhatsApp para aviso de aniversário ou novidades na numeração do cliente).
3. **LGPD:** Conformidade com a Lei Geral de Proteção de Dados, incluindo gestão de consentimento (opt-in/opt-out) e rotina de anonimização de dados a pedido do titular.
4. **Comissionamento:** Motor de regras flexível para cálculo de comissões de vendedores. Deve suportar percentuais diferentes por categoria de produto, descontos na comissão em caso de devolução/troca, e metas de vendas escalonadas.

**Entregáveis Esperados:**
- Especificação do motor de cálculo de comissões.
- Estrutura de dados para conformidade com a LGPD.
- Fluxo de integração sugerido para disparos via WhatsApp.

---

## 🔷 PROMPT 7 — MÓDULO FISCAL BRASILEIRO

**Contexto:** Operando no Brasil, o sistema precisa estar em conformidade legal. Você atuará como um Especialista em Tributação e Sistemas Fiscais Brasileiros.

**Tarefa:** Projete o módulo de emissão de documentos fiscais eletrônicos.

**Requisitos Técnicos e de Negócio:**
1. **Documentos Suportados:** Arquitetura para emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica) no PDV e NF-e (Nota Fiscal Eletrônica) para devoluções, transferências ou vendas interestaduais.
2. **Motor Tributário:** Estrutura para armazenar e aplicar regras de impostos (ICMS, PIS, COFINS) baseadas no NCM do produto, CFOP da operação e Regime Tributário da loja (Simples Nacional ou Lucro Presumido).
3. **Comunicação SEFAZ:** Fluxo de assinatura digital de XML usando Certificado Digital A1, envio síncrono/assíncrono para os WebServices da SEFAZ, tratamento de rejeições e geração do DANFE/DANFE NFC-e com QR Code.
4. **Contingência:** Implementação das regras de contingência offline da NFC-e, garantindo a emissão do documento em papel e a transmissão posterior no prazo legal.

**Entregáveis Esperados:**
- Diagrama de sequência (Mermaid) do fluxo de emissão e autorização de uma NFC-e.
- Estrutura do motor de regras tributárias.
- Estratégia de armazenamento seguro e backup dos arquivos XML autorizados.

---

## 🔷 PROMPT 8 — MÓDULO DE CAIXA OPERACIONAL

**Contexto:** Para garantir a segurança financeira diária da loja, você atuará como um Especialista em Controle de Tesouraria de Varejo.

**Tarefa:** Projete o módulo de controle de Caixa Operacional (Turnos).

**Requisitos Técnicos e de Negócio:**
1. **Abertura e Fechamento:** Fluxo rigoroso de abertura de caixa (com registro de fundo de troco inicial) e fechamento por operador/turno.
2. **Movimentações de Gaveta:** Registro obrigatório de Sangrias (retirada de dinheiro por excesso na gaveta) e Suprimentos (entrada de troco), exigindo justificativa e, opcionalmente, aprovação de gerente.
3. **Conferência Cega:** No fechamento, o operador deve informar os valores físicos contados (dinheiro, comprovantes de cartão) ANTES do sistema revelar o valor esperado.
4. **Apuração de Diferenças:** Cálculo automático de quebras de caixa (sobras ou faltas), gerando lançamentos automáticos no módulo financeiro (Prompt 5) e relatórios de auditoria.

**Entregáveis Esperados:**
- Especificação das regras de negócio para a conferência cega.
- Endpoints da API para registro de sangrias e suprimentos.
- Modelo do relatório de fechamento de turno (Z-Read).

---

## 🔷 PROMPT 9 — RELATÓRIOS E DASHBOARD ANALÍTICO

**Contexto:** Com todos os dados transacionais fluindo, os gestores precisam de inteligência de negócio. Você atuará como um Especialista em Business Intelligence (BI) e Data Analytics.

**Tarefa:** Projete o módulo de relatórios e o Dashboard gerencial.

**Requisitos Técnicos e de Negócio:**
1. **Dashboard em Tempo Real:** Painel principal com indicadores-chave (KPIs) atualizados em tempo real: Faturamento do dia, Ticket Médio, Peças por Atendimento (PA), Taxa de Conversão e atingimento da meta mensal.
2. **Relatórios Estratégicos:**
   - Curva ABC de Produtos (mais vendidos vs. maior margem).
   - Giro de Estoque e produtos encalhados (Slow Movers).
   - DRE Simplificado (Demonstrativo de Resultados do Exercício).
   - Ranking de Vendedores.
3. **Performance de Consulta:** Como relatórios pesados podem travar o banco transacional, defina uma estratégia de leitura otimizada (ex: Read Replicas, Materialized Views no PostgreSQL ou um banco OLAP leve).
4. **Exportação:** Capacidade de exportar dados para Excel/CSV e PDF.

**Entregáveis Esperados:**
- Lista detalhada dos KPIs e suas fórmulas de cálculo.
- Estratégia de arquitetura de dados para não impactar a performance do PDV.
- Wireframe descritivo ou estrutura de componentes do Dashboard.

---

## 🔷 PROMPT 10 — ADMINISTRAÇÃO, SEGURANÇA E DEPLOY

**Contexto:** Para finalizar o sistema e prepará-lo para produção, você atuará como um Especialista em Segurança da Informação e DevOps.

**Tarefa:** Projete o módulo administrativo, as políticas de segurança e a esteira de deploy.

**Requisitos Técnicos e de Negócio:**
1. **Autenticação e Autorização:** Implementação de JWT (JSON Web Tokens) com Refresh Tokens. Controle de acesso baseado em papéis (RBAC - Role-Based Access Control) com permissões granulares (ex: "Operador de Caixa não pode aplicar desconto maior que 10%").
2. **Segurança de Aplicação:** Proteção contra as vulnerabilidades do OWASP Top 10 (SQL Injection, XSS, CSRF). Implementação de Rate Limiting nas APIs para evitar ataques de força bruta.
3. **Auditoria (Audit Trail):** Registro imutável de ações críticas (quem alterou o preço de um produto, quem excluiu um cliente, qual IP e horário).
4. **DevOps e CI/CD:** Definição de uma esteira de integração e entrega contínuas (GitHub Actions ou GitLab CI), com execução de testes automatizados (unitários e de integração) antes do deploy em produção.
5. **Backup e Disaster Recovery:** Política de backup automatizado do banco de dados (Point-in-Time Recovery) e plano de recuperação de desastres.

**Entregáveis Esperados:**
- Matriz de permissões sugerida para os perfis: Gerente, Vendedor, Caixa e Estoquista.
- Arquitetura de segurança e fluxo de autenticação.
- Script de pipeline CI/CD básico (YAML) para validação e deploy.
