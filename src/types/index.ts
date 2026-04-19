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

// Transaction types
export type CategoryType = 'income' | 'expense' | 'both' | 'non_computable';

export interface TransactionCategory {
  id: number;
  family_id: number;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  ai_description?: string;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  family_id: number;
  category_id?: number | null;
  amount: number;
  currency: string;
  date: string;
  value_date?: string | null;
  description: string;
  detail?: string | null;
  observations?: string | null;
  movement_type?: string | null;
  balance_after?: number | null;
  is_transfer: boolean;
  import_batch_id?: string | null;
  source?: string | null;
  source_hash: string;
  ai_confidence?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  account_name?: string;
}

export type RuleType = 'contains_text' | 'sender_is' | 'description_matches';
export type RuleField = 'description' | 'detail' | 'observations' | 'any';

export interface TransferRule {
  id: number;
  family_id: number;
  rule_type: RuleType;
  pattern: string;
  field: RuleField;
  is_active: boolean;
  created_at: string;
}

export interface FamilySettings {
  id: number;
  family_id: number;
  ai_api_key_encrypted?: string | null;
  ai_base_url: string;
  ai_model: string;
  ai_last_test?: string | null;
  ai_chat_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

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

export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  byCategory: {
    categoryId: number;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    amount: number;
    count: number;
    type: CategoryType;
  }[];
  transfersCount: number;
  transfersTotal: number;
  nonComputableCount: number;
  nonComputableTotal: number;
}

export interface CategoryEvolution {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  type: CategoryType;
  evolution: { month: string; amount: number }[];
}

// AI Chat types
export type ChatMessageRole = 'user' | 'ai-operation' | 'ai-response' | 'system' | 'ai-action';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
}

export interface AiOperationEvent {
  type: 'info' | 'success' | 'error';
  message: string;
  timestamp: string;
}

// DB-persisted chat types
export type ConversationType = 'auto' | 'manual';
export type ConversationStatus = 'active' | 'closed';

export interface ChatConversation {
  id: number;
  family_id: number;
  user_id: number;
  title: string;
  type: ConversationType;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  message_count?: number;
}

export interface ChatMessageDB {
  id: number;
  conversation_id: number;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
}