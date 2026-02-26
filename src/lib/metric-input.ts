export interface RevenueSnapshotInput {
  date: string;
  mrr: number | string;
  new_mrr: number | string;
  expansion_mrr: number | string;
  churned_mrr: number | string;
  source?: string;
}

export interface UserMetricInput {
  date: string;
  total_users: number | string;
  new_users: number | string;
  active_users: number | string;
  churned_users: number | string;
  source?: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeNumberString(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const isNegative = trimmed.startsWith('-');
  const cleaned = trimmed.replace(/[^\d,.-]/g, '').replace(/-/g, '');
  if (!cleaned) return '';

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    const commaParts = cleaned.split(',');
    const fraction = commaParts[commaParts.length - 1] ?? '';
    normalized = fraction.length > 0 && fraction.length <= 2
      ? `${commaParts.slice(0, -1).join('')}.${fraction}`
      : cleaned.replace(/,/g, '');
  }

  return isNegative ? `-${normalized}` : normalized;
}

function parseNumericValue(raw: number | string, fieldName: string): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      throw new Error(`${fieldName} must be a valid number`);
    }
    return raw;
  }

  const normalized = normalizeNumberString(raw);
  if (!normalized) return 0;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return parsed;
}

function parseIntegerValue(raw: number | string, fieldName: string): number {
  const parsed = parseNumericValue(raw, fieldName);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return Math.trunc(parsed);
}

function assertNonNegative(value: number, fieldName: string): void {
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
}

function normalizeDateInput(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dayFirstMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

function assertValidDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must use YYYY-MM-DD format');
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Date is invalid');
  }
}

export function normalizeRevenueSnapshotInput(input: RevenueSnapshotInput): {
  date: string;
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  churned_mrr: number;
  source: string;
} {
  const normalizedDate = normalizeDateInput(input.date);
  assertValidDate(normalizedDate);

  const mrr = round2(parseNumericValue(input.mrr, 'MRR'));
  const newMrr = round2(parseNumericValue(input.new_mrr, 'New MRR'));
  const expansionMrr = round2(parseNumericValue(input.expansion_mrr, 'Expansion MRR'));
  const churnedMrr = round2(parseNumericValue(input.churned_mrr, 'Churned MRR'));

  assertNonNegative(mrr, 'MRR');
  assertNonNegative(newMrr, 'New MRR');
  assertNonNegative(expansionMrr, 'Expansion MRR');
  assertNonNegative(churnedMrr, 'Churned MRR');

  return {
    date: normalizedDate,
    mrr,
    new_mrr: newMrr,
    expansion_mrr: expansionMrr,
    churned_mrr: churnedMrr,
    source: input.source?.trim() || 'manual',
  };
}

export function normalizeUserMetricInput(input: UserMetricInput): {
  date: string;
  total_users: number;
  new_users: number;
  active_users: number;
  churned_users: number;
  source: string;
} {
  const normalizedDate = normalizeDateInput(input.date);
  assertValidDate(normalizedDate);

  const totalUsers = parseIntegerValue(input.total_users, 'Total users');
  const newUsers = parseIntegerValue(input.new_users, 'New users');
  const activeUsers = parseIntegerValue(input.active_users, 'Active users');
  const churnedUsers = parseIntegerValue(input.churned_users, 'Churned users');

  assertNonNegative(totalUsers, 'Total users');
  assertNonNegative(newUsers, 'New users');
  assertNonNegative(activeUsers, 'Active users');
  assertNonNegative(churnedUsers, 'Churned users');

  if (activeUsers > totalUsers) {
    throw new Error('Active users cannot exceed total users');
  }

  if (churnedUsers > totalUsers) {
    throw new Error('Churned users cannot exceed total users');
  }

  return {
    date: normalizedDate,
    total_users: totalUsers,
    new_users: newUsers,
    active_users: activeUsers,
    churned_users: churnedUsers,
    source: input.source?.trim() || 'manual',
  };
}
