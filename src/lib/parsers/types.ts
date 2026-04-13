export interface ParsedTransaction {
  date: string;            // ISO YYYY-MM-DD
  valueDate?: string;      // ISO YYYY-MM-DD
  description: string;
  detail?: string;
  amount: number;          // Signed: negative for expense
  currency: string;
  movementType?: string;
  balanceAfter?: number;
  observations?: string;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: ParseError[];
  detectedFormat: string;
}

export interface BankParser {
  readonly formatName: string;
  detect(csvText: string): boolean;
  parse(csvText: string): ParseResult;
}
