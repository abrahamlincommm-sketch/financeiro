import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — avoids build-time crash when env vars are not yet set
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  // createClient with empty strings won't crash at module load time;
  // auth calls will fail gracefully and redirect to /login
  _supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder')
  return _supabase
}

// Convenience alias — use this in client components
export const supabase = {
  get auth() { return getSupabase().auth },
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args),
}

// Types
export type Category = {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense' | 'investment'
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  amount: number
  date: string
  category_id: string
  description?: string
  is_recurring: boolean
  type: 'income' | 'expense' | 'investment'
  ticker?: string
  quantity?: number
  created_at: string
  categories?: Category
}

export type Portfolio = {
  id: string
  user_id: string
  ticker: string
  name?: string
  quantity: number
  avg_price: number
  asset_type: string
  created_at: string
}

