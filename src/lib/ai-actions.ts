import { getDatabase } from './database';
import { AccountService, BalanceService } from './db-operations';
import { CategoryService } from './category-service';
import { AIService } from './ai-service';
import path from 'path';
import fs from 'fs';

export interface ActionResult {
  success: boolean;
  data: any;
  message: string;
}

export class AIActionExecutor {
  static async execute(actionName: string, params: Record<string, any>, familyId: number): Promise<ActionResult> {
    try {
      switch (actionName) {
        case 'get_accounts':
          return await this.getAccounts(familyId);
        case 'update_balance':
          return await this.updateBalance(familyId, params);
        case 'get_spending_summary':
          return await this.getSpendingSummary(familyId, params);
        case 'get_dashboard':
          return await this.getDashboard(familyId);
        case 'create_backup':
          return await this.createBackup(familyId);
        case 'list_backups':
          return await this.listBackups();
        case 'categorize_transactions':
          return await this.categorizeTransactions(familyId);
        default:
          return { success: false, data: null, message: `Unknown action: ${actionName}` };
      }
    } catch (error) {
      return { success: false, data: null, message: `Action failed: ${(error as Error).message}` };
    }
  }

  private static async getAccounts(familyId: number): Promise<ActionResult> {
    const accounts = await AccountService.getAccountsByFamilyId(familyId);
    const summary = accounts.map(a => ({
      name: a.name,
      category: a.category,
      currency: a.currency,
      balance: a.current_balance ?? null,
      lastUpdate: a.last_balance_date ?? null,
    }));
    return {
      success: true,
      data: summary,
      message: `Found ${summary.length} accounts`,
    };
  }

  private static async updateBalance(familyId: number, params: Record<string, any>): Promise<ActionResult> {
    const { account_name, amount, date } = params;
    if (!account_name || amount === undefined) {
      return { success: false, data: null, message: 'account_name and amount are required' };
    }

    const db = await getDatabase();
    const account = await db.get(
      'SELECT id, name FROM accounts WHERE family_id = ? AND name LIKE ?',
      [familyId, `%${account_name}%`]
    ) as any;

    if (!account) {
      return { success: false, data: null, message: `No account found matching "${account_name}"` };
    }

    const balanceDate = date || new Date().toISOString().split('T')[0];
    await BalanceService.createBalance(account.id, Number(amount), balanceDate);

    return {
      success: true,
      data: { account: account.name, amount: Number(amount), date: balanceDate },
      message: `Balance updated: ${account.name} = ${Number(amount).toFixed(2)} on ${balanceDate}`,
    };
  }

  private static async getSpendingSummary(familyId: number, params: Record<string, any>): Promise<ActionResult> {
    const db = await getDatabase();
    const months = params.months || 1;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceStr = since.toISOString().split('T')[0];

    const spending = await db.all(
      `SELECT tc.name, tc.type, tc.color,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expenses,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income,
        COUNT(*) as count
       FROM transactions t
       JOIN transaction_categories tc ON t.category_id = tc.id
       WHERE t.family_id = ? AND t.date >= ? AND t.is_transfer = 0
       GROUP BY tc.id
       ORDER BY expenses DESC`,
      [familyId, sinceStr]
    ) as any[];

    const totals = await db.get(
      `SELECT
        SUM(CASE WHEN amount < 0 AND is_transfer = 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
        SUM(CASE WHEN amount > 0 AND is_transfer = 0 THEN amount ELSE 0 END) as total_income,
        COUNT(*) as total_transactions
       FROM transactions WHERE family_id = ? AND date >= ?`,
      [familyId, sinceStr]
    ) as any;

    return {
      success: true,
      data: { categories: spending, totals, period: `Last ${months} month(s)` },
      message: `Spending summary for last ${months} month(s): ${spending.length} categories`,
    };
  }

  private static async getDashboard(familyId: number): Promise<ActionResult> {
    const db = await getDatabase();
    const accounts = await AccountService.getAccountsByFamilyId(familyId);

    const totalBanking = accounts.filter(a => a.category === 'Banking').reduce((s, a) => s + (a.current_balance || 0), 0);
    const totalInvestment = accounts.filter(a => a.category === 'Investment').reduce((s, a) => s + (a.current_balance || 0), 0);
    const totalDebt = accounts.filter(a => a.category === 'Debt').reduce((s, a) => s + (a.current_balance || 0), 0);
    const netWorth = totalBanking + totalInvestment + totalDebt;

    return {
      success: true,
      data: {
        totalBanking: Math.round(totalBanking * 100) / 100,
        totalInvestment: Math.round(totalInvestment * 100) / 100,
        totalDebt: Math.round(totalDebt * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100,
        accountsCount: accounts.length,
      },
      message: `Net worth: ${netWorth.toFixed(2)} EUR (${accounts.length} accounts)`,
    };
  }

  private static async createBackup(familyId: number): Promise<ActionResult> {
    const dbPath = path.join(process.cwd(), 'data', 'wealth_tracker.db');
    const backupDir = path.join(process.cwd(), 'data', 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      const stats = fs.statSync(backupPath);
      return {
        success: true,
        data: { filename: `backup-${timestamp}.db`, sizeKB: Math.round(stats.size / 1024) },
        message: `Backup created: backup-${timestamp}.db (${Math.round(stats.size / 1024)} KB)`,
      };
    }

    return { success: false, data: null, message: 'Database file not found' };
  }

  private static async listBackups(): Promise<ActionResult> {
    const backupDir = path.join(process.cwd(), 'data', 'backups');

    if (!fs.existsSync(backupDir)) {
      return { success: true, data: [], message: 'No backups directory' };
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return { filename: f, sizeKB: Math.round(stats.size / 1024), date: stats.mtime.toISOString() };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    return {
      success: true,
      data: files,
      message: `Found ${files.length} backup(s)`,
    };
  }

  private static async categorizeTransactions(familyId: number): Promise<ActionResult> {
    const db = await getDatabase();
    const uncategorized = await db.all(
      'SELECT * FROM transactions WHERE family_id = ? AND category_id IS NULL LIMIT 100',
      [familyId]
    ) as any[];

    if (uncategorized.length === 0) {
      return { success: true, data: { categorized: 0 }, message: 'No uncategorized transactions found' };
    }

    const categories = await CategoryService.getCategoriesByFamily(familyId);
    const { categorizations } = await AIService.categorizeTransactions(familyId, uncategorized, categories);

    let categorized = 0;
    for (const result of categorizations) {
      const cat = categories.find(c => c.id === result.categoryId);
      if (cat) {
        await db.run(
          'UPDATE transactions SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [result.categoryId, result.transactionId]
        );
        categorized++;
      }
    }

    return {
      success: true,
      data: { total: uncategorized.length, categorized },
      message: `Categorized ${categorized} of ${uncategorized.length} transactions`,
    };
  }
}
