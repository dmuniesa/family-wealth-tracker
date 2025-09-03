import { Account } from '@/types';
import { getDatabase } from '@/lib/database';

export interface AmortizationPayment {
  month: number;
  date: string;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AmortizationSchedule {
  accountId: number;
  accountName: string;
  originalBalance: number;
  currentBalance: number;
  aprRate: number;
  monthlyPayment: number;
  paymentType: 'fixed' | 'interest_only';
  remainingMonths: number;
  totalInterest: number;
  totalPayments: number;
  monthlyInterestRate: number;
  payments: AmortizationPayment[];
}

export interface DebtSummary {
  accountId: number;
  accountName: string;
  currentBalance: number;
  monthlyPayment: number;
  interestThisMonth: number;
  principalThisMonth: number;
  payoffDate?: string;
  totalInterestRemaining: number;
  autoUpdateEnabled: boolean;
  lastAutoUpdate?: string;
}

export class AmortizationService {
  private static instance: AmortizationService | null = null;

  static getInstance(): AmortizationService {
    if (!this.instance) {
      this.instance = new AmortizationService();
    }
    return this.instance;
  }

  /**
   * Calculate monthly interest rate from annual percentage rate
   */
  private calculateMonthlyRate(aprRate: number): number {
    return aprRate / 12;
  }

