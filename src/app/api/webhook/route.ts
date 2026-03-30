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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[webhook received]', JSON.stringify(body).slice(0, 300))

    /* ── Confirmar que o pagamento foi aprovado ── */
    const isPaid =
      body.status === 'PAID' ||
      body.status === 'paid' ||
      body.status === 'APPROVED' ||
      body.event === 'PAYMENT_RECEIVED' ||
      body.event === 'charge.paid'

    if (!isPaid) {
      return NextResponse.json({ ok: true, msg: 'ignored' })
    }

    /* ── Extrair metadata ── */
    const meta = body.metadata ?? body.charge?.metadata ?? {}
    const { email, password, plano, name } = meta

    if (!email || !password || !plano) {
      console.error('[webhook] Missing metadata fields', meta)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    /* ── Verificar se o usuário já existe (idempotência) ── */
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const userAlreadyExists = existing?.users?.some(u => u.email === email)

    if (userAlreadyExists) {
      console.log('[webhook] User already created, skipping:', email)
      return NextResponse.json({ ok: true, msg: 'already_created' })
    }

    /* ── Criar usuário no Supabase ── */
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmar e-mail automaticamente
      user_metadata: {
        full_name: name ?? email,
        plano,
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + (PLAN_DAYS[plano] ?? 30) * 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    if (createErr) {
      console.error('[webhook] Error creating user:', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }

    console.log('[webhook] ✅ User created:', newUser?.user?.email)

    /* ── Criar categorias padrão para o novo usuário ── */
    const userId = newUser?.user?.id
    if (userId) {
      const defaultCategories = [
        // Despesas
        { name: '🍽️ Alimentação', type: 'expense', user_id: userId },
        { name: '🏠 Moradia', type: 'expense', user_id: userId },
        { name: '🚗 Transporte', type: 'expense', user_id: userId },
        { name: '💊 Saúde', type: 'expense', user_id: userId },
        { name: '📚 Educação', type: 'expense', user_id: userId },
        { name: '🎮 Lazer', type: 'expense', user_id: userId },
        { name: '👗 Vestuário', type: 'expense', user_id: userId },
        { name: '📱 Assinaturas', type: 'expense', user_id: userId },
        { name: '💡 Contas', type: 'expense', user_id: userId },
        { name: '🐾 Pet', type: 'expense', user_id: userId },
        // Receitas
        { name: '💼 Salário', type: 'income', user_id: userId },
        { name: '💰 Freelance', type: 'income', user_id: userId },
        { name: '📈 Rendimentos', type: 'income', user_id: userId },
        { name: '🎁 Outros', type: 'income', user_id: userId },
        // Investimentos
        { name: '📊 Ações', type: 'investment', user_id: userId },
        { name: '🏢 FIIs', type: 'investment', user_id: userId },
        { name: '🌎 ETFs', type: 'investment', user_id: userId },
        { name: '💵 Renda Fixa', type: 'investment', user_id: userId },
        { name: '₿ Cripto', type: 'investment', user_id: userId },
        { name: '🏦 Tesouro', type: 'investment', user_id: userId },
      ]
      const { error: catErr } = await supabaseAdmin.from('categories').insert(defaultCategories)
      if (catErr) console.error('[webhook] Failed to create categories:', catErr)
      else console.log('[webhook] ✅ Default categories created for:', email)
    }

    return NextResponse.json({ ok: true, msg: 'user_created', email })

  } catch (err: any) {
    console.error('[webhook]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
