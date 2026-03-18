# GestorNiq – Mapa de Dados Stripe

## Resumo
- Total de métricas no dashboard (escopo desta auditoria): 22
- Métricas já funcionando com dados reais: 12
- Métricas dependentes do Stripe: 11
- Métricas calculadas internamente: 8

## Escopo auditado
- Hooks: `src/hooks/useMetrics.tsx`, `src/hooks/useTrial.tsx`, `src/hooks/useAuth.tsx`, `src/hooks/use-toast.ts`, `src/hooks/useCompany.tsx`
- Páginas: `src/pages/Dashboard.tsx`, `Revenue.tsx`, `UserGrowth.tsx`, `Valuation.tsx`, `EquityCalculator.tsx`, `Billing.tsx`, `Settings.tsx`
- Componentes de métricas: `RevenueChart`, `GrowthChart`, `UserGrowthChart`, `UserGrowthMetrics`, `DashboardSidebar`, `TrialBanner`, `InvestorPackActions`
- Edge Functions: todas em `supabase/functions/*/index.ts`
- Schema: migrations em `supabase/migrations/*.sql` (com foco nas tabelas de métricas, billing e Stripe)

## Hooks de dados (resultado da varredura)

| Hook | Métricas/estado retornado | Fonte atual | Real vs demo |
|------|---------------------------|-------------|--------------|
| `useMetrics` | `mrr`, `arr`, `newMrr`, `expansionMrr`, `churnedMrr`, `netNewMrr`, `totalUsers`, `newUsers`, `activeUsers`, `churnRate`, `arpu`, `valuation`, `valuationMultiple`, `forecast3m/6m/12m` + snapshots | Supabase (`revenue_snapshots`, `user_metrics`, `valuation_snapshots`) + cálculos em `calculateMetrics()` | Real (manual/csv/stripe) ou demo (`generateDemoData`) |
| `useTrial` | `trial`, `subscription`, `daysRemaining`, `isTrialActive`, `isTrialExpired`, `hasActiveAccess` | Supabase (`trials`, `subscriptions`) + invoke edge function `check-subscription` | Real |
| `useCompany` | `company` (inclui `data_source`, `currency`) | Supabase (`companies`) | Real |
| `useAuth` | Usuário/sessão (bridge Clerk→Supabase) | Clerk + token bridge | Não retorna métricas de negócio |
| `use-toast` | Estado de toast UI | Estado local React | Não relacionado a métricas |

## Páginas e componentes que consomem métricas

| Página/Componente | O que exibe | Fonte (hook/prop) |
|-------------------|-------------|-------------------|
| `Dashboard` | MRR, ARR, Net New MRR, Valuation, Total Users, Churn Rate, ARPU, Forecast 3/6/12m | `useMetrics()` |
| `Revenue` | MRR, New MRR, Expansion MRR, Churned MRR, histórico mensal | `useMetrics()` |
| `UserGrowth` | Total Users, New Users (cadência), Growth Rate, User Cadence, histórico | `useMetrics()` + `calculateUserCadenceMetrics()` |
| `Valuation` | Valuation base, múltiplo, Revenue/User Growth, Forecast 3/6/12m | `useMetrics()` + `calculateSuggestedMultipleBreakdown()` |
| `EquityCalculator` | Valor de equity por %, preço por ação, cenários | `useMetrics()` + `calculateEquityValue()` |
| `Billing` | Status de assinatura, plano, trial restante/expirado, próxima cobrança | `useTrial()` |
| `Settings` | Status de trial, plano, próxima cobrança, status conexão Stripe | `useTrial()` + edge functions Stripe |
| `DashboardSidebar` | Current MRR e variação | `useMetrics()` |
| `RevenueChart` | MRR trend (12 pontos) | `useMetrics().filteredRevenueSnapshots` |
| `GrowthChart` | Revenue growth rate (MoM %) | `useMetrics().filteredRevenueSnapshots` |
| `UserGrowthChart` | User base trend | `useMetrics().filteredUserMetrics` |
| `UserGrowthMetrics` | Active users, new users, DoD/WoW/MoM | `useMetrics()` |
| `InvestorPackActions` | Export CSV/PDF com KPIs e snapshots | props do `Dashboard/Valuation` alimentadas por `useMetrics()` |

## Tabela completa

