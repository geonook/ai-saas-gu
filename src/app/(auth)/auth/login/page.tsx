'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { getAuthErrorMessage } from '@/lib/auth/utils'
import { AuthCard } from '@/components/auth/auth-card'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, continueWithGoogle, continueWithGitHub, user } = useAuth()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const redirectTo = searchParams.get('redirectTo') || '/'
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [urlError])

  useEffect(() => {
    if (user) {
      router.replace(redirectTo)
    }
  }, [user, redirectTo, router])

  const handleSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: signInError } = await signIn(data.email, data.password)

      if (signInError) {
        setError(getAuthErrorMessage(signInError))
      } else {
        // Handle remember me functionality if needed
        if (data.rememberMe) {
          // Store preference in localStorage or handle as needed
          localStorage.setItem('rememberMe', 'true')
        }
        router.replace(redirectTo)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github') => {
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

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account to continue"
      footer={
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link 
            href="/auth/signup" 
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Sign up here
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
        onGoogleLogin={() => handleSocialLogin('google')}
        onGithubLogin={() => handleSocialLogin('github')}
        isLoading={isLoading}
        className="mb-6"
      />

      <form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-4"
        suppressHydrationWarning>
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
              placeholder="Enter your password"
              autoComplete="current-password"
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              {...form.register('rememberMe')}
            />
            <Label 
              htmlFor="rememberMe" 
              className="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <Link 
            href="/auth/reset-password" 
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 font-medium"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Loading...">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AuthCard>
    }>
      <LoginPageContent />
    </Suspense>
  )
}