  /**
   * Calculate the next payment date based on loan start date and last update
   * Handles months with different number of days (28, 29, 30, 31)
   */
  private getNextPaymentDate(loanStartDate: Date, lastAutoUpdate?: string): Date {
    const today = new Date();
    const paymentDayOfMonth = loanStartDate.getDate();
    
    let nextPaymentDate: Date;
    
    if (lastAutoUpdate) {
      // Calculate next payment from last update
      const lastUpdate = new Date(lastAutoUpdate);
      nextPaymentDate = new Date(lastUpdate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else {
      // First payment: calculate from loan start date
      nextPaymentDate = new Date(loanStartDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }
    
    // Handle month-end dates (28, 29, 30, 31)
    // Set to day 1 first to avoid date overflow issues
    nextPaymentDate.setDate(1);
    
    const targetMonth = nextPaymentDate.getMonth();
    const targetYear = nextPaymentDate.getFullYear();
    
    // Get the last day of the target month
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    // Use the original payment day or the last day of month, whichever is smaller
    const actualPaymentDay = Math.min(paymentDayOfMonth, lastDayOfMonth);
    
    nextPaymentDate.setDate(actualPaymentDay);
    
    return nextPaymentDate;
  }

  /**
   * Calculate fixed monthly payment using French amortization method
   */
  calculateFixedMonthlyPayment(
    principal: number, 
    aprRate: number, 
    termMonths: number
  ): number {
    if (aprRate === 0) {
      return principal / termMonths;
    }

    const monthlyRate = this.calculateMonthlyRate(aprRate);
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
    const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
    
    return principal * (numerator / denominator);
  }

  /**
   * Generate complete amortization schedule
   */
  generateAmortizationSchedule(account: Account, currentBalance?: number): AmortizationSchedule | null {
    if (account.category !== 'Debt' || !account.apr_rate || !account.remaining_months) {
      return null;
    }

    const balance = (currentBalance !== null && currentBalance !== undefined && currentBalance > 0) 
      ? currentBalance 
      : (account.original_balance ?? 0);
    const monthlyRate = this.calculateMonthlyRate(account.apr_rate);
    const payments: AmortizationPayment[] = [];
    
    let remainingBalance = balance;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;
    
    // Calculate monthly payment if not provided
    let monthlyPayment = account.monthly_payment;
    if (!monthlyPayment && account.payment_type === 'fixed') {
      monthlyPayment = this.calculateFixedMonthlyPayment(
        balance, 
        account.apr_rate, 
        account.remaining_months
      );
    }

    const startDate = new Date();
    
    for (let month = 1; month <= account.remaining_months && remainingBalance > 0.01; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      
      let principalPayment: number;
      let totalPayment: number;

      if (account.payment_type === 'interest_only') {
        principalPayment = 0;
        totalPayment = interestPayment;
      } else {
        // Fixed payment
        totalPayment = monthlyPayment || 0;
        principalPayment = Math.min(totalPayment - interestPayment, remainingBalance);
        
        // Adjust last payment to clear remaining balance
        if (remainingBalance - principalPayment < 0.01) {
          principalPayment = remainingBalance;
          totalPayment = principalPayment + interestPayment;
        }
      }

      remainingBalance -= principalPayment;
      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPayment;

      const paymentDate = new Date(startDate);
      paymentDate.setMonth(startDate.getMonth() + month - 1);

      payments.push({
        month,
        date: paymentDate.toISOString().split('T')[0],
        principalPayment,
        interestPayment,
        totalPayment,
        remainingBalance: Math.max(0, remainingBalance),
        cumulativeInterest,
        cumulativePrincipal
      });
    }

    return {
      accountId: account.id,
      accountName: account.name,
      originalBalance: account.original_balance || balance,
      currentBalance: balance,
      aprRate: account.apr_rate,
      monthlyPayment: monthlyPayment || 0,
      paymentType: account.payment_type || 'fixed',
      remainingMonths: account.remaining_months,
      totalInterest: cumulativeInterest,
      totalPayments: cumulativeInterest + cumulativePrincipal,
      monthlyInterestRate: monthlyRate,
      payments
    };
  }

  /**
   * Calculate next month's payment details
   */
  calculateNextPayment(account: Account, currentBalance: number): AmortizationPayment | null {
    if (account.category !== 'Debt' || !account.apr_rate) {
      return null;
    }

    const monthlyRate = this.calculateMonthlyRate(account.apr_rate);
    const interestPayment = currentBalance * monthlyRate;
    
    let principalPayment: number;
    let totalPayment: number;

    if (account.payment_type === 'interest_only') {
      principalPayment = 0;
      totalPayment = interestPayment;
    } else {
      totalPayment = account.monthly_payment || 0;
      principalPayment = Math.min(totalPayment - interestPayment, currentBalance);
    }

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return {
      month: 1,
      date: nextMonth.toISOString().split('T')[0],
      principalPayment,
      interestPayment,
      totalPayment,
      remainingBalance: Math.max(0, currentBalance - principalPayment),
      cumulativeInterest: interestPayment,
      cumulativePrincipal: principalPayment
    };
  }

  /**
   * Apply monthly interest and update debt balance
   */
  async applyMonthlyUpdate(accountId: number): Promise<{ success: boolean; newBalance: number; interestAdded: number; error?: string }> {
    try {
      const db = await getDatabase();
      
      // Get account details with current balance
      const account = await db.get(`
        SELECT a.*, 
               COALESCE(
                 (SELECT amount FROM balances 
                  WHERE account_id = a.id 
                  ORDER BY date DESC, created_at DESC 
                  LIMIT 1), 
                 0
               ) as current_balance
        FROM accounts a 
        WHERE a.id = ? AND a.category = 'Debt'
      `, [accountId]) as Account & { current_balance: number };

      if (!account) {
        return { success: false, newBalance: 0, interestAdded: 0, error: 'Account not found or not a debt account' };
      }

      if (!account.auto_update_enabled || !account.apr_rate) {
        return { success: false, newBalance: account.current_balance, interestAdded: 0, error: 'Auto-update not enabled or APR not set' };
      }

      // Calculate the next payment date based on loan start date
      const today = new Date();
      const loanStartDate = account.loan_start_date ? new Date(account.loan_start_date) : null;
      
      if (!loanStartDate) {
        return { success: false, newBalance: account.current_balance, interestAdded: 0, error: 'Loan start date not set' };
      }
      
      // Get the day of month from loan start date
      const paymentDayOfMonth = loanStartDate.getDate();
      
      // Calculate the next payment date
      const nextPaymentDate = this.getNextPaymentDate(loanStartDate, account.last_auto_update);
      
      // Check if it's time for the next payment
      if (today < nextPaymentDate) {
        const daysUntilNext = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { success: false, newBalance: account.current_balance, interestAdded: 0, error: `Next payment due in ${daysUntilNext} days (${nextPaymentDate.toLocaleDateString()})` };
      }

      // Calculate interest for this month
      const monthlyRate = this.calculateMonthlyRate(account.apr_rate);
      const interestAdded = account.current_balance * monthlyRate;
      const newBalance = account.current_balance + interestAdded;

      // Record new balance with amortization details
      await db.run(`
        INSERT INTO balances (
          account_id, amount, date, balance_type, interest_amount, 
          notes, created_at, updated_at
        )
        VALUES (?, ?, ?, 'automatic', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        accountId, 
        newBalance, 
        nextPaymentDate.toISOString().split('T')[0], // Use the actual payment date
        interestAdded,
        `Automatic monthly payment applied on ${nextPaymentDate.toLocaleDateString()}: ${(account.apr_rate * 100).toFixed(2)}% APR`
      ]);

      // Update last auto-update date and remaining months
      const newRemainingMonths = Math.max(0, (account.remaining_months || 0) - 1);
      await db.run(`
        UPDATE accounts 
        SET last_auto_update = ?, remaining_months = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nextPaymentDate.toISOString().split('T')[0], newRemainingMonths, accountId]);

      return { success: true, newBalance, interestAdded };
    } catch (error) {
      console.error('Error applying monthly update:', error);
      return { success: false, newBalance: 0, interestAdded: 0, error: 'Database error' };
    }
  }

  /**
   * Get debt summaries for all family debt accounts
   */
  async getDebtSummaries(familyId: number): Promise<DebtSummary[]> {
    try {
      const db = await getDatabase();
      
      const debts = await db.all(`
        SELECT a.*,
               COALESCE(
                 (SELECT amount FROM balances 
                  WHERE account_id = a.id 
                  ORDER BY date DESC, created_at DESC 
                  LIMIT 1), 
                 0
               ) as current_balance
        FROM accounts a 
        WHERE a.family_id = ? AND a.category = 'Debt'
        ORDER BY a.name
      `, [familyId]) as (Account & { current_balance: number })[];

      return debts.map(debt => {
        const nextPayment = this.calculateNextPayment(debt, debt.current_balance);
        
        let payoffDate: string | undefined;
        if (debt.remaining_months && debt.remaining_months > 0) {
          const payoff = new Date();
          payoff.setMonth(payoff.getMonth() + debt.remaining_months);
          payoffDate = payoff.toISOString().split('T')[0];
        }

        const schedule = this.generateAmortizationSchedule(debt, debt.current_balance);
        
        return {
          accountId: debt.id,
          accountName: debt.name,
          currentBalance: debt.current_balance,
          monthlyPayment: debt.monthly_payment || 0,
          interestThisMonth: nextPayment?.interestPayment || 0,
          principalThisMonth: nextPayment?.principalPayment || 0,
          payoffDate,
          totalInterestRemaining: schedule?.totalInterest || 0,
          autoUpdateEnabled: debt.auto_update_enabled || false,
          lastAutoUpdate: debt.last_auto_update
        };
      });
    } catch (error) {
      console.error('Error getting debt summaries:', error);
      return [];
    }
  }

  /**
   * Run monthly updates for all eligible debt accounts
   */
  async runMonthlyUpdatesForFamily(familyId: number): Promise<{ updated: number; errors: string[] }> {
    try {
      const db = await getDatabase();
      
      const eligibleDebts = await db.all(`
        SELECT id FROM accounts 
        WHERE family_id = ? 
          AND category = 'Debt' 
          AND auto_update_enabled = 1
          AND apr_rate IS NOT NULL
          AND remaining_months > 0
      `, [familyId]) as { id: number }[];

      let updated = 0;
      const errors: string[] = [];

      for (const debt of eligibleDebts) {
        const result = await this.applyMonthlyUpdate(debt.id);
        if (result.success) {
          updated++;
        } else if (result.error && !result.error.includes('Already updated this month')) {
          errors.push(`Account ${debt.id}: ${result.error}`);
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Error running monthly updates:', error);
      return { updated: 0, errors: ['Database error'] };
    }
  }
}

export const amortizationService = AmortizationService.getInstance();