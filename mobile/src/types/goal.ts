export interface Goal {
  id: string;
  user_id: string;
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  progress_pct: number;
  remaining_amount: number;
  monthly_contribution_needed: number;
  days_remaining: number;
  created_at: string;
}

export interface GoalCreatePayload {
  name: string;
  category?: string;
  target_amount: number;
  current_amount?: number;
  target_date: string;
}

export interface GoalUpdatePayload {
  name?: string;
  category?: string;
  target_amount?: number;
  current_amount?: number;
  target_date?: string;
  status?: string;
}

export interface GoalContributePayload {
  amount: number;
}
