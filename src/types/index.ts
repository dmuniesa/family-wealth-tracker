export type UserRole = 'administrator' | 'user' | 'guest';

export interface User {
  id: number;
  email: string;
  name: string;
  family_id: number;
  role: UserRole;
  created_at: string;
  password_hash?: string; // Only present in database operations
  notifications_enabled?: boolean; // Weekly report notifications
}

export interface Account {
  id: number;
  family_id: number;
  name: string;
  category: "Banking" | "Investment" | "Debt";
  currency: "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD";
  iban_encrypted: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Amortization fields for debt accounts
  apr_rate?: number; // Annual Percentage Rate (TAE) as decimal (e.g., 0.05 for 5%)
  monthly_payment?: number; // Fixed monthly payment amount
  loan_term_months?: number; // Original loan term in months
  remaining_months?: number; // Remaining months to pay
  payment_type?: 'fixed' | 'interest_only'; // Payment calculation method
  auto_update_enabled?: boolean; // Enable automatic monthly updates
  last_auto_update?: string; // Date of last automatic update
  original_balance?: number; // Original loan amount
  loan_start_date?: string; // When the loan started
}

export interface Balance {
  id: number;
  account_id: number;
  amount: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  current_balance?: number;
  last_balance_date?: string;
}

export interface DashboardData {
  total_banking: number;
  total_investment: number;
  total_debt: number;
  net_worth: number;
  month_over_month_change: number;
}

export interface AuthSession {
  user?: User;
  save?: () => Promise<void>;
  destroy?: () => void;
}