| Métrica | Página | Fonte atual | Campo Stripe necessário | Status |
|---------|--------|-------------|-------------------------|--------|
| MRR | Dashboard, Revenue, Sidebar | `revenue_snapshots.mrr` | `subscription.items[].price.unit_amount`, `recurring.interval`, `interval_count`, `quantity` | ⚠️ |
| ARR | Dashboard, Valuation, Equity | `revenue_snapshots.arr` (gerado de MRR) | Nenhum direto (derivado de MRR) | ✅ |
| New MRR | Revenue, Dashboard (indireto via Net New) | `revenue_snapshots.new_mrr` | `subscription.start_date` por janela mensal | ⚠️ |
| Expansion MRR | Revenue, Dashboard (indireto via Net New) | `revenue_snapshots.expansion_mrr` | Não há campo único; derivação por delta | ⚠️ |
| Churned MRR | Revenue, Dashboard (indireto via Net New) | `revenue_snapshots.churned_mrr` | `subscription.canceled_at`/`ended_at` | ⚠️ |
| Net New MRR | Dashboard | Calculado: `new + expansion - churned` | Nenhum direto (derivado) | ⚠️ |
| Revenue por mês (histórico) | Revenue table + charts | `revenue_snapshots` por `date` | Para precisão contábil: `invoice.amount_paid`, `period_start`, `period_end` | ⚠️ |
| Status da assinatura | Billing, Settings | `subscriptions.status` | `subscription.status` | ✅ |
| Plano contratado (Smart/Pro) | Billing, Settings | `subscriptions.plan` (`free/standard`) | `subscription.items[].price.id` + mapping de catálogo | ❌ |
| Data de início do trial | useTrial (não destacada em UI) | `trials.started_at` | Nenhum (trial local) | ⚠️ |
| Dias restantes no trial | Header/Settings/Billing | Calculado de `trials.ends_at` | Nenhum | ✅ |
| Data de renovação | Billing, Settings | `subscriptions.current_period_end` | `subscription.current_period_end` | ✅ |
| Valor cobrado por mês | Pricing/Billing (fixo em texto) | Texto estático + price env | `subscription.items[].price.unit_amount` (ou `invoice.amount_paid` mensalizado) | ❌ |
| Total de usuários | Dashboard, UserGrowth | `user_metrics.total_users` | Nenhum | ✅ |
| Novos usuários por mês | Dashboard, UserGrowth | `user_metrics.new_users` | Nenhum | ✅ |
| Churn Rate | Dashboard, UserGrowth | Calculado: `churned_users / total_users` | Nenhum | ✅ |
| ARPU | Dashboard | Calculado: `mrr / active_users` | Nenhum direto | ✅ |
| Valuation calculado | Dashboard, Valuation, Equity | Calculado: `arr * multiple` ou `valuation_snapshots.valuation` | Nenhum | ✅ |
| Projeção 3m | Dashboard, Valuation | `calculateForecast()` | Nenhum | ✅ |
| Projeção 6m | Dashboard, Valuation | `calculateForecast()` | Nenhum | ✅ |
| Projeção 12m | Dashboard, Valuation | `calculateForecast()` | Nenhum | ✅ |
| Dados da calculadora de equity | Equity Calculator | Inputs locais + `metrics.valuation/arr` | Nenhum | ⚠️ |

## MÉTRICA: MRR (Monthly Recurring Revenue)
- Exibida em: Dashboard, Revenue, Sidebar, Investor Pack
- Hook responsável: `useMetrics`
- Fonte atual: `supabase:revenue_snapshots.mrr` (`source` pode ser `manual`, `csv`, `stripe`, `demo`)
- Dado necessário do Stripe: `subscription.items[].price.unit_amount`, `recurring.interval`, `recurring.interval_count`, `item.quantity`
- Status: ⚠️ parcial
- Observação: hoje vem de `sync-stripe-revenue` por estado de assinatura, não por fatura liquidada.

## MÉTRICA: ARR (Annual Recurring Revenue)
- Exibida em: Dashboard, Valuation, Equity
- Hook responsável: `useMetrics`
- Fonte atual: coluna gerada `revenue_snapshots.arr` e fallback `mrr * 12`
- Dado necessário do Stripe: nenhum direto (derivado de MRR)
- Status: ✅ pronto
- Observação: depende da qualidade do MRR.

## MÉTRICA: New MRR
- Exibida em: Revenue
- Hook responsável: `useMetrics`
- Fonte atual: `revenue_snapshots.new_mrr`
- Dado necessário do Stripe: `subscription.start_date`/`created`
- Status: ⚠️ parcial
- Observação: no sync Stripe é inferido por janela mensal.

