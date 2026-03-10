# Prontei — Brainstorm de Design

O Prontei é um SaaS de agendamentos para microempreendedores brasileiros (salões, barbearias, estúdios). O público é leigo em tecnologia, usa celular como ferramenta principal, e precisa de uma interface que transmita profissionalismo sem intimidar.

---

<response>
<text>

## Ideia 1 — "Consultório Limpo" (Swiss Design Funcional)

**Design Movement:** Neo-Swiss / International Typographic Style aplicado a SaaS

**Core Principles:**
1. Hierarquia tipográfica rígida — cada nível de informação tem peso visual distinto
2. Grid modular de 8px com alinhamento obsessivo
3. Cor como função, não decoração — cada cor tem um papel semântico
4. Densidade informacional controlada — mostrar apenas o necessário

**Color Philosophy:** Base neutra com cinza quente (não frio). Accent em verde-esmeralda (#059669) para ações positivas e confirmações — transmite "tudo certo, pode confiar". Vermelho coral (#DC2626) apenas para alertas. Fundo off-white (#FAFAF9) para reduzir fadiga visual em uso prolongado.

**Layout Paradigm:** Sidebar fixa à esquerda (240px desktop) com ícones + labels. Conteúdo em coluna única com cards de largura total. No mobile, sidebar colapsa para bottom navigation com 4 itens + FAB central para "Novo Agendamento".

**Signature Elements:**
1. Status pills com cores semânticas (pending=amber, confirmed=green, cancelled=red)
2. Timeline vertical para a agenda do dia, com blocos proporcionais à duração

**Interaction Philosophy:** Feedback imediato e silencioso. Toasts discretos no canto. Sem modais desnecessários — preferir inline editing e expansão de cards.

**Animation:** Transições de 200ms ease-out para expansão de cards. Skeleton loading para dados. Sem animações de entrada em páginas — conteúdo aparece pronto.

**Typography System:** DM Sans (headings, 600-700) + Inter (body, 400-500). Tamanhos: h1=28px, h2=22px, h3=18px, body=14px, caption=12px. Line-height generoso (1.6 para body).

</text>
<probability>0.08</probability>
</response>

---

<response>
<text>

## Ideia 2 — "Balcão Digital" (Warm Craft)

**Design Movement:** Warm Minimalism com toques de design editorial brasileiro

**Core Principles:**
1. Calor humano — a interface deve parecer feita por gente, não por máquina
2. Espaço generoso — respira como uma revista bem diagramada
3. Micro-texturas sutis — não é flat puro, tem profundidade tátil
4. Linguagem visual brasileira — cores e formas que remetem ao cotidiano

**Color Philosophy:** Paleta inspirada em materiais naturais. Fundo creme (#FDF8F0) como papel artesanal. Primary em terracota (#C2410C) — cor quente, acolhedora, associada a comércio de bairro. Secondary em azul-petróleo (#0E7490) para contraste. Accent em dourado suave (#D97706) para destaques. Texto em marrom escuro (#292524) em vez de preto puro.

**Layout Paradigm:** Layout assimétrico com sidebar estreita (64px ícones-only, expande para 256px no hover). Área principal usa grid de 2 colunas no desktop: coluna esquerda (agenda/calendário) ocupa 60%, coluna direita (detalhes/ações rápidas) ocupa 40%. No mobile, stack vertical com swipe entre seções.

**Signature Elements:**
1. Cards com borda arredondada (16px) e sombra suave com tom quente (shadow-amber-100)
2. Ilustrações de linha fina (stroke icons) customizadas para cada seção
3. Micro-pattern de pontos sutis no fundo de seções de destaque

**Interaction Philosophy:** Gestos naturais — arrastar para reagendar, swipe para cancelar. Confirmações com micro-animações de check (Lottie). Formulários em etapas (stepper) para não sobrecarregar.

**Animation:** Spring physics para modais e drawers (framer-motion). Cards entram com fade-up suave (150ms). Transições de página com crossfade. Hover em cards eleva sombra gradualmente.

**Typography System:** Outfit (headings, 500-700) — geométrica mas amigável + Source Sans 3 (body, 400-500). Tamanhos: h1=32px, h2=24px, h3=18px, body=15px, caption=13px. Tracking levemente aberto nos headings (+0.02em).

</text>
<probability>0.06</probability>
</response>

---

<response>
<text>

## Ideia 3 — "Neon Agenda" (Dark Mode Produtivo)

**Design Movement:** Dark UI Produtivo inspirado em ferramentas de dev (Linear, Raycast)

**Core Principles:**
1. Dark-first — reduz fadiga em uso prolongado, especialmente à noite
2. Contraste cirúrgico — informação importante brilha, o resto recua
3. Densidade alta — mais informação por tela, menos cliques
4. Velocidade percebida — tudo parece instantâneo

**Color Philosophy:** Fundo em cinza muito escuro (#09090B) com camadas de elevação (#18181B, #27272A). Primary em verde-limão (#84CC16) — vibrante, energético, impossível de ignorar. Secondary em violeta (#8B5CF6) para categorias e tags. Texto principal em cinza claro (#E4E4E7). Bordas em branco 8% opacity para separação sutil.

**Layout Paradigm:** Command-palette first — Cmd+K abre busca global. Sidebar compacta (48px colapsada) com tooltips. Conteúdo em grid denso com rows compactas (40px height). Agenda em formato de tabela/lista, não calendário visual. No mobile, bottom sheet para ações + lista scrollável.

**Signature Elements:**
1. Glow sutil no hover de elementos interativos (box-shadow com cor primary em 20% opacity)
2. Badges com gradiente neon para status
3. Keyboard shortcuts visíveis em tooltips

**Interaction Philosophy:** Keyboard-first com mouse como fallback. Atalhos para tudo. Inline editing sem modais. Bulk actions com multi-select. Context menu rico no right-click.

**Animation:** Rápida e funcional — 100ms para hovers, 150ms para transições. Sem animações decorativas. Loading states com shimmer escuro. Transições de página instantâneas (no animation).

**Typography System:** JetBrains Mono (headings e dados, 500-700) — monospace para alinhamento de números + Geist Sans (body, 400-500). Tamanhos compactos: h1=24px, h2=20px, h3=16px, body=13px, caption=11px. Tudo uppercase nos labels de seção.

</text>
<probability>0.04</probability>
</response>
