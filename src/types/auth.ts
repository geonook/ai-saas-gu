// Re-export Supabase auth types for consistency
export type { User as AuthUser, Session, AuthError } from '@supabase/supabase-js'

// Profile type from database
import type { Database } from './database'
export type Profile = Database['public']['Tables']['profiles_saas']['Row']

// Extended user interface combining Supabase User with Profile
export interface ExtendedUser {
  user: import('@supabase/supabase-js').User
  profile: Profile | null
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  terms_accepted: boolean;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface OAuthProvider {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  session: import('@supabase/supabase-js').Session | null;
  profile: Profile | null;
  loading: boolean;
  error: import('@supabase/supabase-js').AuthError | null;
}