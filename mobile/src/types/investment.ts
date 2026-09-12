export type AssetType = 'STOCK' | 'MUTUAL_FUND' | 'ETF' | 'SGB';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'SIP';

export interface InvestmentAccount {
  id: string;
  user_id: string;
  name: string;
  broker_name: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
}

export interface InvestmentAsset {
  id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  exchange: string;
  currency: string;
  current_price: number;
  previous_close?: number;
  day_change?: number;
  day_change_pct?: number;
  last_price_update?: string;
}

export interface Holding {
  id: string;
  account_id: string;
  account_name: string;
  asset: InvestmentAsset;
  quantity: number;
  average_buy_price: number;
  total_invested: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  day_pnl: number;
}

export interface HoldingUpdatePayload {
  quantity?: number;
  average_buy_price?: number;
  notes?: string;
}

export interface StockSuggestion {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  category: string;
  current_price: number;
  day_change_pct?: number;
  tag: string;
  rationale: string;
}

export interface StockSearchItem {
  symbol: string;
  name: string;
  exchange: string;
  asset_type: AssetType;
  current_price?: number;
  day_change_pct?: number;
}

export interface PortfolioSummary {
  total_current_value: number;
  total_invested: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_pct: number;
  total_day_pnl: number;
  holdings: Holding[];
}

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  account_id: string;
  asset_id: string;
  transaction_type: TransactionType;
  quantity: number;
  price: number;
  amount: number;
  charges: number;
  transaction_date: string;
  notes?: string;
  asset?: InvestmentAsset;
}

export interface TransactionCreatePayload {
  account_id: string;
  symbol: string;
  name?: string;
  asset_type: AssetType;
  transaction_type: TransactionType;
  quantity: number;
  price: number;
  charges?: number;
  transaction_date: string;
  notes?: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  asset_id: string;
  target_price?: number;
  notes?: string;
  created_at: string;
  asset: InvestmentAsset;
}

export interface WatchlistCreatePayload {
  symbol: string;
  name?: string;
  asset_type?: AssetType;
  target_price?: number;
  notes?: string;
}

export interface IPOPrompt {
  id: string;
  user_id: string;
  name: string;
  prompt_content: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface IPOPromptCreatePayload {
  name: string;
  prompt_content: string;
  is_default?: boolean;
}

export interface IPOPromptUpdatePayload {
  name?: string;
  prompt_content?: string;
  is_default?: boolean;
}

export interface IPOAnalyzeRequest {
  ipo_name: string;
  prompt_id?: string;
  details?: string;
}

export interface IPOAnalyzeResult {
  ipo_name: string;
  used_prompt_name: string;
  analysis_markdown: string;
}
