# Guia de Melhores Práticas: Desenvolvendo um ERP com o Manus

Este documento estabelece a estratégia definitiva para utilizar os 10 prompts otimizados na construção de um ERP SaaS para o varejo de moda utilizando o Manus (ou outras IAs avançadas de codificação). O desenvolvimento de software complexo assistido por IA exige uma abordagem metódica, iterativa e fortemente baseada em contexto [1].

## 1. A Regra de Ouro: Arquitetura Antes do Código

O erro mais comum ao usar IA para criar sistemas complexos é pular direto para a geração de código. A IA precisa de um "mapa" claro para não se perder em alucinações ou criar dependências circulares [1].

Por isso, o **Prompt 1 (Arquitetura)** e o **Prompt 2 (Banco de Dados)** são inegociáveis. Eles geram os documentos fundacionais do projeto. Trate os artefatos gerados por esses dois primeiros prompts como a "Bíblia" do seu ERP. Nenhuma linha de código de backend ou frontend deve ser escrita antes que o diagrama de banco de dados e a arquitetura de pastas estejam aprovados por você.

## 2. O Padrão de Memória: O Arquivo `context.md`

IAs possuem janelas de contexto limitadas. Se você estiver no Prompt 8 (Caixa Operacional) e a IA esquecer como a tabela de vendas foi modelada no Prompt 2, o código gerado será incompatível.

Para resolver isso, adote a prática do **Contexto Acumulativo** [1]:
Crie um arquivo chamado `context.md` (ou `design.md`) na raiz do seu projeto. Sempre que o Manus finalizar um prompt com sucesso, peça a ele para resumir as decisões tomadas, os contratos de API (endpoints) criados e o esquema de banco de dados atualizado, e salve isso neste arquivo.

Quando iniciar uma nova sessão ou avançar para o próximo prompt, comece dizendo: *"Leia o arquivo `context.md` para entender o estado atual do projeto antes de executar o próximo prompt."*

## 3. Estratégia de Execução Iterativa

O desenvolvimento deve seguir um fluxo estrito de **Geração -> Validação -> Documentação -> Avanço**. Não jogue os 10 prompts de uma vez. Siga este ciclo para cada módulo:

| Fase | Ação do Usuário / Manus | Objetivo |
|---|---|---|
| **1. Injeção** | Enviar o Prompt Específico | Fornecer as regras de negócio e requisitos técnicos. |
| **2. Geração** | Manus cria o código/diagrama | Materializar o módulo solicitado. |
| **3. Revisão** | Pedir explicação do fluxo | Exigir que o Manus explique como os dados fluem de ponta a ponta naquele módulo [1]. |
| **4. Teste** | Manus cria e roda testes | Garantir que o módulo funciona isoladamente antes de integrar. |
| **5. Consolidação** | Atualizar o `context.md` | Salvar o estado atual para o próximo prompt não se perder. |

## 4. Modularidade e Tamanho de Arquivos

Sistemas ERP são massivos. Se você permitir que a IA crie arquivos com mais de 500 a 800 linhas, ela começará a cometer erros lógicos graves e perderá a capacidade de refatorar o código com segurança [1].

Instrua o Manus a manter os módulos pequenos. Utilize o padrão de **Clean Architecture** (solicitado no Prompt 1) para separar rotas (Controllers), regras de negócio (Use Cases/Services) e acesso a dados (Repositories). Se um arquivo ficar muito grande, peça explicitamente: *"Este arquivo está muito grande. Quebre-o em partes menores e reutilizáveis."*

## 5. Separação de Frontend e Backend

Embora o Manus seja capaz de atuar como Full-Stack, a melhor prática para ERPs é tratar o Backend (APIs, Banco de Dados, Regras Fiscais) e o Frontend (Telas do PDV, Dashboards) como projetos separados (ou pastas isoladas em um monorepo) [1].

Ao executar os prompts de módulos (Prompts 3 ao 9), peça ao Manus para **primeiro construir e testar a API (Backend)**. Somente quando a API estiver respondendo corretamente (com testes passando), peça para ele **construir a interface (Frontend)** que consome essa API.

## 6. Lidando com Regras de Negócio Complexas (Moda e Fiscal)

O varejo de moda e o sistema fiscal brasileiro possuem particularidades que confundem IAs genéricas. 

*   **Grade de Produtos (Prompt 4):** Garanta que o Manus entenda a diferença entre o "Produto Pai" (Camiseta) e o "SKU Filho" (Camiseta Branca Tamanho M). O estoque e o código de barras pertencem ao filho, não ao pai.
*   **Fiscal (Prompt 7):** A IA pode não conhecer as regras exatas de ICMS ou contingência da SEFAZ atualizadas. Use o Manus para criar a **arquitetura** (onde os impostos são calculados, como o XML é assinado), mas preveja a integração com APIs fiscais especializadas (como Focus NFe ou Arquivei) em vez de tentar codificar todo o motor tributário do zero.

## Conclusão

Construir um ERP com IA não é sobre automatizar a digitação, mas sobre **orquestrar um desenvolvedor sênior incansável**. Ao seguir a ordem dos 10 prompts, mantendo um arquivo de contexto rigoroso e validando cada módulo antes de avançar, você transformará semanas de planejamento em dias de execução estruturada.

---
**Referências**
[1] gigacodes. "How I’ve Been Using AI To Build Complex Software (And What Actually Worked)". Reddit, r/ClaudeAI. Disponível em: https://www.reddit.com/r/ClaudeAI/comments/1oof1mn/how_ive_been_using_ai_to_build_complex_software/
