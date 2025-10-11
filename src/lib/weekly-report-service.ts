import { getDatabase } from './database';
import type { Account, Balance, User } from '@/types';

export interface WeeklyReportAccount {
  name: string;
  category: string;
  currency: string;
  currentBalance: number;
  weekChange: number;
  weekChangePercentage: number;
}

export interface WeeklyReportSummary {
  totalBanking: number;
  totalInvestment: number;
  totalDebt: number;
  netWorth: number;
  weekOverWeekChange: number;
  weekOverWeekPercentage: number;
  previousWeekNetWorth: number;
}

export interface WeeklyReportData {
  familyId: number;
  familyName: string;
  period: {
    start: string;
    end: string;
    weekNumber: number;
    year: number;
  };
  summary: WeeklyReportSummary;
  accounts: WeeklyReportAccount[];
  recipients: Array<{
    email: string;
    name: string;
    notificationsEnabled: boolean;
  }>;
  generatedAt: string;
}

export class WeeklyReportService {
  
  static async generateWeeklyReport(familyId: number): Promise<WeeklyReportData> {
    const db = await getDatabase();
    
    // Calculate week boundaries
    const now = new Date();
    const currentWeekStart = this.getWeekStart(now);
    const currentWeekEnd = this.getWeekEnd(currentWeekStart);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(currentWeekEnd);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

    // Get family members
    const family = await db.all(
      'SELECT email, name FROM users WHERE family_id = ?',
      [familyId]
    ) as Array<{ email: string; name: string }>;

    if (family.length === 0) {
      throw new Error('Family not found');
    }

    // Get all accounts for the family
    const accounts = await db.all(
      'SELECT * FROM accounts WHERE family_id = ? ORDER BY category, name',
      [familyId]
    ) as Account[];

    // Generate account reports
    const accountReports: WeeklyReportAccount[] = [];
    let totalBanking = 0;
    let totalInvestment = 0;
    let totalDebt = 0;
    let previousWeekBanking = 0;
    let previousWeekInvestment = 0;
    let previousWeekDebt = 0;

    for (const account of accounts) {
      const currentBalance = await this.getLatestBalance(account.id, currentWeekEnd);
      const previousWeekBalance = await this.getLatestBalance(account.id, previousWeekEnd);
      
      const weekChange = currentBalance - previousWeekBalance;
      const weekChangePercentage = previousWeekBalance !== 0 
        ? (weekChange / Math.abs(previousWeekBalance)) * 100 
        : 0;

      accountReports.push({
        name: account.name,
        category: account.category,
        currency: account.currency,
        currentBalance,
        weekChange,
        weekChangePercentage
      });

      // Accumulate totals
      if (account.category === 'Banking') {
        totalBanking += currentBalance;
        previousWeekBanking += previousWeekBalance;
      } else if (account.category === 'Investment') {
        totalInvestment += currentBalance;
        previousWeekInvestment += previousWeekBalance;
      } else if (account.category === 'Debt') {
        totalDebt += currentBalance;
        previousWeekDebt += previousWeekBalance;
      }
    }

    // Calculate summary
    const netWorth = totalBanking + totalInvestment - totalDebt;
    const previousWeekNetWorth = previousWeekBanking + previousWeekInvestment - previousWeekDebt;
    const weekOverWeekChange = netWorth - previousWeekNetWorth;
    const weekOverWeekPercentage = previousWeekNetWorth !== 0 
      ? (weekOverWeekChange / Math.abs(previousWeekNetWorth)) * 100 
      : 0;

    // Get family name (use first family member's name or generate from family ID)
    const familyName = family.length > 0 
      ? `${family[0].name}'s Family` 
      : `Family ${familyId}`;

    return {
      familyId,
      familyName,
      period: {
        start: this.formatDate(currentWeekStart),
        end: this.formatDate(currentWeekEnd),
        weekNumber: this.getWeekNumber(now),
        year: now.getFullYear()
      },
      summary: {
        totalBanking,
        totalInvestment,
        totalDebt,
        netWorth,
        weekOverWeekChange,
        weekOverWeekPercentage,
        previousWeekNetWorth
      },
      accounts: accountReports,
      recipients: family.map(member => ({
        email: member.email,
        name: member.name,
        notificationsEnabled: true // TODO: Add user preference check
      })),
      generatedAt: new Date().toISOString()
    };
  }

  static async getAllFamiliesForReporting(): Promise<number[]> {
    const db = await getDatabase();
    const families = await db.all(
      'SELECT DISTINCT family_id FROM users ORDER BY family_id'
    ) as Array<{ family_id: number }>;
    
    return families.map(f => f.family_id);
  }

  private static async getLatestBalance(accountId: number, beforeDate: Date): Promise<number> {
    const db = await getDatabase();

    const balance = await db.get(
      'SELECT amount FROM balances WHERE account_id = ? AND date <= ? ORDER BY created_at DESC, id DESC LIMIT 1',
      [accountId, this.formatDate(beforeDate)]
    ) as { amount: number } | null;

    return balance?.amount || 0;
  }

  private static getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day; // Sunday is 0
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private static getWeekEnd(weekStart: Date): Date {
    const result = new Date(weekStart);
    result.setDate(result.getDate() + 6);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private static getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static formatPercentage(percentage: number): string {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  }

  static getWeekPeriodText(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
    } else if (start.getMonth() !== end.getMonth()) {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
    } else {
      return `${start.toLocaleDateString('en-US', { day: 'numeric' })} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
    }
  }
}