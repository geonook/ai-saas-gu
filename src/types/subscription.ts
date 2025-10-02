export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  tier: 'free' | 'pro' | 'enterprise';
  popular?: boolean;
  stripe_price_id?: string;
}

export interface SubscriptionStatus {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  created_at: string;
  due_date: string;
  paid_at?: string;
  invoice_pdf?: string;
  stripe_invoice_id?: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'card' | 'bank_account';
  last_four: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  stripe_payment_method_id: string;
  created_at: string;
}

export interface BillingInfo {
  subscription: SubscriptionStatus;
  upcoming_invoice?: Invoice;
  payment_methods: PaymentMethod[];
  usage: UsageMetrics;
}

export interface UsageMetrics {
  current_period_usage: Record<string, number>;
  limits: Record<string, number>;
  overage_charges: number;
}