export interface PendingAction {
  action_id: string;
  action_type: string;
  preview_title: string;
  preview_text: string;
  amount: number | string;
  category_name: string;
  category_id?: string | null;
  expense_date: string;
  payment_method: string;
  merchant?: string | null;
  description: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  pending_action?: PendingAction | null;
  created_at: string;
  action_status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface ActionConfirmResponse {
  success: boolean;
  message: string;
  expense_id?: string | null;
}
