import { BankParser, ParseResult, ParsedTransaction, ParseError } from './types';

function parseDate(dateStr: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export class B100Parser implements BankParser {
  readonly formatName = 'B100';

  detect(csvText: string): boolean {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return false;
    const firstLine = lines[0].trim();
    // B100 uses comma delimiter and has these exact headers
    return firstLine.includes('Fecha de Operación')
      && firstLine.includes('Detalle')
      && firstLine.includes('Saldo tras operación')
      && firstLine.includes('Tipo de Movimiento');
  }

  parse(csvText: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    const lines = csvText.split('\n').filter(l => l.trim());

    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const fields = this.splitCSVLine(line);
        if (fields.length < 8) {
          errors.push({ row: i + 1, message: `Expected 8 fields, got ${fields.length}` });
          continue;
        }

        const [opDate, valueDate, detail, concept, amountStr, balanceStr, currency, movementType] = fields;

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          errors.push({ row: i + 1, message: `Invalid amount: ${amountStr}` });
          continue;
        }

        const balanceAfter = parseFloat(balanceStr);
        const date = parseDate(opDate);
        const valDate = parseDate(valueDate);

        transactions.push({
          date,
          valueDate: valDate !== date ? valDate : undefined,
          description: detail.trim(),
          detail: concept.trim(),
          amount,
          currency: currency.trim(),
          movementType: movementType.trim(),
          balanceAfter: isNaN(balanceAfter) ? undefined : balanceAfter,
        });
      } catch (e) {
        errors.push({ row: i + 1, message: `Parse error: ${(e as Error).message}` });
      }
    }

    return {
      transactions,
      errors,
      detectedFormat: this.formatName,
    };
  }

  /**
   * Split a CSV line respecting quoted fields.
   * B100 uses comma delimiter. Some fields may be quoted if they contain commas.
   */
  private splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
