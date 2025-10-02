'use client'

import React from 'react'
import { AuthCard } from './auth-card'
import { Loader2 } from 'lucide-react'

interface AuthLoadingProps {
  message?: string
}

export function AuthLoading({ message = "Loading..." }: AuthLoadingProps) {
  return (
    <AuthCard title={message}>
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span className="text-gray-600 dark:text-gray-400">Please wait...</span>
        </div>
      </div>
    </AuthCard>
  )
}