## MÉTRICA: Expansion MRR
- Exibida em: Revenue
- Hook responsável: `useMetrics`
- Fonte atual: `revenue_snapshots.expansion_mrr`
- Dado necessário do Stripe: nenhum campo único; exige reconciliação por mudança de MRR por assinatura
- Status: ⚠️ parcial
- Observação: hoje é estimado por fórmula residual (`delta - new + churn`).

## MÉTRICA: Churned MRR
- Exibida em: Revenue
- Hook responsável: `useMetrics`
- Fonte atual: `revenue_snapshots.churned_mrr`
- Dado necessário do Stripe: `subscription.ended_at`, `subscription.canceled_at`, `cancel_at`
- Status: ⚠️ parcial
- Observação: não considera toda a lógica de involuntary churn por invoice.

## MÉTRICA: Net New MRR
- Exibida em: Dashboard
- Hook responsável: `useMetrics` (`calculateMetrics`)
- Fonte atual: calculado internamente (`new + expansion - churned`)
- Dado necessário do Stripe: nenhum direto (depende dos 3 componentes acima)
- Status: ⚠️ parcial
- Observação: qualidade atrelada a New/Expansion/Churned.

## MÉTRICA: Revenue por mês (histórico)
- Exibida em: Revenue table, RevenueChart, GrowthChart
- Hook responsável: `useMetrics`
- Fonte atual: `supabase:revenue_snapshots` por `date`
- Dado necessário do Stripe: idealmente `invoice.amount_paid`, `invoice.period_start`, `invoice.period_end`
- Status: ⚠️ parcial
- Observação: sem `invoice.payment_succeeded`, histórico pode divergir do caixa real.

## MÉTRICA: Status da assinatura (active/trialing/canceled)
- Exibida em: Billing, Settings
- Hook responsável: `useTrial`
- Fonte atual: `supabase:subscriptions.status` (alimentada por webhook e `check-subscription`)
- Dado necessário do Stripe: `subscription.status`
- Status: ✅ pronto
- Observação: há fallback por `stripe.customers.list(email)` em `check-subscription`.

## MÉTRICA: Plano contratado (Smart/Pro)
- Exibida em: Billing/Settings (texto do plano)
- Hook responsável: `useTrial`
- Fonte atual: `subscriptions.plan` com normalização para `free/standard`
- Dado necessário do Stripe: `subscription.items[].price.id` + tabela de mapeamento de planos
- Status: ❌ não implementado
- Observação: catálogo Smart/Pro não existe no backend atual.

## MÉTRICA: Data de início do trial
- Exibida em: não destacada diretamente (apenas fim do trial é mostrado)
- Hook responsável: `useTrial`
- Fonte atual: `trials.started_at`
- Dado necessário do Stripe: nenhum (trial local de 3 dias)
- Status: ⚠️ parcial
- Observação: dado existe, mas UX usa majoritariamente `ends_at`.

## MÉTRICA: Dias restantes no trial
- Exibida em: Header (`TrialBanner`), Billing, Settings
- Hook responsável: `useTrial`
- Fonte atual: cálculo client-side de `trials.ends_at`
- Dado necessário do Stripe: nenhum
- Status: ✅ pronto
- Observação: independente do Stripe.

## MÉTRICA: Data de renovação
- Exibida em: Billing e Settings
- Hook responsável: `useTrial`
- Fonte atual: `subscriptions.current_period_end`
- Dado necessário do Stripe: `subscription.current_period_end`
- Status: ✅ pronto
- Observação: atualizado por webhook/check-subscription.

## MÉTRICA: Valor cobrado por mês
- Exibida em: textos de pricing/billing (valor fixo), não em dado dinâmico de assinatura
- Hook responsável: sem hook específico de cobrança mensal
- Fonte atual: copy estático + `STRIPE_PRICE_STANDARD_ANNUAL` no checkout
- Dado necessário do Stripe: `subscription.items[].price.unit_amount` e/ou `invoice.amount_paid`
- Status: ❌ não implementado
- Observação: não há coluna persistida de valor mensal efetivo do assinante.

## MÉTRICA: Total de usuários
- Exibida em: Dashboard, UserGrowth
- Hook responsável: `useMetrics`
- Fonte atual: `user_metrics.total_users`
- Dado necessário do Stripe: nenhum
- Status: ✅ pronto
- Observação: entrada manual/CSV (ou demo), sem integração automática com analytics.

