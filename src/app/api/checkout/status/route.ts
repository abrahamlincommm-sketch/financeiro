import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ─── Supabase Admin (service role key) ─── */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PLAN_DAYS: Record<string, number> = {
  mensal: 30, trimestral: 90, semestral: 180, anual: 365,
}

/* ─── Status polling endpoint ─── */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const res = await fetch(`https://api.evopayments.com.br/charge/${id}`, {
      headers: { Authorization: `Bearer ${process.env.EVOPAY_API_KEY}` },
      cache: 'no-store',
    })
    const data = await res.json()
    const paid = data.status === 'PAID' || data.status === 'paid' || data.status === 'APPROVED'
    return NextResponse.json({ paid, status: data.status })
  } catch {
    return NextResponse.json({ paid: false, error: 'Gateway error' }, { status: 502 })
  }
}
