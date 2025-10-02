'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles_saas']['Row']

export interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  continueWithGoogle: () => Promise<{ error: AuthError | null }>
  continueWithGitHub: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: AuthError | null }>
  refreshSession: () => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  const supabase = React.useMemo(() => {
    const client = createClient()
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [AuthContext] Supabase client initialized')
    }
    return client
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles_saas')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }

  const handleAuthChange = async (event: string, currentSession: Session | null) => {
    setSession(currentSession)
    setUser(currentSession?.user ?? null)
    setError(null)

    if (currentSession?.user) {
      const profileData = await fetchProfile(currentSession.user.id)
      setProfile(profileData)
    } else {
      setProfile(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [AuthContext] Getting initial session')
        }
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('❌ [AuthContext] Initial session error:', error)
          setError(error)
          setLoading(false)
          return
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [AuthContext] Initial session retrieved:', !!session)
        }
        await handleAuthChange('INITIAL_SESSION', session)
      } catch (err) {
        console.error('❌ [AuthContext] Error getting initial session:', err)
        if (mounted) {
          setError(err as AuthError)
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [AuthContext] Auth state changed:', event, !!session)
      }
      if (mounted) {
        handleAuthChange(event, session)
      }
    })

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 [AuthContext] Cleaning up auth subscription')
      }
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Dependencies handled via mounted flag

  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            registration_method: 'email'
          },
        },
      })

      if (error) {
        setError(error)
        return { error }
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error)
        return { error }
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const continueWithGoogle = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account', // Force account selection for better UX
          },
        },
      })

      if (error) {
        setError(error)
        return { error }
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const continueWithGitHub = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error)
        return { error }
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('🔄 [AuthContext] Starting sign out process')
    setLoading(true)
    setError(null)

    try {
      // Sign out from Supabase
      console.log('🔄 [AuthContext] Calling supabase.auth.signOut()')
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('❌ [AuthContext] Supabase sign out error:', error)
        setError(error)
        
        // Even if there's an error, clear local state
        setUser(null)
        setProfile(null)
        setSession(null)
        
        return { error }
      }

      console.log('✅ [AuthContext] Supabase sign out successful')
      
      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setSession(null)

      return { error: null }
    } catch (err) {
      console.error('❌ [AuthContext] Sign out exception:', err)
      const error = err as AuthError
      setError(error)
      
      // Clear local state even on error
      setUser(null)
      setProfile(null)
      setSession(null)
      
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setError(null)

    try {
      // Get the base URL - prefer environment variable, fallback to window.location
      const baseUrl = typeof window !== 'undefined' 
        ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      console.log('🔄 [AuthContext] Sending password reset email to:', email)
      console.log('🔄 [AuthContext] Redirect URL:', `${baseUrl}/auth/reset-password`)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset-password`,
        captchaToken: undefined // Explicitly set to avoid any captcha issues
      })

      if (error) {
        console.error('❌ [AuthContext] Password reset error:', error)
        setError(error)
        return { error }
      }

      console.log('✅ [AuthContext] Password reset email sent successfully')
      return { error: null }
    } catch (err) {
      console.error('❌ [AuthContext] Unexpected password reset error:', err)
      const error = err as AuthError
      setError(error)
      return { error }
    }
  }

  const updatePassword = async (password: string) => {
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setError(error)
        return { error }
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      const error = new Error('User not authenticated')
      setError(error as any)
      return { error: error as any }
    }

    setError(null)

    try {
      const { error } = await supabase
        .from('profiles_saas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        const authError = new Error(error.message) as any
        setError(authError)
        return { error: authError }
      }

      // Refresh the profile data
      const updatedProfile = await fetchProfile(user.id)
      if (updatedProfile) {
        setProfile(updatedProfile)
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    }
  }

  const refreshSession = async () => {
    setError(null)

    try {
      const { error } = await supabase.auth.refreshSession()

      if (error) {
        setError(error)
        return { error }
      }

      return { error: null }
    } catch (err) {
      const error = err as AuthError
      setError(error)
      return { error }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    signUp,
    signIn,
    continueWithGoogle,
    continueWithGitHub,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}