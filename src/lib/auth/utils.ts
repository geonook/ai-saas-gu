import { type AuthError } from '@supabase/supabase-js'

export function getAuthErrorMessage(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password. Please try again.'
    case 'User not found':
      return 'No account found with this email address.'
    case 'Email not confirmed':
      return 'Please check your email and click the confirmation link before signing in.'
    case 'Signup not allowed for this instance':
      return 'New account creation is currently disabled.'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long.'
    case 'Unable to validate email address: invalid format':
      return 'Please enter a valid email address.'
    case 'Email address not authorized':
      return 'This email address is not authorized to create an account.'
    case 'For security purposes, you can only request this after 60 seconds':
      return 'Please wait 60 seconds before requesting another password reset email.'
    case 'To signup, please provide your email':
      return 'Email address is required for account creation.'
    case 'unexpected_failure':
      return 'Server error occurred. This might be due to email service configuration. Please try again later or contact support.'
    case 'Error sending recovery email':
      return 'Email service is not configured properly. Please contact support or try again later.'
    default:
      // Log the original error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled auth error:', error)
      }
      return error.message || 'An unexpected error occurred. Please try again.'
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isStrongPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return strongPasswordRegex.test(password)
}

export function getPasswordStrengthMessage(password: string): string {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return 'Password must include at least one lowercase letter'
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Password must include at least one uppercase letter'
  }
  if (!/(?=.*\d)/.test(password)) {
    return 'Password must include at least one number'
  }
  return ''
}

export function getRedirectUrl(request?: Request): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  if (request) {
    const url = new URL(request.url)
    return url.origin
  }
  
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}