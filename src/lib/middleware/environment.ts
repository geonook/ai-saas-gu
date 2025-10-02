/**
 * Environment detection utilities for middleware
 * Helps detect development mode, Turbopack usage, and provides warnings
 */

export interface EnvironmentInfo {
  isDevelopment: boolean
  isProduction: boolean
  isTurbopackEnabled: boolean
  shouldWarnAboutTurbopack: boolean
}

/**
 * Detects the current environment and Turbopack status
 */
export function detectEnvironment(): EnvironmentInfo {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Turbopack detection methods
  const isTurbopackEnabled = !!(
    // Check for Turbopack-specific environment variables
    process.env.__TURBOPACK__ ||
    process.env.TURBOPACK ||
    // Check for common Turbopack indicators
    process.env.npm_config_argv?.includes('--turbopack') ||
    process.env.npm_lifecycle_script?.includes('--turbopack') ||
    // Check command line arguments if available
    (typeof process !== 'undefined' && process.argv?.includes('--turbopack'))
  )

  const shouldWarnAboutTurbopack = isDevelopment && isTurbopackEnabled

  return {
    isDevelopment,
    isProduction,
    isTurbopackEnabled,
    shouldWarnAboutTurbopack
  }
}

/**
 * Logs environment information and warnings
 */
export function logEnvironmentInfo(env: EnvironmentInfo, pathname?: string) {
  const prefix = '[Middleware Environment]'
  
  if (env.shouldWarnAboutTurbopack) {
    console.warn(
      `${prefix} ⚠️  TURBOPACK DETECTED - Middleware may not execute properly!`,
      '\n  📋 Current environment:', {
        development: env.isDevelopment,
        turbopack: env.isTurbopackEnabled,
        pathname: pathname || 'unknown'
      },
      '\n  🔧 Solutions:',
      '\n     • Use "npm run dev" instead of "npm run dev:turbo"',
      '\n     • Remove --turbopack flag from your dev command',
      '\n     • Layout-level auth protection is active as fallback'
    )
  } else if (env.isDevelopment) {
    console.log(
      `${prefix} ✅ Development mode - Middleware should execute normally`,
      pathname ? `(Processing: ${pathname})` : ''
    )
  }
}

/**
 * Creates a warning for client-side code when Turbopack is detected
 */
export function createTurbopackWarning(): string {
  return `
🚨 DEVELOPMENT WARNING: Turbopack Detected

Your development server is running with Turbopack (--turbopack flag), which may prevent 
middleware from executing properly. This could affect authentication and route protection.

SOLUTIONS:
1. Use "npm run dev" instead of "npm run dev:turbo"
2. Remove --turbopack flag from your development command
3. Layout-level authentication is active as a fallback

For more information, see: https://nextjs.org/docs/messages/middleware-upgrade-guide
  `.trim()
}

/**
 * Checks if middleware should be bypassed due to environment issues
 */
export function shouldBypassMiddleware(pathname: string): boolean {
  const env = detectEnvironment()
  
  // In development with Turbopack, we rely more heavily on layout-level protection
  if (env.shouldWarnAboutTurbopack) {
    // Still try to run middleware, but don't fail hard if it doesn't work
    logEnvironmentInfo(env, pathname)
    return false // Still attempt to run middleware
  }
  
  return false
}