'use client'

import { useEffect, useState } from 'react'
import { createTurbopackWarning } from '@/lib/middleware/environment'

/**
 * Development-only component that warns users when Turbopack is detected
 * This helps developers understand why middleware might not be working
 */
export function TurbopackWarning() {
  const [shouldShowWarning, setShouldShowWarning] = useState(false)

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return

    // Check for Turbopack indicators on the client side
    const isTurbopackDetected = !!(
      // Check for Turbopack in the user agent (if injected)
      navigator.userAgent.includes('Turbopack') ||
      // Check for Turbopack in window object (if available)
      (typeof window !== 'undefined' && '__TURBOPACK__' in window) ||
      // Check for other Turbopack indicators
      document.documentElement.getAttribute('data-turbopack')
    )

    if (isTurbopackDetected) {
      setShouldShowWarning(true)
      // Log warning to console
      console.warn(createTurbopackWarning())
    }
  }, [])

  // Only render in development
  if (process.env.NODE_ENV !== 'development' || !shouldShowWarning) {
    return null
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b-2 border-yellow-200 p-3 shadow-lg"
      role="alert"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">
              Development Warning: Turbopack Detected
            </h3>
            <p className="text-xs text-yellow-700 mb-2">
              Middleware may not execute properly with Turbopack. Authentication relies on layout-level protection.
            </p>
            <div className="text-xs text-yellow-600">
              <strong>Solutions:</strong> Use <code className="bg-yellow-100 px-1 rounded">npm run dev</code> instead of <code className="bg-yellow-100 px-1 rounded">npm run dev:turbo</code>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => setShouldShowWarning(false)}
              className="text-yellow-400 hover:text-yellow-600 text-lg font-bold"
              aria-label="Dismiss warning"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}