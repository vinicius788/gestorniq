# GestorNiq (Founder Metrics Studio)

Plataforma web para founders acompanharem métricas SaaS (MRR/ARR, crescimento de usuários, valuation) com autenticação via Supabase e billing via Stripe.

## Stack
- React + TypeScript + Vite
- Supabase (Auth, Postgres, RLS, Edge Functions)
- Stripe (Checkout, Portal, Webhook)

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Build e testes
```bash
npm run lint
npm run test
npm run build
```

## Variáveis de ambiente
Use `.env.example` como base.

Frontend:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Edge Functions (Supabase Secrets):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `APP_URL`
