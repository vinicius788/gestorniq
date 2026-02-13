# GestorNiq Go-Live Checklist

## 1) Banco e segurança
- [ ] Aplicar migrations mais recentes no Supabase, incluindo `20260213193000_release_security_hardening.sql`.
- [ ] Confirmar que `subscriptions` não possui policy de `UPDATE` para `authenticated`.
- [ ] Confirmar que `trials` não possui policy de `UPDATE` para `authenticated`.
- [ ] Confirmar que `check_trial_expiry()` não é executável por `anon`/`authenticated`.

## 2) Edge Functions (auth e billing)
- [ ] Deploy de `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook`.
- [ ] Confirmar no `supabase/config.toml`:
  - [ ] `create-checkout.verify_jwt = true`
  - [ ] `customer-portal.verify_jwt = true`
  - [ ] `check-subscription.verify_jwt = true`
  - [ ] `stripe-webhook.verify_jwt = false`
- [ ] Configurar secrets obrigatórios nas Functions:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (para `check-subscription` e `stripe-webhook`)
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET` (webhook)
  - [ ] `STRIPE_PRICE_STARTER`
  - [ ] `STRIPE_PRICE_PRO`
  - [ ] `APP_URL` (ex.: `https://app.gestorniq.com`)

## 3) Stripe
- [ ] Webhook do Stripe apontando para `stripe-webhook` em produção.
- [ ] Eventos habilitados no webhook:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Price IDs em produção conferem com planos Starter/Pro.

## 4) Fluxos críticos (smoke tests)
- [ ] Usuário autenticado cria checkout com sucesso.
- [ ] Usuário não autenticado recebe bloqueio nos endpoints sensíveis.
- [ ] Usuário não consegue alterar `subscriptions`/`trials` via client.
- [ ] Portal do cliente abre corretamente.
- [ ] Cancelamento/refund atualiza estado via webhook.
- [ ] Trial expirado bloqueia acesso e redireciona para billing.
- [ ] Botão "View Demo" funciona para usuário não autenticado (passa por auth e cai no dashboard demo).

## 5) Observabilidade e rollback
- [ ] Logs das Edge Functions sem erros 5xx nas primeiras horas.
- [ ] Alertas de erro habilitados (Supabase + frontend).
- [ ] Plano de rollback validado (reverter deploy frontend + functions).
