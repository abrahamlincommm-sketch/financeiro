'use client'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ArrowLeft, Lock, Mail, User, Eye, EyeOff, Check, Copy, Clock, AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

const PLANS: Record<string, { label: string; price: number; per: number; period: string; highlight: boolean }> = {
  mensal:     { label: 'Mensal',     price: 29.90,  per: 29.90, period: 'mês',     highlight: false },
  trimestral: { label: 'Trimestral', price: 74.70,  per: 24.90, period: '3 meses', highlight: false },
  semestral:  { label: 'Semestral',  price: 131.40, per: 21.90, period: '6 meses', highlight: false },
  anual:      { label: 'Anual',      price: 178.80, per: 14.90, period: 'ano',      highlight: true  },
}

type Step = 'form' | 'pix' | 'checking' | 'done'

function CheckoutContent() {
  const params = useSearchParams()
  const router = useRouter()
  const planKey = params.get('plano') ?? 'mensal'
  const plan = PLANS[planKey] ?? PLANS.mensal

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pixCode, setPixCode] = useState('')
  const [pixQr, setPixQr] = useState('')
  const [chargeId, setChargeId] = useState('')
  const [copied, setCopied] = useState(false)
  const [timer, setTimer] = useState(300) // 5 min
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Timer countdown
  useEffect(() => {
    if (step !== 'pix' && step !== 'checking') return
    intervalRef.current = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [step])

  // Poll payment status
  useEffect(() => {
    if (step !== 'pix' && step !== 'checking') return
    pollRef.current = setInterval(async () => {
      if (!chargeId) return
      try {
        const res = await fetch(`/api/checkout/status?id=${chargeId}`)
        const data = await res.json()
        if (data.paid) {
          setStep('done')
          clearInterval(pollRef.current!)
        }
      } catch { /* ignore */ }
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, chargeId])

  const fmtTimer = () => `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Informe seu nome.'); return }
    if (!email.includes('@')) { setError('E-mail inválido.'); return }
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plano: planKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar pagamento.')
      setPixCode(data.pixCode)
      setPixQr(data.pixQr)
      setChargeId(data.chargeId)
      setStep('pix')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyPix() {
    navigator.clipboard.writeText(pixCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(124,58,237,.3)}50%{box-shadow:0 0 40px rgba(124,58,237,.6)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pix-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        .fade-up{animation:fadeUp .4s cubic-bezier(.4,0,.2,1) both}
      `}</style>

      {/* Background orbs */}
      <div style={{ position: 'fixed', top: -100, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(124,58,237,.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(168,85,247,.08)', filter: 'blur(70px)', pointerEvents: 'none' }} />

      {/* Back link */}
      <div style={{ width: '100%', maxWidth: 460, marginBottom: '1.5rem' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 }}>
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {/* Logo */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="glow-pulse" style={{ width: 58, height: 58, borderRadius: 18, margin: '0 auto .85rem', background: 'linear-gradient(135deg,#6d28d9,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,85,247,.4)', boxShadow: '0 0 0 8px rgba(124,58,237,.08)', animation: 'glow 3s ease-in-out infinite' }}>
          <TrendingUp size={26} color="white" strokeWidth={2.5} />
        </div>
        <h1 style={{ fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-.04em' }}>
          <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finanças</span>
          <span style={{ color: 'var(--text)' }}>Pro</span>
        </h1>
      </div>

      {/* ── STEP: FORM ── */}
      {step === 'form' && (
        <div className="fade-up card-gradient-border" style={{ width: '100%', maxWidth: 460, background: 'rgba(10,10,30,.9)', backdropFilter: 'blur(32px)', boxShadow: '0 32px 80px rgba(0,0,0,.5)', padding: '2rem', animationDelay: '.08s' }}>

          {/* Plan summary */}
          <div style={{
            background: plan.highlight ? 'rgba(124,58,237,.12)' : 'rgba(255,255,255,.04)',
            border: plan.highlight ? '1px solid rgba(124,58,237,.3)' : '1px solid rgba(255,255,255,.08)',
            borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1.75rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: '.68rem', fontWeight: 700, color: plan.highlight ? '#a78bfa' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.25rem' }}>Plano {plan.label}</p>
              <p style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-.03em', color: plan.highlight ? '#c4b5fd' : 'var(--text)' }}>
                R$ {plan.per.toFixed(2).replace('.', ',')}<span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--muted)' }}>/mês</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Total a pagar</p>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '-.02em' }}>
                R$ {plan.price.toFixed(2).replace('.', ',')}
              </p>
              <p style={{ fontSize: '.65rem', color: 'var(--muted)' }}>por {plan.period}</p>
            </div>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{ width: 4, height: 17, borderRadius: 2, background: 'linear-gradient(180deg,#7c3aed,#a855f7)', display: 'inline-block', flexShrink: 0 }} />
            Criar sua conta
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Nome</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input id="checkout-name" type="text" required className="input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input id="checkout-email" type="email" required className="input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input id="checkout-password" type={showPass ? 'text' : 'password'} required className="input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.83rem', color: 'var(--danger)', background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.25)', borderRadius: 12, padding: '.75rem 1rem' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button id="checkout-submit" type="submit" className="btn-primary" style={{ marginTop: '.5rem' }} disabled={loading}>
              {loading
                ? <div className="spinner" />
                : <><Lock size={16} /> Pagar R$ {plan.price.toFixed(2).replace('.', ',')} via PIX</>
              }
            </button>
          </form>

          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '1.25rem' }}>
            {[['🔒', 'Dados seguros'], ['⚡', 'Acesso imediato'], ['📱', 'App instalável']].map(([icon, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.65rem', color: 'var(--muted)', fontWeight: 600 }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: PIX ── */}
      {(step === 'pix' || step === 'checking') && (
        <div className="fade-up card-gradient-border" style={{ width: '100%', maxWidth: 460, background: 'rgba(10,10,30,.9)', backdropFilter: 'blur(32px)', boxShadow: '0 32px 80px rgba(0,0,0,.5)', padding: '2rem', animationDelay: '.05s' }}>

          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 99, padding: '.3rem .85rem', marginBottom: '1rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#10b981' }}>Aguardando pagamento</span>
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '.35rem' }}>Pague via PIX</h2>
            <p style={{ fontSize: '.82rem', color: 'var(--text2)' }}>
              Valor: <strong style={{ color: 'var(--text)' }}>R$ {plan.price.toFixed(2).replace('.', ',')}</strong> · {plan.label}
            </p>
          </div>

          {/* QR Code */}
          {pixQr && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'white', padding: '1rem', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.3)', animation: 'pix-pulse 3s ease-in-out infinite' }}>
                <img src={pixQr} alt="QR Code PIX" style={{ width: 160, height: 160, display: 'block' }} />
              </div>
            </div>
          )}

          {/* PIX code */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.5rem' }}>Código PIX (Copia e Cola)</p>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '.75rem 1rem', fontSize: '.72rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {pixCode || '⏳ Gerando código...'}
              </div>
              <button onClick={copyPix} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '.35rem',
                background: copied ? 'rgba(16,185,129,.2)' : 'rgba(124,58,237,.2)',
                border: copied ? '1px solid rgba(16,185,129,.4)' : '1px solid rgba(124,58,237,.35)',
                borderRadius: 12, padding: '.75rem 1rem', cursor: 'pointer',
                color: copied ? '#10b981' : '#a78bfa', fontSize: '.78rem', fontWeight: 700,
                transition: 'all .2s', fontFamily: 'inherit',
              }}>
                {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
          </div>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 12, padding: '.75rem 1rem', marginBottom: '1.25rem' }}>
            <Clock size={14} color="#f59e0b" />
            <span style={{ fontSize: '.78rem', color: 'var(--text2)' }}>Código expira em <strong style={{ color: '#f59e0b' }}>{fmtTimer()}</strong></span>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {[
              'Abra o app do seu banco',
              'Escaneie o QR Code ou use Copia e Cola',
              'Confirme o pagamento de R$ ' + plan.price.toFixed(2).replace('.', ','),
              'Sua conta será criada automaticamente ✓',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '.65rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(124,58,237,.2)', border: '1px solid rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '.05rem' }}>
                  <span style={{ fontSize: '.65rem', fontWeight: 800, color: '#a78bfa' }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '.7rem', color: 'var(--muted)', marginTop: '1.25rem' }}>
            Verificando pagamento automaticamente...
          </p>
        </div>
      )}

      {/* ── STEP: DONE ── */}
      {step === 'done' && (
        <div className="fade-up card-gradient-border" style={{ width: '100%', maxWidth: 460, background: 'rgba(10,10,30,.9)', backdropFilter: 'blur(32px)', boxShadow: '0 32px 80px rgba(0,0,0,.5)', padding: '2.5rem 2rem', textAlign: 'center', animationDelay: '.05s' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 40px rgba(16,185,129,.4)' }}>
            <Check size={36} color="white" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-.03em', marginBottom: '.5rem' }}>Pagamento confirmado! 🎉</h2>
          <p style={{ color: 'var(--text2)', fontSize: '.88rem', lineHeight: 1.65, marginBottom: '2rem' }}>
            Sua conta foi criada com sucesso. Faça login com o e-mail <strong style={{ color: 'var(--text)' }}>{email}</strong> e a senha que você cadastrou.
          </p>
          <Link href="/login" className="btn-primary" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center', background: 'linear-gradient(135deg,#6d28d9,#a855f7)' }}>
            → Acessar meu painel
          </Link>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-lg" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
