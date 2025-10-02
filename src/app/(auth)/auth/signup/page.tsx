'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { getAuthErrorMessage, isStrongPassword } from '@/lib/auth/utils'
import { AuthCard } from '@/components/auth/auth-card'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(isStrongPassword, {
      message: 'Password must contain uppercase, lowercase, and number'
    }),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

function SignUpPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, continueWithGoogle, continueWithGitHub, user } = useAuth()

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  })

  const password = form.watch('password')
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [urlError])

  useEffect(() => {
    if (user) {
      router.replace('/')
    }
  }, [user, router])

  const handleSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await signUp(data.email, data.password, {
        full_name: data.fullName.trim() || undefined,
      })

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError))
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignup = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    setError(null)

    try {
      let result
      if (provider === 'google') {
        result = await continueWithGoogle()
      } else {
        result = await continueWithGitHub()
      }

      if (result.error) {
        setError(getAuthErrorMessage(result.error))
      }
      // OAuth providers will handle the redirect automatically
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (user) {
    return (
      <AuthCard title="Redirecting...">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Taking you to your dashboard...</span>
        </div>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard
        title="Check your email"
        description="We've sent you a confirmation link"
        footer={
          <Button
            onClick={() => router.push('/auth/login')}
            variant="outline"
            className="w-full"
          >
            Back to Login
          </Button>
        }
      >
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              We&apos;ve sent a confirmation link to:
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {form.getValues('email')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click the link in the email to complete your registration.
            </p>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create your account"
      description="Join thousands of users building their SaaS"
      footer={
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link 
            href="/auth/login" 
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Sign in here
          </Link>
        </div>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SocialLoginButtons
        onGoogleLogin={() => handleSocialSignup('google')}
        onGithubLogin={() => handleSocialSignup('github')}
        isLoading={isLoading}
        className="mb-6"
      />

      <form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-4"
        suppressHydrationWarning>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            {...form.register('fullName')}
            className={cn(
              "h-11",
              form.formState.errors.fullName && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {form.formState.errors.fullName && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.fullName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            {...form.register('email')}
            className={cn(
              "h-11",
              form.formState.errors.email && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              autoComplete="new-password"
              {...form.register('password')}
              className={cn(
                "h-11 pr-10",
                form.formState.errors.password && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.password.message}
            </p>
          )}
          {password && !form.formState.errors.password && (
            <PasswordStrengthIndicator password={password} className="mt-2" />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
              className={cn(
                "h-11 pr-10",
                form.formState.errors.confirmPassword && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="termsAccepted"
              checked={form.watch('termsAccepted')}
              onCheckedChange={(checked) => {
                form.setValue('termsAccepted', checked as boolean, { shouldValidate: true })
              }}
              className="mt-0.5"
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="termsAccepted" 
                className="text-sm font-normal cursor-pointer"
              >
                I agree to the{' '}
                <Link 
                  href="/terms" 
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  target="_blank"
                >
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link 
                  href="/privacy" 
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
              </Label>
            </div>
          </div>
          {form.formState.errors.termsAccepted && (
            <p className="text-sm text-red-600 dark:text-red-400 ml-6">
              {form.formState.errors.termsAccepted.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 font-medium"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Loading...">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AuthCard>
    }>
      <SignUpPageContent />
    </Suspense>
  )
}