## MÉTRICA: Novos usuários por mês
- Exibida em: Dashboard, UserGrowth
- Hook responsável: `useMetrics`
- Fonte atual: `user_metrics.new_users`
- Dado necessário do Stripe: nenhum
- Status: ✅ pronto
- Observação: manual/CSV.

## MÉTRICA: Churn Rate
- Exibida em: Dashboard, UserGrowth
- Hook responsável: `useMetrics`
- Fonte atual: calculado internamente (`churned_users / total_users`)
- Dado necessário do Stripe: nenhum
- Status: ✅ pronto
- Observação: depende de qualidade da entrada em `user_metrics`.

## MÉTRICA: ARPU (Average Revenue Per User)
- Exibida em: Dashboard
- Hook responsável: `useMetrics`
- Fonte atual: calculado internamente (`mrr / active_users`)
- Dado necessário do Stripe: nenhum direto
- Status: ✅ pronto
- Observação: depende de `mrr` e `active_users`.

## MÉTRICA: Valuation calculado (múltiplo de ARR)
- Exibida em: Dashboard, Valuation, Equity
- Hook responsável: `useMetrics`
- Fonte atual: `valuation_snapshots.valuation` ou cálculo dinâmico (`arr * múltiplo`)
- Dado necessário do Stripe: nenhum
- Status: ✅ pronto
- Observação: múltiplo sugerido é heurístico interno.

## MÉTRICA: Projeções (3m, 6m, 12m)
- Exibida em: Dashboard e Valuation
- Hook responsável: `useMetrics` (`calculateForecast`)
- Fonte atual: cálculo interno com crescimento composto
- Dado necessário do Stripe: nenhum
- Status: ✅ pronto
- Observação: projeções são sensíveis a ruído no crescimento recente.

## MÉTRICA: Dados da calculadora de equity
- Exibida em: Equity Calculator
- Hook responsável: `useMetrics` + `calculateEquityValue`
- Fonte atual: valuation/ARR + inputs locais (`%`, `shares`)
- Dado necessário do Stripe: nenhum
- Status: ⚠️ parcial
- Observação: não há persistência de cap table, classes de ações ou rodadas históricas.

## Edge Functions (Stripe e dados)

| Função | O que faz | Campos Stripe lidos | O que grava no banco |
|--------|-----------|---------------------|----------------------|
| `create-checkout` | Cria sessão de checkout anual | `customers.list(email)`, `checkout.sessions.create(...)` | `audit_logs` |
| `stripe-webhook` | Processa eventos de assinatura | `checkout.session.*`, `subscription.status`, `current_period_*`, `customer`, `metadata.*` | `stripe_webhook_events`, `subscriptions`, `audit_logs` |
| `check-subscription` | Sync sob demanda para estado de assinatura | `customers.list(email)`, `subscriptions.list(status)` | `subscriptions` |
| `customer-portal` | Cria sessão do portal do cliente Stripe | `billingPortal.sessions.create(customer)` | `audit_logs` |
| `connect-stripe-revenue` | Conecta chave Stripe por empresa | `accounts.retrieve()` | `stripe_connections`, `companies.data_source`, `audit_logs` |
| `sync-stripe-revenue` | Reconstrói snapshots mensais de receita | `subscriptions.list(...)`, `items.price.unit_amount`, `recurring.interval`, `quantity`, `start/end` | `revenue_snapshots`, `stripe_connections`, `companies.data_source`, `audit_logs` |
| `stripe-revenue-status` | Retorna status da conexão | Nenhum (não chama Stripe) | Leitura de `stripe_connections` |
| `disconnect-stripe-revenue` | Remove conexão Stripe da empresa | Nenhum | `stripe_connections` (delete), `companies.data_source`, `audit_logs` |
| `backfill-stripe-secrets` | Migra segredo em texto plano para criptografado | Nenhum | `stripe_connections` |

## Tabelas e colunas relevantes (schema)

