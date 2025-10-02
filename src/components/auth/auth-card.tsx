'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            SaaSonic
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Build Your SaaS at Sonic Speed
          </p>
        </div>

        {/* Auth Card */}
        <Card className={cn(
          "shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm",
          "transition-all duration-300 hover:shadow-2xl",
          "w-full",
          className
        )}>
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                {description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {children}
          </CardContent>
          {footer && (
            <CardFooter className="flex flex-col space-y-4 pt-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-700">
              {footer}
            </CardFooter>
          )}
        </Card>

        {/* Footer text */}
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}