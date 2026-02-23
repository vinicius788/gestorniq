# Release Evidence Template

## Release metadata
- Environment:
- Date/time (UTC):
- Release owner:
- Git SHA:
- Supabase project ref:
- Stripe account (staging/prod):

## Required resources snapshot
Command:
```bash
bash scripts/release-resources.sh summary
```
Output:
```text
PASTE_OUTPUT_HERE
```

## Secrets check
Command:
```bash
npm run supabase:secrets:check
```
Output:
```text
PASTE_OUTPUT_HERE
```

## Function deploy
Command:
```bash
npm run supabase:deploy
```
Output:
```text
PASTE_OUTPUT_HERE
```

Dashboard evidence:
- Functions screenshot path/link:
- Deploy IDs/log links:

## Release preflight
Command:
```bash
APP_ENV=production npm run release:preflight
```
Output:
```text
PASTE_OUTPUT_HERE
```

## Database migration evidence
Command:
```bash
supabase db push
```
Output:
```text
PASTE_OUTPUT_HERE
```

SQL verification snippets:
```sql
-- add SQL and output proving:
-- 1) write_audit_log execute permissions
-- 2) subscription webhook indexes
-- 3) plaintext guard trigger on stripe_connections
```

## Stripe webhook evidence
- Endpoint URL:
- Endpoint ID:
- Event IDs tested:
- Signature validation proof (logs/screenshots):

## CORS evidence
Allowed-origin preflight command/output:
```text
PASTE_OUTPUT_HERE
```

Blocked-origin preflight command/output:
```text
PASTE_OUTPUT_HERE
```

## Smoke staging run
Command:
```bash
APP_ENV=production npm run smoke:staging
```
Output (`staging-smoke-evidence.txt`):
```text
PASTE_OUTPUT_HERE
```

Manual smoke screenshots/log links:
- signup/login/logout:
- demo mode persistence:
- checkout success:
- webhook processed:
- customer portal return:
- expired trial denied:
- sync-stripe-revenue denied without active access:

## CI and audit
Command:
```bash
npm run ci:check
npm audit --omit=dev --audit-level=high
```
Outputs:
```text
PASTE_OUTPUT_HERE
```

CI URL:

Moderate advisories tracked (non-blocking):
- package:
- advisory:
- mitigation owner/date:

## Final decision
- GO / CONDITIONAL GO / NO-GO:
- Risks accepted:
- Sign-off (engineering/product/security):
