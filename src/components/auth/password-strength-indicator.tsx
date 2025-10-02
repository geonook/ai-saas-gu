'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const requirements = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Contains number',
      met: /\d/.test(password),
    },
  ]

  const metRequirements = requirements.filter(req => req.met).length
  const strength = metRequirements / requirements.length

  const getStrengthColor = () => {
    if (strength <= 0.25) return 'bg-red-500'
    if (strength <= 0.5) return 'bg-orange-500'
    if (strength <= 0.75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (strength <= 0.25) return 'Weak'
    if (strength <= 0.5) return 'Fair'
    if (strength <= 0.75) return 'Good'
    return 'Strong'
  }

  if (!password) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Password strength
          </span>
          <span className={cn(
            "text-xs font-medium",
            strength <= 0.25 ? "text-red-600 dark:text-red-400" :
            strength <= 0.5 ? "text-orange-600 dark:text-orange-400" :
            strength <= 0.75 ? "text-yellow-600 dark:text-yellow-400" :
            "text-green-600 dark:text-green-400"
          )}>
            {getStrengthText()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow={strength * 100} aria-valuemin={0} aria-valuemax={100} aria-label="Password strength">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              getStrengthColor()
            )}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-1" role="list" aria-label="Password requirements">
        {requirements.map((requirement, index) => (
          <div key={index} className="flex items-center space-x-2" role="listitem">
            {requirement.met ? (
              <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
            ) : (
              <X className="w-3 h-3 text-gray-400" aria-hidden="true" />
            )}
            <span className={cn(
              "text-xs",
              requirement.met 
                ? "text-green-600 dark:text-green-400" 
                : "text-gray-500 dark:text-gray-400"
            )}>
              {requirement.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}