| Tabela | Colunas relevantes |
|--------|--------------------|
| `companies` | `id`, `clerk_user_id`, `user_id`, `name`, `currency`, `data_source`, `onboarding_completed`, `onboarding_completed_at`, `created_at`, `updated_at` |
| `profiles` | `id`, `clerk_user_id`, `user_id`, `email`, `full_name`, `avatar_url`, `email_notifications_enabled`, `weekly_reports_enabled`, `created_at`, `updated_at` |
| `subscriptions` | `id`, `clerk_user_id`, `user_id`, `plan`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_start`, `current_period_end`, `created_at`, `updated_at` |
| `trials` | `id`, `company_id`, `started_at`, `ends_at`, `status`, `created_at` |
| `revenue_snapshots` | `id`, `company_id`, `date`, `mrr`, `arr`, `new_mrr`, `expansion_mrr`, `churned_mrr`, `source`, `created_at` |
| `user_metrics` | `id`, `company_id`, `date`, `total_users`, `new_users`, `active_users`, `churned_users`, `source`, `created_at` |
| `valuation_snapshots` | `id`, `company_id`, `date`, `mrr_growth_rate`, `user_growth_rate`, `valuation_multiple`, `arr`, `valuation`, `created_at` |
| `stripe_connections` | `company_id`, `stripe_account_id`, `api_key_secret`, `api_key_secret_encrypted`, `encryption_version`, `key_last4`, `livemode`, `status`, `connected_at`, `last_synced_at`, `sync_status`, `sync_in_progress_at`, `updated_at` |
| `stripe_webhook_events` | `event_id`, `event_type`, `payload`, `received_at`, `processed_at` |
| `company_merge_conflicts` | `id`, `user_id`, `clerk_user_id`, `table_name`, `conflict_key`, `canonical_record`, `duplicate_record`, `created_at` |
| `audit_logs` | `id`, `actor_user_id`, `company_id`, `action`, `source`, `actor_ip`, `metadata`, `created_at` |

## Campos do Stripe a extrair via Webhook

### `checkout.session.completed` (já tratado)
- `session.id` → rastreabilidade de checkout
- `session.customer` → `subscriptions.stripe_customer_id`
- `session.subscription` → `subscriptions.stripe_subscription_id`
- `session.metadata.clerk_user_id` → vincular usuário
- `session.metadata.company_id` → vincular empresa
- `session.metadata.plan` → `subscriptions.plan`
- `session.customer_details.email` → fallback de resolução de usuário

### `customer.subscription.created` / `customer.subscription.updated` (já tratado)
- `subscription.id` → `subscriptions.stripe_subscription_id`
- `subscription.customer` → `subscriptions.stripe_customer_id`
- `subscription.status` → `subscriptions.status`
- `subscription.current_period_start` → `subscriptions.current_period_start`
- `subscription.current_period_end` → `subscriptions.current_period_end`
- `subscription.metadata.plan` → `subscriptions.plan`
- `subscription.metadata.clerk_user_id` → vincular usuário

### `customer.subscription.deleted` (já tratado)
- `subscription.id` → localizar assinatura e marcar `status='cancelled'`

### `invoice.payment_succeeded` (recomendado, ainda não tratado)
- `invoice.subscription` → vínculo de assinatura
- `invoice.customer` → vínculo de cliente
- `invoice.amount_paid` → valor efetivamente pago
- `invoice.period_start` / `invoice.period_end` → janela contábil mensal
- `invoice.lines.data[].price.id` → plano/price efetivo

## Campos do Stripe a extrair via API (pull)

Para sync inicial e reconciliação:
- `stripe.subscriptions.list()`
- `subscription.items[].price.unit_amount`
- `subscription.items[].price.recurring.interval`
- `subscription.items[].price.recurring.interval_count`
- `subscription.items[].quantity`
- `subscription.start_date`
- `subscription.created`
- `subscription.current_period_end`
- `subscription.ended_at` / `subscription.canceled_at` / `subscription.cancel_at`
- `subscription.status`
- `stripe.customers.list({ email })`
- `stripe.accounts.retrieve()` (conexão/validação de chave)

## O que NÃO precisa do Stripe
- Total de usuários
- Novos usuários por mês
- Churn rate de usuários
- Dados da calculadora de equity (inputs e cenários)

## Gaps identificados
- Catálogo de planos não suporta Smart/Pro; backend normaliza para `standard`.
- Valor mensal efetivo da assinatura não é persistido em `subscriptions`.
- Receita histórica não usa eventos de invoice (`invoice.payment_succeeded`) e pode divergir de caixa.
- `Expansion MRR` no sync Stripe é estimado por delta residual, não por evento/linha dedicada.
- Trial start (`trials.started_at`) existe no banco, mas a UI prioriza `ends_at` e não destaca início.
- Dados de equity não são persistidos (sem cap table estruturada).
