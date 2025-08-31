export interface User {
  id: number;
  email: string;
  name: string;
  family_id: number;
  created_at: string;
  password_hash?: string; // Only present in database operations
}

export interface Account {
  id: number;
  family_id: number;
  name: string;
  category: "Banking" | "Investment";
  currency: "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD";
  iban_encrypted: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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
  net_worth: number;
  month_over_month_change: number;
}

export interface AuthSession {
  user?: User;
  save?: () => Promise<void>;
  destroy?: () => void;
}