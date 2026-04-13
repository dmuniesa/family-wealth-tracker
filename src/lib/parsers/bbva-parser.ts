import { BankParser, ParseResult, ParsedTransaction, ParseError } from './types';

function parseDate(dateStr: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseEuropeanNumber(value: string): number {
  // European format: comma as decimal separator, optional negative sign
  // e.g., "7279,94" → 7279.94, "-11" → -11, "-9,07" → -9.07
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

export class BBVAParser implements BankParser {
  readonly formatName = 'BBVA';

  detect(csvText: string): boolean {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return false;
    // BBVA has metadata rows, header is around line 5
    // Look for the header line that contains these exact columns
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('F.Valor')
        && trimmed.includes('Concepto')
        && trimmed.includes('Importe')
        && trimmed.includes('Observaciones')
        && trimmed.includes(';')) {
        return true;
      }
    }
    return false;
  }

  parse(csvText: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    const lines = csvText.split('\n').filter(l => l.trim());

    // Find the header row
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('F.Valor') && line.includes('Importe') && line.includes(';')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return {
        transactions: [],
        errors: [{ row: 0, message: 'BBVA header row not found' }],
        detectedFormat: this.formatName,
      };
    }

    // Parse data rows (after header)
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const fields = line.split(';').map(f => f.trim());
        if (fields.length < 6) {
          errors.push({ row: i + 1, message: `Expected at least 6 fields, got ${fields.length}` });
          continue;
        }

        const [fValor, fecha, concepto, movimiento, importeStr, divisa, disponibleStr, _divisa2, observaciones] = fields;

        const amount = parseEuropeanNumber(importeStr);
        if (isNaN(amount)) {
          errors.push({ row: i + 1, message: `Invalid amount: ${importeStr}` });
          continue;
        }

        const valueDate = parseDate(fValor);
        const date = parseDate(fecha);
        const balanceAfterRaw = disponibleStr ? parseEuropeanNumber(disponibleStr) : NaN;

        transactions.push({
          date,
          valueDate: valueDate !== date ? valueDate : undefined,
          description: concepto.trim(),
          detail: movimiento.trim(),
          amount,
          currency: divisa.trim(),
          movementType: movimiento.trim(),
          balanceAfter: !isNaN(balanceAfterRaw) ? balanceAfterRaw : undefined,
          observations: observaciones?.trim() || undefined,
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
}
