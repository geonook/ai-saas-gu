export const APP_NAME = 'SaaSonic';
export const APP_DESCRIPTION = 'Build and scale your SaaS applications faster with our comprehensive framework';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const CONTACT_EMAIL = 'support@saasonic.com';
export const SUPPORT_EMAIL = 'help@saasonic.com';

export const SOCIAL_LINKS = {
  github: 'https://github.com/saasonic',
  twitter: 'https://twitter.com/saasonic',
  linkedin: 'https://linkedin.com/company/saasonic',
  discord: 'https://discord.gg/saasonic',
};

export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      'Up to 1,000 users',
      'Basic analytics',
      'Email support',
      'Standard integrations',
      'Basic API access',
    ],
    limits: {
      users: 1000,
      api_requests: 10000,
      storage: 1024 * 1024 * 1024, // 1GB
    },
  },
  PRO: {
    name: 'Pro',
    price: 29,
    features: [
      'Up to 10,000 users',
      'Advanced analytics',
      'Priority support',
      'All integrations',
      'Full API access',
      'Custom branding',
      'Advanced security',
    ],
    limits: {
      users: 10000,
      api_requests: 100000,
      storage: 10 * 1024 * 1024 * 1024, // 10GB
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    features: [
      'Unlimited users',
      'Custom analytics',
      'Dedicated support',
      'Custom integrations',
      'Enterprise API',
      'Full customization',
      'Enterprise security',
      'SLA guarantee',
    ],
    limits: {
      users: Infinity,
      api_requests: Infinity,
      storage: Infinity,
    },
  },
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE: '/api/user/update',
    DELETE: '/api/user/delete',
  },
  SUBSCRIPTION: {
    PLANS: '/api/subscription/plans',
    CURRENT: '/api/subscription/current',
    UPGRADE: '/api/subscription/upgrade',
    CANCEL: '/api/subscription/cancel',
    INVOICES: '/api/subscription/invoices',
  },
  BILLING: {
    PAYMENT_METHODS: '/api/billing/payment-methods',
    ADD_PAYMENT_METHOD: '/api/billing/add-payment-method',
    UPDATE_PAYMENT_METHOD: '/api/billing/update-payment-method',
    DELETE_PAYMENT_METHOD: '/api/billing/delete-payment-method',
  },
};

export const NAVIGATION_ITEMS = [
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Documentation', href: '/docs' },
  { name: 'Contact', href: '/contact' },
];

export const DASHBOARD_NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: 'BarChart3' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: 'TrendingUp' },
  { name: 'Users', href: '/dashboard/users', icon: 'Users' },
  { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
  { name: 'Billing', href: '/dashboard/billing', icon: 'CreditCard' },
];

export const FEATURE_FLAGS = {
  BETA_FEATURES: process.env.NODE_ENV === 'development',
  ANALYTICS_ENABLED: true,
  DARK_MODE: true,
  NOTIFICATIONS: true,
};