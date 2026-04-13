import { BankParser, ParseResult } from './types';
import { B100Parser } from './b100-parser';
import { BBVAParser } from './bbva-parser';

const parsers: BankParser[] = [new B100Parser(), new BBVAParser()];

export function detectAndParse(csvText: string): ParseResult {
  for (const parser of parsers) {
    if (parser.detect(csvText)) {
      return parser.parse(csvText);
    }
  }
  return {
    transactions: [],
    errors: [{ row: 0, message: 'Formato CSV no reconocido. Formatos soportados: B100, BBVA.' }],
    detectedFormat: 'unknown',
  };
}

export { B100Parser, BBVAParser };
export type { BankParser, ParsedTransaction, ParseError, ParseResult } from './types';
