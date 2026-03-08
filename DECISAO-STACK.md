# Decisão de Stack — Agiliza no Zap

**Data:** 07/03/2026  
**Status:** Aprovada pelo product owner

## Arquitetura Canônica (produto final)

- Next.js (App Router)
- PostgreSQL (Supabase)
- Prisma ORM
- Supabase Auth

## Implementação Adaptada (ambiente Manus — MVP)

- Express + tRPC
- MySQL / TiDB
- Drizzle ORM
- Manus OAuth

## Motivo

A plataforma Manus fornece um ambiente pré-configurado com Drizzle/MySQL/tRPC.
Migrar para Prisma/PostgreSQL dentro do Manus exigiria 2-3 dias de retrabalho sem ganho funcional.
A implementação adaptada preserva 100% do schema lógico aprovado nas Etapas 3-4.

## Regra

Esta implementação é tratada como **adaptação ao ambiente**, não como substituição da arquitetura canônica.
Quando o produto migrar para infraestrutura própria, a arquitetura canônica será adotada.
