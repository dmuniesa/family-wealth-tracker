import { getDatabase } from './database';
import { encryptIBAN, decryptIBAN } from './encryption';
import type { User, Account, Balance, AccountWithBalance, UserRole } from '@/types';

export class UserService {
  static async createUser(email: string, passwordHash: string, name: string, familyId: number, role: UserRole = 'user'): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO users (email, password_hash, name, family_id, role) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, name, familyId, role]
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

  static async getAllUsers(): Promise<User[]> {
    const db = await getDatabase();
    return await db.all('SELECT * FROM users ORDER BY created_at DESC') as User[];
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

  static async updateUserRole(userId: number, role: UserRole): Promise<void> {
    const db = await getDatabase();
    await db.run(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );
  }

  static async deleteUser(userId: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
  }

  static async getUsersByRole(familyId: number, role: UserRole): Promise<User[]> {
    const db = await getDatabase();
    return await db.all(
      'SELECT * FROM users WHERE family_id = ? AND role = ?',
      [familyId, role]
    ) as User[];
  }

  static async isUserAdmin(userId: number): Promise<boolean> {
    const db = await getDatabase();
    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]) as User | null;
    return user?.role === 'administrator';
  }

  static async updateUser(userId: number, updates: Partial<User>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];
    
    // Build dynamic update query
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updates.password_hash);
    }
    if (updates.notifications_enabled !== undefined) {
      fields.push('notifications_enabled = ?');
      values.push(updates.notifications_enabled);
    }
    
    if (fields.length === 0) {
      return; // No updates to apply
    }
    
    values.push(userId);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await db.run(query, values);
  }
}

