export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_system: boolean;
  type: 'expense' | 'income' | 'bike';
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string;
  amount: number | string;
  currency: string;
  description: string;
  merchant?: string | null;
  payment_method: string;
  expense_date: string;
  notes?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface ExpenseCreate {
  amount: number;
  currency?: string;
  category_id: string;
  description: string;
  merchant?: string;
  payment_method?: string;
  expense_date: string;
  notes?: string;
  idempotency_key?: string;
}

export interface ExpenseUpdate {
  amount?: number;
  currency?: string;
  category_id?: string;
  description?: string;
  merchant?: string;
  payment_method?: string;
  expense_date?: string;
  notes?: string;
}

export interface CategorySpend {
  category_id: string;
  category_name: string;
  category_icon?: string | null;
  category_color?: string | null;
  total_amount: number | string;
  percentage: number;
}

export interface ExpenseSummary {
  today_total: number | string;
  this_month_total: number | string;
  total_expenses_count: number;
  category_breakdown: CategorySpend[];
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Income {
  id: string;
  user_id: string;
  amount: number | string;
  currency: string;
  source: string;
  description?: string | null;
  income_date: string;
  is_recurring: boolean;
  recurrence_period?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeCreate {
  amount: number;
  currency?: string;
  source: string;
  description?: string;
  income_date: string;
  is_recurring?: boolean;
  recurrence_period?: string;
}
