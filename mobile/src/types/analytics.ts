export interface PeriodTrend {
  period: string;
  total_amount: number | string;
  expense_count: number;
}

export interface MerchantSpend {
  merchant: string;
  total_amount: number | string;
  count: number;
}

export interface PaymentMethodSpend {
  payment_method: string;
  total_amount: number | string;
  percentage: number;
}

export interface SpendingInsight {
  type: 'anomaly' | 'warning' | 'tip' | 'milestone';
  title: string;
  message: string;
  icon: string;
}

export interface SpendingAnalytics {
  daily_average: number | string;
  weekly_average: number | string;
  monthly_average: number | string;
  this_month_total: number | string;
  last_month_total: number | string;
  month_over_month_change_pct: number;
  monthly_trends: PeriodTrend[];
  top_merchants: MerchantSpend[];
  payment_methods: PaymentMethodSpend[];
  insights: SpendingInsight[];
}
