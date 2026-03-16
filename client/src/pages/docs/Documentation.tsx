import { useState } from "react";
import { Link } from "wouter";
import { 
  BookOpen, 
  Map, 
  GitMerge, 
  CheckCircle2, 
  ChevronRight,
  Code,
  Layout,
  Smartphone,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Documentation() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">
              P
            </div>
            <span className="font-bold text-xl">Prontei Docs</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/">
              <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Voltar ao App
              </a>
            </Link>
            <Button asChild variant="outline" size="sm">
              <a href="https://github.com/zulumaike44-ops/80734400Jr-" target="_blank" rel="noreferrer">
                <Code className="w-4 h-4 mr-2" />
                Repositório
              </a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Documentação do Sistema</h1>
          <p className="text-xl text-muted-foreground">
            Arquitetura, fluxos e roadmap do PRONTEI - Plataforma SaaS de agendamentos.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1">
            <TabsTrigger value="overview" className="py-3 flex flex-col gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="w-5 h-5" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="architecture" className="py-3 flex flex-col gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layout className="w-5 h-5" />
              <span>Arquitetura</span>
            </TabsTrigger>
            <TabsTrigger value="flows" className="py-3 flex flex-col gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GitMerge className="w-5 h-5" />
              <span>Fluxos</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="py-3 flex flex-col gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="w-5 h-5" />
              <span>Roadmap</span>
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>O que é o PRONTEI?</CardTitle>
                  <CardDescription>Plataforma SaaS multi-tenant de agendamentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    O PRONTEI é uma solução completa para microempreendedores brasileiros (salões de beleza, barbearias, clínicas de estética) gerenciarem seus agendamentos de forma automatizada.
                  </p>
                  <p>
                    O diferencial do sistema é o foco em <strong>baixo atrito</strong> para o cliente final, permitindo agendamentos rápidos via link web ou diretamente pelo WhatsApp através de um chatbot integrado.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">TypeScript</span>
                    <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">React 19</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">TailwindCSS</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Drizzle ORM</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">tRPC</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">MySQL</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas do Projeto</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Linhas de Código</span>
                      <span className="font-bold">~37.000</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Testes Automatizados</span>
                      <span className="font-bold text-green-600">370+</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cobertura de Testes</span>
                      <span className="font-bold">Alta</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status do MVP</span>
                      <span className="font-bold text-primary">100% Concluído</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-2xl font-bold mt-8 mb-4">Principais Funcionalidades</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Smartphone, title: "Agendamento Mobile-First", desc: "Interface otimizada para celular com fluxo em menos de 30s." },
                { icon: MessageSquare, title: "Chatbot WhatsApp", desc: "Integração oficial com Meta Cloud API para agendamentos via chat." },
                { icon: Layout, title: "Dashboard Administrativo", desc: "Gestão completa de agenda, profissionais, serviços e clientes." },
                { icon: CheckCircle2, title: "Notificações Automáticas", desc: "Lembretes e confirmações via WhatsApp para reduzir faltas." },
                { icon: GitMerge, title: "Rebook (Agendar Novamente)", desc: "Fluxo de 2 cliques para clientes recorrentes." },
                { icon: Code, title: "Isolamento Multi-tenant", desc: "Dados separados de forma segura por estabelecimento." },
              ].map((feature, i) => (
                <Card key={i} className="border-none shadow-sm bg-muted/50">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ARCHITECTURE TAB */}
          <TabsContent value="architecture" className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
              <CardHeader>
                <CardTitle>Arquitetura do Sistema</CardTitle>
                <CardDescription>Decisões técnicas e estrutura do projeto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none dark:prose-invert">
                  <h3>Decisões Arquiteturais (ADRs)</h3>
                  <ul>
                    <li><strong>Monorepo:</strong> Frontend e Backend no mesmo repositório para facilitar o compartilhamento de tipos via tRPC.</li>
                    <li><strong>Banco de Dados:</strong> MySQL com Drizzle ORM. Escolhido pela tipagem forte e facilidade de migrações.</li>
                    <li><strong>Autenticação:</strong> Sistema customizado baseado em cookies HTTP-only para segurança.</li>
                    <li><strong>Event Bus:</strong> Padrão Pub/Sub interno (`eventBus.ts`) para desacoplar ações (ex: enviar notificação após agendamento).</li>
                  </ul>

                  <h3>Estrutura de Diretórios</h3>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
{`prontei-repo/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes UI reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── lib/            # Utilitários e configuração tRPC
│   │   └── App.tsx         # Roteamento principal
├── server/                 # Backend Express + tRPC
│   ├── _core/              # Configuração base (Express, tRPC context)
│   ├── routers.ts          # Definição das rotas tRPC
│   ├── services/           # Lógica de negócio
│   ├── eventBus.ts         # Sistema de eventos
│   └── whatsappWebhook.ts  # Integração com Meta API
├── drizzle/                # Configuração do Banco de Dados
│   ├── schema.ts           # Definição das tabelas
│   └── migrations/         # Arquivos de migração SQL
└── shared/                 # Código compartilhado (tipos, validações)`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FLOWS TAB */}
          <TabsContent value="flows" className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
              <CardHeader>
                <CardTitle>Jornada do Cliente</CardTitle>
                <CardDescription>Fluxo otimizado para conversão</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative border-l-2 border-primary/30 ml-4 md:ml-8 space-y-8 pb-4">
                  {[
                    { title: "1. Descoberta", desc: "Cliente acessa o link do estabelecimento (ex: prontei.com/agendar/salao-beleza) via Instagram ou WhatsApp." },
                    { title: "2. Seleção Rápida", desc: "Escolhe o serviço. O sistema imediatamente sugere 'QuickSlots' (horários mais próximos disponíveis)." },
                    { title: "3. Personalização (Opcional)", desc: "Se não quiser o QuickSlot, pode escolher um profissional específico e ver a agenda completa." },
                    { title: "4. Identificação", desc: "Preenche apenas Nome e Telefone. O sistema usa localStorage para auto-preencher em visitas futuras." },
                    { title: "5. Confirmação", desc: "Agendamento concluído. O sistema dispara um evento que envia uma mensagem de confirmação via WhatsApp." },
                    { title: "6. Gestão Pós-Agendamento", desc: "Cliente recebe um link único (Magic Link) para cancelar ou reagendar sem precisar criar senha." }
                  ].map((step, i) => (
                    <div key={i} className="relative pl-8">
                      <div className="absolute -left-[21px] top-1 w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-primary">
                        {i + 1}
                      </div>
                      <h4 className="text-lg font-bold">{step.title}</h4>
                      <p className="text-muted-foreground mt-1">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ROADMAP TAB */}
          <TabsContent value="roadmap" className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
              <CardHeader>
                <CardTitle>Roadmap de Desenvolvimento</CardTitle>
                <CardDescription>O que já foi feito e os próximos passos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      Fase 1: MVP Concluído
                    </h3>
                    <ul className="space-y-2 ml-7 list-disc text-muted-foreground">
                      <li>Estrutura base (React + tRPC + Drizzle)</li>
                      <li>Gestão de Estabelecimento (Onboarding)</li>
                      <li>Gestão de Profissionais e Serviços</li>
                      <li>Horários de Trabalho e Bloqueios</li>
                      <li>Página Pública de Agendamento</li>
                      <li>Integração WhatsApp (Chatbot básico)</li>
                      <li><strong>Recente:</strong> QuickSlots e Rebook (Agendar Novamente)</li>
                      <li><strong>Recente:</strong> Notificações reais via WhatsApp</li>
                      <li><strong>Recente:</strong> Auto-preenchimento e PWA</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary">
                      <ChevronRight className="w-5 h-5" />
                      Fase 2: Próximos Passos (Em Breve)
                    </h3>
                    <ul className="space-y-2 ml-7 list-disc text-muted-foreground">
                      <li>Integração com Google Calendar (Sincronização bidirecional)</li>
                      <li>Relatórios e Analytics (Faturamento, serviços mais populares)</li>
                      <li>Pagamentos Online (Sinal/Adiantamento via Pix/Stripe)</li>
                      <li>Gestão de Pacotes e Assinaturas</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-muted-foreground">
                      <Map className="w-5 h-5" />
                      Fase 3: Futuro
                    </h3>
                    <ul className="space-y-2 ml-7 list-disc text-muted-foreground">
                      <li>Aplicativo Nativo (React Native) para os profissionais</li>
                      <li>Programa de Fidelidade para clientes finais</li>
                      <li>Campanhas de Marketing via WhatsApp em massa</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