export class AccountService {
  static async createAccount(
    familyId: number,
    name: string,
    category: 'Banking' | 'Investment' | 'Debt',
    currency: string,
    iban?: string,
    notes?: string,
    amortizationData?: {
      aprRate?: number;
      monthlyPayment?: number;
      loanTermMonths?: number;
      paymentType?: 'fixed' | 'interest_only';
      autoUpdateEnabled?: boolean;
      originalBalance?: number;
      loanStartDate?: string;
    }
  ): Promise<number> {
    const db = await getDatabase();
    const encryptedIban = iban ? encryptIBAN(iban) : '';
    
    if (category === 'Debt' && amortizationData) {
      // Calculate remaining months if loan start date is provided
      let remainingMonths = amortizationData.loanTermMonths;
      if (amortizationData.loanStartDate && amortizationData.loanTermMonths) {
        const startDate = new Date(amortizationData.loanStartDate);
        const currentDate = new Date();
        const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - startDate.getMonth());
        remainingMonths = Math.max(0, amortizationData.loanTermMonths - monthsElapsed);
      }

      const result = await db.run(
        `INSERT INTO accounts (
          family_id, name, category, currency, iban_encrypted, notes,
          apr_rate, monthly_payment, loan_term_months, remaining_months,
          payment_type, auto_update_enabled, original_balance, loan_start_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId, name, category, currency, encryptedIban, notes,
          amortizationData.aprRate || null,
          amortizationData.monthlyPayment || null,
          amortizationData.loanTermMonths || null,
          remainingMonths || null,
          amortizationData.paymentType || 'fixed',
          amortizationData.autoUpdateEnabled || false,
          amortizationData.originalBalance || null,
          amortizationData.loanStartDate || null
        ]
      );
      
      const accountId = result.lastID;
      
      // Create initial balance if auto update is enabled and original balance is provided
      if (amortizationData.autoUpdateEnabled && amortizationData.originalBalance && amortizationData.originalBalance > 0) {
        const startDate = amortizationData.loanStartDate || new Date().toISOString().split('T')[0];
        
        // Calculate current balance based on months elapsed since loan start
        let currentBalance = amortizationData.originalBalance;
        const currentDate = new Date();
        const loanStartDate = new Date(startDate);
        const monthsElapsed = (currentDate.getFullYear() - loanStartDate.getFullYear()) * 12 + 
                             (currentDate.getMonth() - loanStartDate.getMonth());
        
        if (monthsElapsed > 0 && amortizationData.aprRate && amortizationData.monthlyPayment) {
          // Calculate balance after all elapsed payments
          const monthlyRate = amortizationData.aprRate / 12;
          
          for (let month = 0; month < monthsElapsed; month++) {
            if (currentBalance <= 0) break;
            
            const interestPayment = currentBalance * monthlyRate;
            
            if (amortizationData.paymentType === 'interest_only') {
              // Interest-only: balance stays the same, just pay interest
              // No principal payment, so balance doesn't change
            } else {
              // Fixed payment: principal + interest
              const principalPayment = Math.min(
                amortizationData.monthlyPayment - interestPayment, 
                currentBalance
              );
              currentBalance = Math.max(0, currentBalance - principalPayment);
            }
          }
        }
        
        await db.run(
          'INSERT INTO balances (account_id, amount, date, balance_type, notes) VALUES (?, ?, ?, ?, ?)',
          [
            accountId, 
            currentBalance, 
            new Date().toISOString().split('T')[0], // Use current date for the calculated balance
            'automatic',
            `Balance calculated for ${monthsElapsed} months elapsed since loan start (${startDate})`
          ]
        );
      }
      
      return accountId;
    } else {
      const result = await db.run(
        'INSERT INTO accounts (family_id, name, category, currency, iban_encrypted, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [familyId, name, category, currency, encryptedIban, notes]
      );
      return result.lastID;
    }
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
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY created_at DESC, id DESC) as rn
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
    notes?: string,
    amortizationData?: {
      aprRate?: number;
      monthlyPayment?: number;
      loanTermMonths?: number;
      paymentType?: 'fixed' | 'interest_only';
      autoUpdateEnabled?: boolean;
      originalBalance?: number;
      loanStartDate?: string;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const encryptedIban = iban ? encryptIBAN(iban) : '';
    
    if (category === 'Debt' && amortizationData) {
      // Calculate remaining months if loan start date is provided
      let remainingMonths = amortizationData.loanTermMonths;
      if (amortizationData.loanStartDate && amortizationData.loanTermMonths) {
        const startDate = new Date(amortizationData.loanStartDate);
        const currentDate = new Date();
        const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - startDate.getMonth());
        remainingMonths = Math.max(0, amortizationData.loanTermMonths - monthsElapsed);
      }
      
      // Check if auto updates are being enabled and account doesn't have balance yet
      const currentAccount = await db.get('SELECT auto_update_enabled FROM accounts WHERE id = ?', [id]) as { auto_update_enabled: boolean } | null;
      const wasAutoUpdateEnabled = currentAccount?.auto_update_enabled || false;
      const isEnablingAutoUpdate = !wasAutoUpdateEnabled && amortizationData.autoUpdateEnabled;
      
      await db.run(
        `UPDATE accounts SET 
          name = ?, category = ?, currency = ?, iban_encrypted = ?, notes = ?,
          apr_rate = ?, monthly_payment = ?, loan_term_months = ?, remaining_months = ?,
          payment_type = ?, auto_update_enabled = ?, original_balance = ?, loan_start_date = ?,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [
          name, category, currency, encryptedIban, notes,
          amortizationData.aprRate || null,
          amortizationData.monthlyPayment || null,
          amortizationData.loanTermMonths || null,
          remainingMonths || null,
          amortizationData.paymentType || 'fixed',
          amortizationData.autoUpdateEnabled || false,
          amortizationData.originalBalance || null,
          amortizationData.loanStartDate || null,
          id
        ]
      );
      
      // Create initial balance if auto update is being enabled for the first time
      if (isEnablingAutoUpdate && amortizationData.originalBalance && amortizationData.originalBalance > 0) {
        // Check if account already has any balances
        const existingBalance = await db.get('SELECT id FROM balances WHERE account_id = ? LIMIT 1', [id]);
        
        if (!existingBalance) {
          const startDate = amortizationData.loanStartDate || new Date().toISOString().split('T')[0];
          
          // Calculate current balance based on months elapsed since loan start
          let currentBalance = amortizationData.originalBalance;
          const currentDate = new Date();
          const loanStartDate = new Date(startDate);
          const monthsElapsed = (currentDate.getFullYear() - loanStartDate.getFullYear()) * 12 + 
                               (currentDate.getMonth() - loanStartDate.getMonth());
          
          if (monthsElapsed > 0 && amortizationData.aprRate && amortizationData.monthlyPayment) {
            // Calculate balance after all elapsed payments
            const monthlyRate = amortizationData.aprRate / 12;
            
            for (let month = 0; month < monthsElapsed; month++) {
              if (currentBalance <= 0) break;
              
              const interestPayment = currentBalance * monthlyRate;
              
              if (amortizationData.paymentType === 'interest_only') {
                // Interest-only: balance stays the same, just pay interest
                // No principal payment, so balance doesn't change
              } else {
                // Fixed payment: principal + interest
                const principalPayment = Math.min(
                  amortizationData.monthlyPayment - interestPayment, 
                  currentBalance
                );
                currentBalance = Math.max(0, currentBalance - principalPayment);
              }
            }
          }
          
          await db.run(
            'INSERT INTO balances (account_id, amount, date, balance_type, notes) VALUES (?, ?, ?, ?, ?)',
            [
              id, 
              currentBalance, 
              new Date().toISOString().split('T')[0], // Use current date for the calculated balance
              'automatic',
              `Balance calculated for ${monthsElapsed} months elapsed since loan start (${startDate})`
            ]
          );
        }
      }
    } else {
      // For non-Debt accounts, clear amortization fields
      await db.run(
        `UPDATE accounts SET 
          name = ?, category = ?, currency = ?, iban_encrypted = ?, notes = ?,
          apr_rate = NULL, monthly_payment = NULL, loan_term_months = NULL, remaining_months = NULL,
          payment_type = NULL, auto_update_enabled = FALSE, original_balance = NULL, loan_start_date = NULL,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [name, category, currency, encryptedIban, notes, id]
      );
    }
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
      'INSERT INTO balances (account_id, amount, date, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
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
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY created_at DESC, id DESC) as rn
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