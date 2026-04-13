import { getDatabase } from './database';
import type { TransferRule, ParsedTransaction } from '@/types';

interface TransferSeedRule {
  rule_type: 'contains_text' | 'sender_is' | 'description_matches';
  pattern: string;
  field: 'description' | 'detail' | 'observations' | 'any';
}

const DEFAULT_TRANSFER_RULES: TransferSeedRule[] = [
  { rule_type: 'contains_text', pattern: 'OFF TO SAVE', field: 'detail' },
  { rule_type: 'contains_text', pattern: 'Move to save', field: 'detail' },
  { rule_type: 'sender_is', pattern: 'DAVID JOSE MUNIESA GALLARDO', field: 'detail' },
  { rule_type: 'description_matches', pattern: 'Transferencia realizada.*(mercadona|compra|pan|café|coffee|paella|parking)', field: 'description' },
];

export class TransferRuleService {
  static async getRulesByFamily(familyId: number): Promise<TransferRule[]> {
    const db = await getDatabase();
    return await db.all(
      'SELECT * FROM transfer_rules WHERE family_id = ? ORDER BY created_at',
      [familyId]
    ) as TransferRule[];
  }

  static async createRule(familyId: number, data: {
    rule_type: 'contains_text' | 'sender_is' | 'description_matches';
    pattern: string;
    field: 'description' | 'detail' | 'observations' | 'any';
  }): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO transfer_rules (family_id, rule_type, pattern, field) VALUES (?, ?, ?, ?)`,
      [familyId, data.rule_type, data.pattern, data.field]
    );
    return result.lastID;
  }

  static async updateRule(id: number, data: {
    rule_type?: 'contains_text' | 'sender_is' | 'description_matches';
    pattern?: string;
    field?: 'description' | 'detail' | 'observations' | 'any';
    is_active?: boolean;
  }): Promise<void> {
    const db = await getDatabase();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.rule_type !== undefined) { sets.push('rule_type = ?'); params.push(data.rule_type); }
    if (data.pattern !== undefined) { sets.push('pattern = ?'); params.push(data.pattern); }
    if (data.field !== undefined) { sets.push('field = ?'); params.push(data.field); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); params.push(data.is_active); }

    if (sets.length === 0) return;

    params.push(id);
    await db.run(
      `UPDATE transfer_rules SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async deleteRule(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM transfer_rules WHERE id = ?', [id]);
  }

  static async seedDefaultRules(familyId: number): Promise<void> {
    const existing = await this.getRulesByFamily(familyId);
    if (existing.length > 0) return;

    for (const rule of DEFAULT_TRANSFER_RULES) {
      await this.createRule(familyId, rule);
    }
  }

  /**
   * Evaluate if a transaction matches any active transfer rule
   */
  static evaluateRules(transaction: ParsedTransaction, rules: TransferRule[]): boolean {
    const activeRules = rules.filter(r => r.is_active);

    for (const rule of activeRules) {
      const fieldValue = getFieldValue(transaction, rule.field);
      if (!fieldValue) continue;

      switch (rule.rule_type) {
        case 'contains_text':
          if (fieldValue.toLowerCase().includes(rule.pattern.toLowerCase())) return true;
          break;
        case 'sender_is':
          if (fieldValue.toUpperCase().trim() === rule.pattern.toUpperCase().trim()) return true;
          break;
        case 'description_matches':
          try {
            if (new RegExp(rule.pattern, 'i').test(fieldValue)) return true;
          } catch {
            // Invalid regex, skip
          }
          break;
      }
    }
    return false;
  }
}

function getFieldValue(tx: ParsedTransaction, field: string): string {
  const combined = [tx.description, tx.detail, tx.observations].filter(Boolean).join(' ');
  switch (field) {
    case 'description': return tx.description || '';
    case 'detail': return tx.detail || '';
    case 'observations': return tx.observations || '';
    case 'any': return combined;
    default: return combined;
  }
}
