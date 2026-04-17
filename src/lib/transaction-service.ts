import { getDatabase } from './database';
import { computeSourceHash } from './hash';
import { CategoryService } from './category-service';
import { TransferRuleService } from './transfer-rule-service';
import type { Transaction, ParsedTransaction, MonthlySummary, CategoryType } from '@/types';

export interface TransactionFilters {
  accountId?: number;
  month?: string; // YYYY-MM
  categoryId?: number;
  isTransfer?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionInput {
  accountId: number;
  familyId: number;
  parsed: ParsedTransaction;
  isTransfer: boolean;
  categoryId?: number | null;
  source: string;
}

export interface CreateTransactionsResult {
  saved: number;
  duplicates: number;
  errors: number;
}

export class TransactionService {
  static async getTransactions(familyId: number, filters: TransactionFilters): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    const db = await getDatabase();
    const conditions: string[] = ['t.family_id = ?'];
    const params: unknown[] = [familyId];

    if (filters.accountId) {
      conditions.push('t.account_id = ?');
      params.push(filters.accountId);
    }
    if (filters.month) {
      conditions.push("strftime('%Y-%m', t.date) = ?");
      params.push(filters.month);
    }
    if (filters.categoryId) {
      conditions.push('t.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.isTransfer !== undefined) {
      conditions.push('t.is_transfer = ?');
      params.push(filters.isTransfer ? 1 : 0);
    }
    if (filters.search) {
      conditions.push('(t.description LIKE ? OR t.detail LIKE ? OR t.observations LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const where = conditions.join(' AND ');

    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM transactions t WHERE ${where}`,
      params
    ) as { total: number };

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const transactions = await db.all(
      `SELECT t.*,
        tc.name as category_name, tc.color as category_color, tc.icon as category_icon,
        a.name as account_name
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      ORDER BY t.date DESC, t.id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as Transaction[];

    return { transactions, total: countResult.total };
  }

  static async getTransactionById(id: number): Promise<Transaction | null> {
    const db = await getDatabase();
    return await db.get(
      `SELECT t.*,
        tc.name as category_name, tc.color as category_color, tc.icon as category_icon,
        a.name as account_name
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ?`,
      [id]
    ) as Transaction | null;
  }

  static async createTransactions(inputs: CreateTransactionInput[]): Promise<CreateTransactionsResult> {
    const db = await getDatabase();
    let saved = 0;
    let duplicates = 0;
    let errors = 0;

    for (const input of inputs) {
      try {
        const sourceHash = computeSourceHash(
          input.accountId,
          input.parsed.date,
          input.parsed.amount,
          input.parsed.description,
          input.parsed.detail || ''
        );

        // Check if already exists
        const existing = await db.get(
          'SELECT id FROM transactions WHERE account_id = ? AND source_hash = ?',
          [input.accountId, sourceHash]
        );
        if (existing) {
          duplicates++;
          continue;
        }

        await db.run(
          `INSERT INTO transactions (
            account_id, family_id, category_id, amount, currency,
            date, value_date, description, detail, observations,
            movement_type, balance_after, is_transfer, import_batch_id,
            source, source_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.accountId,
            input.familyId,
            input.categoryId || null,
            input.parsed.amount,
            input.parsed.currency,
            input.parsed.date,
            input.parsed.valueDate || null,
            input.parsed.description,
            input.parsed.detail || null,
            input.parsed.observations || null,
            input.parsed.movementType || null,
            input.parsed.balanceAfter || null,
            input.isTransfer ? 1 : 0,
            null, // import_batch_id set separately if needed
            input.source,
            sourceHash,
          ]
        );
        saved++;
      } catch (e) {
        errors++;
      }
    }

    return { saved, duplicates, errors };
  }

  static async updateTransaction(id: number, updates: {
    category_id?: number | null;
    notes?: string;
    is_transfer?: boolean;
  }): Promise<void> {
    const db = await getDatabase();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.category_id !== undefined) { sets.push('category_id = ?'); params.push(updates.category_id); }
    if (updates.notes !== undefined) { sets.push('notes = ?'); params.push(updates.notes); }
    if (updates.is_transfer !== undefined) { sets.push('is_transfer = ?'); params.push(updates.is_transfer ? 1 : 0); }

    if (sets.length === 0) return;

    sets.push("updated_at = datetime('now')");
    params.push(id);

    await db.run(
      `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async deleteTransaction(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM transactions WHERE id = ?', [id]);
  }

  static async batchDelete(ids: number[], familyId: number): Promise<number> {
    const db = await getDatabase();
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(
      `DELETE FROM transactions WHERE id IN (${placeholders}) AND family_id = ?`,
      [...ids, familyId]
    );
    return result.changes;
  }

  static async batchUpdate(ids: number[], familyId: number, updates: {
    category_id?: number | null;
    notes?: string;
    is_transfer?: boolean;
  }): Promise<number> {
    const db = await getDatabase();
    if (ids.length === 0) return 0;

    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.category_id !== undefined) { sets.push('category_id = ?'); params.push(updates.category_id); }
    if (updates.notes !== undefined) { sets.push('notes = ?'); params.push(updates.notes); }
    if (updates.is_transfer !== undefined) { sets.push('is_transfer = ?'); params.push(updates.is_transfer ? 1 : 0); }

    if (sets.length === 0) return 0;

    sets.push("updated_at = datetime('now')");
    const placeholders = ids.map(() => '?').join(',');
    params.push(...ids, familyId);

    const result = await db.run(
      `UPDATE transactions SET ${sets.join(', ')} WHERE id IN (${placeholders}) AND family_id = ?`,
      params
    );
    return result.changes;
  }

  /**
   * Check which parsed transactions are duplicates (already in DB)
   */
  static async checkDuplicates(accountId: number, parsedTransactions: ParsedTransaction[]): Promise<{
    newTransactions: ParsedTransaction[];
    duplicates: ParsedTransaction[];
  }> {
    const db = await getDatabase();
    const newTransactions: ParsedTransaction[] = [];
    const duplicates: ParsedTransaction[] = [];

    for (const tx of parsedTransactions) {
      const sourceHash = computeSourceHash(
        accountId,
        tx.date,
        tx.amount,
        tx.description,
        tx.detail || ''
      );

      const existing = await db.get(
        'SELECT id FROM transactions WHERE account_id = ? AND source_hash = ?',
        [accountId, sourceHash]
      );

      if (existing) {
        duplicates.push(tx);
      } else {
        newTransactions.push(tx);
      }
    }

    return { newTransactions, duplicates };
  }

  /**
   * Apply transfer rules to parsed transactions
   */
  static async markTransfers(familyId: number, transactions: ParsedTransaction[]): Promise<{
    transaction: ParsedTransaction;
    isTransfer: boolean;
  }[]> {
    const rules = await TransferRuleService.getRulesByFamily(familyId);
    return transactions.map(tx => ({
      transaction: tx,
      isTransfer: TransferRuleService.evaluateRules(tx, rules),
    }));
  }

  /**
   * Get monthly summary for analytics
   */
  static async getMonthlySummary(familyId: number, month: string): Promise<MonthlySummary> {
    const db = await getDatabase();
    await CategoryService.seedDefaultCategories(familyId);

    // Get all non-transfer, non-non_computable transactions for the month
    const transactions = await db.all(
      `SELECT t.amount, t.category_id, tc.name as category_name, tc.color as category_color,
        tc.icon as category_icon, tc.type as category_type
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.family_id = ? AND strftime('%Y-%m', t.date) = ? AND t.is_transfer = 0
      ORDER BY tc.name`,
      [familyId, month]
    ) as any[];

    // Also get transfer totals
    const transfers = await db.all(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      WHERE family_id = ? AND strftime('%Y-%m', date) = ? AND is_transfer = 1`,
      [familyId, month]
    ) as any[];

    // Get non-computable totals
    const nonComputable = await db.all(
      `SELECT COALESCE(SUM(t.amount), 0) as total, COUNT(*) as count
      FROM transactions t
      JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.family_id = ? AND strftime('%Y-%m', t.date) = ?
        AND t.is_transfer = 0 AND tc.type = 'non_computable'`,
      [familyId, month]
    ) as any[];

    const totalIncome = transactions
      .filter(t => t.amount > 0 && t.category_type !== 'non_computable')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.amount < 0 && t.category_type !== 'non_computable')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Group by category
    const categoryMap = new Map<string, {
      categoryId: number;
      categoryName: string;
      categoryColor: string;
      categoryIcon: string;
      amount: number;
      count: number;
      type: string;
    }>();

    for (const t of transactions) {
      if (!t.category_id) continue;
      const key = String(t.category_id);
      const existing = categoryMap.get(key);
      if (existing) {
        existing.amount += t.amount;
        existing.count++;
      } else {
        categoryMap.set(key, {
          categoryId: t.category_id,
          categoryName: t.category_name || 'Uncategorized',
          categoryColor: t.category_color || '#9CA3AF',
          categoryIcon: t.category_icon || 'HelpCircle',
          amount: t.amount,
          count: 1,
          type: (t.category_type || 'expense') as CategoryType,
        });
      }
    }

    return {
      month,
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      byCategory: Array.from(categoryMap.values()) as MonthlySummary['byCategory'],
      transfersCount: transfers[0]?.count || 0,
      transfersTotal: transfers[0]?.total || 0,
      nonComputableCount: nonComputable[0]?.count || 0,
      nonComputableTotal: nonComputable[0]?.total || 0,
    };
  }

  /**
   * Get multi-month trend data
   */
  static async getTrends(familyId: number, months: number = 6): Promise<MonthlySummary[]> {
    const results: MonthlySummary[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const summary = await this.getMonthlySummary(familyId, monthStr);
      results.push(summary);
    }

    return results.reverse();
  }
}
