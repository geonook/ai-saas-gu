import { createClient } from '@/lib/supabase/client'
import { useMemo } from 'react'

export const useSupabase = () => {
  const supabase = useMemo(() => createClient(), [])
  
  return supabase
}