'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { getAuthErrorMessage } from '@/lib/auth/utils'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ResetForm = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const { user, resetPassword } = useAuth()

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  })

  useEffect(() => {
    if (user) {
      router.replace('/')
    }
  }, [user, router])

  const handleSubmit = async (data: ResetForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await resetPassword(data.email)

      if (resetError) {
        setError(getAuthErrorMessage(resetError))
      } else {
        setSuccess(true)
      }
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
        description="We've sent password reset instructions"
        footer={
          <div className="flex flex-col space-y-3 w-full">
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              Resend email
            </Button>
            <Link 
              href="/auth/login"
              className="text-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to login
            </Link>
          </div>
        }
      >
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              If an account with that email exists, we've sent password reset instructions to:
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {form.getValues('email')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email address and we'll send you a reset link"
      footer={
        <Link 
          href="/auth/login"
          className="text-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to login
        </Link>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-4"
        suppressHydrationWarning>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
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

        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            We'll send you an email with instructions to reset your password. Make sure to check your spam folder if you don't see it in your inbox.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 font-medium"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Sending reset link...' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  )
}