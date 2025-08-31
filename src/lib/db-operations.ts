import { getDatabase } from './database';
import { encryptIBAN, decryptIBAN } from './encryption';
import type { User, Account, Balance, AccountWithBalance } from '@/types';

export class UserService {
  static async createUser(email: string, passwordHash: string, name: string, familyId: number): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO users (email, password_hash, name, family_id) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, familyId]
    );
    return result.lastID;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    return await db.get('SELECT * FROM users WHERE email = ?', [email]) as User | null;
  }

  static async getUserById(id: number): Promise<User | null> {
    const db = await getDatabase();
    return await db.get('SELECT * FROM users WHERE id = ?', [id]) as User | null;
  }

  static async getUsersByFamilyId(familyId: number): Promise<User[]> {
    const db = await getDatabase();
    return await db.all('SELECT * FROM users WHERE family_id = ?', [familyId]) as User[];
  }

  static async familyExists(familyId: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.get('SELECT 1 FROM users WHERE family_id = ? LIMIT 1', [familyId]);
    return !!result;
  }

  static async changeFamilyId(userId: number, newFamilyId: number): Promise<void> {
    const db = await getDatabase();
    await db.run(
      'UPDATE users SET family_id = ? WHERE id = ?',
      [newFamilyId, userId]
    );
  }

  static async changePassword(userId: number, newPasswordHash: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );
  }
}

export class AccountService {
  static async createAccount(
    familyId: number,
    name: string,
    category: 'Banking' | 'Investment' | 'Debt',
    currency: string,
    iban?: string,
    notes?: string
  ): Promise<number> {
    const db = await getDatabase();
    const encryptedIban = iban ? encryptIBAN(iban) : '';
    
    const result = await db.run(
      'INSERT INTO accounts (family_id, name, category, currency, iban_encrypted, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [familyId, name, category, currency, encryptedIban, notes]
    );
    return result.lastID;
  }

  static async getAccountsByFamilyId(familyId: number): Promise<AccountWithBalance[]> {
    const db = await getDatabase();
    const accounts = await db.all(`
      SELECT 
        a.*,
        b.amount as current_balance,
        b.date as last_balance_date
      FROM accounts a
      LEFT JOIN (
        SELECT 
          account_id,
          amount,
          date,
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY date DESC) as rn
        FROM balances
      ) b ON a.id = b.account_id AND b.rn = 1
      WHERE a.family_id = ?
      ORDER BY a.name
    `, [familyId]) as AccountWithBalance[];

    return accounts.map((account: AccountWithBalance) => ({
      ...account,
      iban_encrypted: account.iban_encrypted ? decryptIBAN(account.iban_encrypted) : ''
    }));
  }

  static async updateAccount(
    id: number,
    name: string,
    category: 'Banking' | 'Investment' | 'Debt',
    currency: string,
    iban?: string,
    notes?: string
  ): Promise<void> {
    const db = await getDatabase();
    const encryptedIban = iban ? encryptIBAN(iban) : '';
    
    await db.run(
      'UPDATE accounts SET name = ?, category = ?, currency = ?, iban_encrypted = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, category, currency, encryptedIban, notes, id]
    );
  }

  static async deleteAccount(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM accounts WHERE id = ?', [id]);
  }

  static async getAccountById(id: number): Promise<Account | null> {
    const db = await getDatabase();
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [id]) as Account | null;
    if (!account) return null;
    
    return {
      ...account,
      iban_encrypted: account.iban_encrypted ? decryptIBAN(account.iban_encrypted) : ''
    };
  }
}

export class BalanceService {
  static async createBalance(accountId: number, amount: number, date: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO balances (account_id, amount, date) VALUES (?, ?, ?)',
      [accountId, amount, date]
    );
    return result.lastID;
  }

  static async getBalancesByAccountId(accountId: number): Promise<Balance[]> {
    const db = await getDatabase();
    return await db.all(
      'SELECT * FROM balances WHERE account_id = ? ORDER BY date DESC',
      [accountId]
    ) as Balance[];
  }

  static async getBalancesByFamilyId(familyId: number): Promise<Balance[]> {
    const db = await getDatabase();
    return await db.all(`
      SELECT b.* FROM balances b
      JOIN accounts a ON b.account_id = a.id
      WHERE a.family_id = ?
      ORDER BY b.date DESC
    `, [familyId]) as Balance[];
  }

  static async updateBalance(id: number, amount: number, date: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      'UPDATE balances SET amount = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [amount, date, id]
    );
  }

  static async deleteBalance(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM balances WHERE id = ?', [id]);
  }

  static async getDashboardData(familyId: number): Promise<{
    total_banking: number;
    total_investment: number;
    total_debt: number;
    net_worth: number;
    month_over_month_change: number;
  }> {
    const db = await getDatabase();
    
    const currentTotals = await db.get(`
      SELECT 
        SUM(CASE WHEN a.category = 'Banking' THEN COALESCE(b.amount, 0) ELSE 0 END) as total_banking,
        SUM(CASE WHEN a.category = 'Investment' THEN COALESCE(b.amount, 0) ELSE 0 END) as total_investment,
        SUM(CASE WHEN a.category = 'Debt' THEN COALESCE(b.amount, 0) ELSE 0 END) as total_debt,
        (SUM(CASE WHEN a.category = 'Banking' THEN COALESCE(b.amount, 0) ELSE 0 END) + 
         SUM(CASE WHEN a.category = 'Investment' THEN COALESCE(b.amount, 0) ELSE 0 END) - 
         SUM(CASE WHEN a.category = 'Debt' THEN COALESCE(b.amount, 0) ELSE 0 END)) as net_worth
      FROM accounts a
      LEFT JOIN (
        SELECT 
          account_id,
          amount,
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY date DESC) as rn
        FROM balances
      ) b ON a.id = b.account_id AND b.rn = 1
      WHERE a.family_id = ?
    `, [familyId]) as any;

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    const lastMonthTotals = await db.get(`
      SELECT 
        (SUM(CASE WHEN a.category = 'Banking' THEN COALESCE(b.amount, 0) ELSE 0 END) + 
         SUM(CASE WHEN a.category = 'Investment' THEN COALESCE(b.amount, 0) ELSE 0 END) - 
         SUM(CASE WHEN a.category = 'Debt' THEN COALESCE(b.amount, 0) ELSE 0 END)) as last_month_net_worth
      FROM accounts a
      LEFT JOIN (
        SELECT 
          account_id,
          amount,
          date,
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY ABS(julianday(date) - julianday(?))) as rn
        FROM balances
        WHERE date <= ?
      ) b ON a.id = b.account_id AND b.rn = 1
      WHERE a.family_id = ?
    `, [lastMonthStr, lastMonthStr, familyId]) as any;

    const monthOverMonthChange = lastMonthTotals?.last_month_net_worth > 0
      ? ((currentTotals.net_worth - lastMonthTotals.last_month_net_worth) / lastMonthTotals.last_month_net_worth) * 100
      : 0;

    return {
      total_banking: currentTotals.total_banking || 0,
      total_investment: currentTotals.total_investment || 0,
      total_debt: currentTotals.total_debt || 0,
      net_worth: currentTotals.net_worth || 0,
      month_over_month_change: monthOverMonthChange
    };
  }
}