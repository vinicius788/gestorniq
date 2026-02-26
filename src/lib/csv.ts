function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function applyHeaderAliases(header: string): string {
  const aliases: Record<string, string> = {
    newmrr: 'new_mrr',
    expansionmrr: 'expansion_mrr',
    churnedmrr: 'churned_mrr',
    totalusers: 'total_users',
    newusers: 'new_users',
    activeusers: 'active_users',
    churnedusers: 'churned_users',
    users: 'total_users',
  };

  return aliases[header] ?? header;
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) =>
    applyHeaderAliases(normalizeHeader(header)),
  );

  return lines.slice(1).map((line) => {
    const columns = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? '';
    });
    return row;
  });
}
