# Decisões de Negócio — blocked_times (Etapa 13)

## Ajuste no schema

A tabela `blocked_times` já existe no schema Drizzle com os campos: id, establishmentId, professionalId (opcional), startDatetime, endDatetime, reason, isAllDay, createdAt, updatedAt.

**Campos adicionais necessários para o MVP:**
- `title` (varchar 200, obrigatório) — nome curto do bloqueio (ex: "Férias", "Folga")
- `isActive` (boolean, default true) — para soft delete

Esses campos serão adicionados ao schema.

## Decisão 1 — Sobreposição entre bloqueios

**Decisão: permitir sobreposição.**

Justificativa: bloqueios são exceções informativas (férias, folga, consulta). Impedir sobreposição adicionaria complexidade desnecessária ao MVP. O motor de disponibilidade (Etapa 14) tratará bloqueios como "período indisponível" — dois bloqueios no mesmo horário têm o mesmo efeito de um.

## Decisão 2 — Edição de bloqueios antigos

**Decisão: permitir edição de bloqueios antigos.**

Justificativa: o dono pode precisar corrigir um motivo ou título retroativamente. Bloqueios passados não afetam a agenda futura. Impedir edição não traz benefício no MVP.

## Decisão 3 — Exclusão: soft delete vs hard delete

**Decisão: soft delete via campo `isActive`.**

Justificativa: manter histórico de bloqueios é útil para auditoria e para o motor de disponibilidade (que filtra por isActive). Hard delete perderia informação sem ganho.

## Decisão 4 — Bloqueios no passado

**Decisão: permitir criar bloqueios no passado.**

Justificativa: o dono pode precisar registrar retroativamente uma ausência que já ocorreu (ex: "ontem o profissional faltou"). Impedir criação no passado frustraria o usuário sem benefício real.
