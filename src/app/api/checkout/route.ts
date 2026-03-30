import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ─── Supabase Admin (service role key) para criar usuários ─── */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/* ─── Planos e períodos de expiração ─── */
const PLAN_CONFIG: Record<string, { label: string; price: number; days: number }> = {
  mensal:     { label: 'Mensal',     price: 29.90,  days: 30  },
  trimestral: { label: 'Trimestral', price: 74.70,  days: 90  },
  semestral:  { label: 'Semestral',  price: 131.40, days: 180 },
  anual:      { label: 'Anual',      price: 178.80, days: 365 },
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, plano } = await req.json()

    /* ── Validações básicas ── */
    if (!name || !email || !password || !plano) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }
    const plan = PLAN_CONFIG[plano]
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    /* ── 1. Verificar se e-mail já existe ── */
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const alreadyExists = existing?.users?.some(u => u.email === email)
    if (alreadyExists) {
      return NextResponse.json({ error: 'Este e-mail já possui uma conta. Faça login.' }, { status: 400 })
    }

    /* ── 2. Gerar cobrança PIX via gateway ── */
    const pixRes = await fetch('https://api.evopayments.com.br/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EVOPAY_API_KEY}`,
      },
      body: JSON.stringify({
        amount: plan.price,
        paymentMethod: 'PIX',
        customer: { name, email },
        description: `FinançasPro — Plano ${plan.label}`,
        externalReference: `${plano}|${email}|${password.length}`,
        expiresIn: 300, // 5 minutos
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        // Metadata para o webhook criar a conta
        metadata: { email, password, plano, name },
      }),
    })

    if (!pixRes.ok) {
      const errText = await pixRes.text()
      console.error('Gateway error:', errText)
      return NextResponse.json({ error: 'Erro ao gerar cobrança PIX. Tente novamente.' }, { status: 502 })
    }

    const pixData = await pixRes.json()

    return NextResponse.json({
      chargeId: pixData.id,
      pixCode: pixData.pixCode ?? pixData.pixCopiaECola ?? pixData.qrCode,
      pixQr: pixData.pixQrImage ?? pixData.qrCodeUrl ?? null,
    })

  } catch (err: any) {
    console.error('[checkout POST]', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
