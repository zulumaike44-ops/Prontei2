# Guia de Deployment do PRONTEI

## Visão Geral

O PRONTEI é uma aplicação full-stack TypeScript que pode ser deployada em diversos ambientes. Este guia fornece instruções para deployment permanente.

## Pré-requisitos

- Node.js 18+ e pnpm
- MySQL 8.0+
- Credenciais Meta WhatsApp (APP_ID, APP_SECRET, CONFIG_ID)

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Meta WhatsApp Configuration
META_APP_ID=972309978694761
META_APP_SECRET=1cf12769926041b77ac80c334ed58c70
META_CONFIG_ID=1660312611985385
WHATSAPP_WEBHOOK_VERIFY_TOKEN=prontei_verify_2024

# Database
DATABASE_URL=mysql://user:password@host:3306/prontei

# Server
PORT=3000

# Client
VITE_API_URL=https://your-domain.com
```

## Build e Deploy

### 1. Instalar Dependências
```bash
pnpm install
```

### 2. Compilar o Projeto
```bash
pnpm run build
```

Isso gera:
- `/dist/public/` - Frontend compilado (HTML, CSS, JS)
- `/dist/index.js` - Backend compilado

### 3. Rodar em Produção
```bash
NODE_ENV=production node dist/index.js
```

O servidor estará disponível em `http://localhost:3000`

## Deployment em Plataformas Específicas

### Vercel
1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no painel
3. Vercel detectará automaticamente que é um monorepo
4. Deploy automático a cada push para `main`

### Railway
1. Crie um novo projeto no Railway
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Railway detectará o `package.json` e fará o build automaticamente

### Docker (para qualquer cloud)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install
RUN pnpm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Checklist de Deployment

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados MySQL criado e migrado
- [ ] Credenciais Meta WhatsApp validadas
- [ ] Testes passando (`pnpm test`)
- [ ] Build sem erros (`pnpm run build`)
- [ ] HTTPS configurado (obrigatório para webhooks WhatsApp)
- [ ] Domínio apontando para o servidor
- [ ] Webhook WhatsApp configurado em `https://seu-dominio.com/api/whatsapp/webhook`

## Monitoramento

- Logs: Verifique os logs do servidor para erros
- Health Check: Acesse `http://localhost:3000/` para verificar se está rodando
- Testes: Execute `pnpm test` regularmente

## Troubleshooting

### Erro: "Estabelecimento não encontrado"
- Certifique-se de que o usuário completou o onboarding
- Verifique se o banco de dados está acessível

### Webhook WhatsApp não funciona
- Verifique se o domínio é acessível via HTTPS
- Confirme que `WHATSAPP_WEBHOOK_VERIFY_TOKEN` está correto
- Verifique os logs do servidor para erros

### Build falha
- Limpe `node_modules` e `dist`: `rm -rf node_modules dist`
- Reinstale: `pnpm install`
- Tente novamente: `pnpm run build`

## Suporte

Para mais informações, consulte:
- [Repositório GitHub](https://github.com/zulumaike44-ops/80734400Jr-)
- Documentação em `/docs`
