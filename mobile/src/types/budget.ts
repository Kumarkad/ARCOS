export interface BudgetCategoryInput {
  category_id: string;
  allocated_amount: number;
}

export interface BudgetCreate {
  name: string;
  total_amount: number;
  period?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  start_date: string;
  end_date: string;
  categories?: BudgetCategoryInput[];
}

export interface BudgetCategoryStatus {
  category_id: string;
  category_name: string;
  category_icon?: string | null;
  category_color?: string | null;
  allocated_amount: number | string;
  spent_amount: number | string;
  remaining_amount: number | string;
  utilization_pct: number;
  status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
  warning_message?: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  total_amount: number | string;
  period: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  total_spent: number | string;
  total_remaining: number | string;
  total_utilization_pct: number;
  overall_status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
  categories: BudgetCategoryStatus[];
}
