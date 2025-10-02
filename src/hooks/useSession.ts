import { useAuth } from '@/contexts/AuthContext'

export const useSession = () => {
  const { session, loading, refreshSession } = useAuth()
  
  return {
    session,
    loading,
    refreshSession,
    isAuthenticated: !!session,
  }
}