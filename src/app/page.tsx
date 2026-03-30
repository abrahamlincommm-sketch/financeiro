'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, BarChart2, Brain, Shield, Smartphone, Zap,
  ChevronDown, Check, Star, ArrowRight, Sparkles,
  PieChart, LineChart, Wallet, Bot, Lock, Award
} from 'lucide-react'

/* ── animated counter ── */
function useCountUp(target: number, duration = 1200, startOnView = false) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(!startOnView)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!startOnView) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect() } }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [startOnView])

  useEffect(() => {
    if (!started) return
    let start = 0
    const steps = 50
    const inc = target / steps
    const id = setInterval(() => {
      start++
      setVal(Math.min(Math.round(inc * start), target))
      if (start >= steps) clearInterval(id)
    }, duration / steps)
    return () => clearInterval(id)
  }, [target, duration, started])

  return { val, ref }
}

const PLANS = [
  { id: 'mensal', label: 'Mensal', price: 29.90, per: 29.90, badge: null, period: 'mês', highlight: false },
  { id: 'trimestral', label: 'Trimestral', price: 74.70, per: 24.90, badge: '16% OFF', period: '3 meses', highlight: false },
  { id: 'semestral', label: 'Semestral', price: 131.40, per: 21.90, badge: '26% OFF', period: '6 meses', highlight: false },
  { id: 'anual', label: 'Anual', price: 178.80, per: 14.90, badge: '50% OFF 🔥', period: 'ano', highlight: true },
]

const FEATURES = [
  { icon: PieChart, color: '#f43f5e', bg: 'rgba(244,63,94,.15)', title: 'Controle Total de Gastos', desc: 'Categorize receitas e despesas com gráficos interativos. Veja exatamente para onde vai seu dinheiro.' },
  { icon: LineChart, color: '#10b981', bg: 'rgba(16,185,129,.15)', title: 'Painel de Investimentos', desc: 'Monitore sua carteira de ações, FIIs e ETFs. Preço médio calculado automaticamente.' },
  { icon: Bot, color: '#a78bfa', bg: 'rgba(167,139,250,.15)', title: 'IA Financeira 24h', desc: 'Converse com sua IA treinada em finanças. Receba dicas personalizadas baseadas no seu perfil.' },
  { icon: BarChart2, color: '#f59e0b', bg: 'rgba(245,158,11,.15)', title: 'Histórico de 6 meses', desc: 'Gráficos mensais de receita, despesa e investimentos. Evolução visual do seu patrimônio.' },
  { icon: Smartphone, color: '#06b6d4', bg: 'rgba(6,182,212,.15)', title: 'PWA Instalável', desc: 'Funciona como app nativo no seu celular ou computador. Sem precisar de app store.' },
  { icon: Shield, color: '#6366f1', bg: 'rgba(99,102,241,.15)', title: 'Dados 100% Seguros', desc: 'Seus dados ficam no seu banco, criptografados. Nunca compartilhados com terceiros.' },
]

const TESTIMONIALS = [
  { name: 'Ana Paula S.', role: 'Designer Freelancer', stars: 5, text: 'Finalmente entendi para onde ia meu dinheiro. Em 2 meses já economizei R$ 800. A IA dá dicas incríveis!' },
  { name: 'Rafael M.', role: 'Desenvolvedor', stars: 5, text: 'A carteira de investimentos é incrível. Preço médio automático, alocação visual — uso todo dia.' },
  { name: 'Carla F.', role: 'Empreendedora', stars: 5, text: 'Simples, bonito e completo. Nunca usei um app financeiro que me desse vontade de abrir todo dia.' },
]

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const { val: val1, ref: ref1 } = useCountUp(6800, 1500, true)
  const { val: val2, ref: ref2 } = useCountUp(98, 1200, true)
  const { val: val3, ref: ref3 } = useCountUp(4, 900, true)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(124,58,237,.4)}50%{box-shadow:0 0 60px rgba(124,58,237,.7)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}
        .fade-hero{animation:fadeUp .7s cubic-bezier(.4,0,.2,1) both}
        .plan-card{transition:all .3s cubic-bezier(.4,0,.2,1)}
        .plan-card:hover{transform:translateY(-6px)}
        .feature-card{transition:all .25s}
        .feature-card:hover{transform:translateY(-4px);border-color:rgba(124,58,237,.35)!important}
        .cta-btn{transition:all .25s cubic-bezier(.4,0,.2,1)}
        .cta-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(124,58,237,.6)!important}
        .cta-btn:active{transform:translateY(0)}
        .nav-link{transition:color .2s}
        .nav-link:hover{color:#a78bfa}
      `}</style>

      {/* ─── NAV ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(5,5,26,.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(124,58,237,.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#6d28d9,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,58,237,.5)',
          }}>
            <TrendingUp size={18} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-.03em' }}>
            <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finanças</span>
            <span style={{ color: 'var(--text)' }}>Pro</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#features" className="nav-link" style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)', textDecoration: 'none' }}>Recursos</a>
          <a href="#precos" className="nav-link" style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)', textDecoration: 'none' }}>Preços</a>
          <Link href="/login" style={{
            fontSize: '.82rem', fontWeight: 700, color: 'var(--text2)',
            background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)',
            borderRadius: 10, padding: '.4rem .85rem', textDecoration: 'none', transition: 'all .2s',
          }}>Entrar</Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ paddingTop: '8rem', paddingBottom: '5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -100, left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(124,58,237,.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 100, right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(168,85,247,.08)', filter: 'blur(70px)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div className="fade-hero" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 99, padding: '.35rem .9rem', marginBottom: '1.75rem' }}>
          <Sparkles size={13} color="#a78bfa" />
          <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#c4b5fd', letterSpacing: '.04em' }}>IA Financeira Integrada</span>
        </div>

        {/* Headline */}
        <h1 className="fade-hero" style={{ fontWeight: 900, fontSize: 'clamp(2.2rem,6vw,3.8rem)', letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: '1.25rem', animationDelay: '.08s', padding: '0 1rem' }}>
          <span style={{ background: 'linear-gradient(135deg,#c4b5fd 0%,#f9a8d4 50%,#fed7aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Controle total</span>
          <br />
          <span style={{ color: 'var(--text)' }}>das suas finanças.</span>
        </h1>

        {/* Subheadline */}
        <p className="fade-hero" style={{ fontSize: 'clamp(.95rem,2.5vw,1.15rem)', color: 'var(--text2)', maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.65, animationDelay: '.15s', padding: '0 1.5rem' }}>
          Despesas, investimentos e IA financeira em um único app.<br />
          Veja exatamente para onde vai seu dinheiro e faça seu patrimônio crescer.
        </p>

        {/* CTAs */}
        <div className="fade-hero" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', padding: '0 1rem', animationDelay: '.22s' }}>
          <Link href="#precos" className="cta-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            background: 'linear-gradient(135deg,#6d28d9,#a855f7)',
            color: 'white', fontWeight: 800, fontSize: '1rem',
            padding: '.9rem 2rem', borderRadius: 16, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(124,58,237,.5)',
          }}>
            Começar agora <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="cta-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
            color: 'var(--text)', fontWeight: 700, fontSize: '1rem',
            padding: '.9rem 1.75rem', borderRadius: 16, textDecoration: 'none',
          }}>
            Já tenho conta
          </Link>
        </div>

        {/* Trust badges */}
        <div className="fade-hero" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap', animationDelay: '.3s' }}>
          {[['🔒', 'Dados criptografados'], ['⚡', 'PIX instantâneo'], ['📱', 'App instalável'], ['🤖', 'IA financeira']].map(([icon, label]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--muted)', fontWeight: 600 }}>
              {icon} {label}
            </span>
          ))}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ padding: '2rem 1.5rem 4rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          {[
            { ref: ref1, val: val1, suf: '+', label: 'Transações registradas', color: '#10b981' },
            { ref: ref2, val: val2, suf: '%', label: 'Satisfação dos usuários', color: '#a78bfa' },
            { ref: ref3, val: val3, suf: 'x', label: 'Mais controle financeiro', color: '#f59e0b' },
          ].map(({ ref, val, suf, label, color }) => (
            <div key={label} ref={ref} style={{
              background: 'rgba(12,12,36,.7)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 20, padding: '1.5rem 1rem', textAlign: 'center',
              backdropFilter: 'blur(20px)',
            }}>
              <p style={{ fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.5rem)', letterSpacing: '-.04em', color, lineHeight: 1 }}>
                {val}{suf}
              </p>
              <p style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: '.5rem', fontWeight: 600, lineHeight: 1.4 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ padding: '2rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.75rem' }}>Tudo que você precisa</p>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.4rem)', letterSpacing: '-.03em' }}>
              Seu app financeiro <span style={{ background: 'linear-gradient(90deg,#a78bfa,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>completo</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem' }}>
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="feature-card" style={{
                background: 'rgba(12,12,36,.7)', border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 20, padding: '1.5rem', backdropFilter: 'blur(20px)',
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: `1px solid ${color}30` }}>
                  <Icon size={22} color={color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: '.5rem', letterSpacing: '-.01em' }}>{title}</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MOCKUP / DEMO VISUAL ─── */}
      <section style={{ padding: '2rem 1.5rem 5rem', overflow: 'hidden' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.75rem' }}>Veja como funciona</p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.2rem)', letterSpacing: '-.03em', marginBottom: '2.5rem' }}>
            Painel <span style={{ background: 'linear-gradient(90deg,#10b981,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>intuitivo</span> e poderoso
          </h2>

          {/* App mockup cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', animation: 'float 4s ease-in-out infinite' }}>
            {/* Balance card */}
            <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.2),rgba(99,102,241,.1))', border: '1px solid rgba(124,58,237,.3)', borderRadius: 20, padding: '1.25rem', textAlign: 'left', gridColumn: '1/-1' }}>
              <p style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>💰 Saldo livre</p>
              <p style={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '-.04em', background: 'linear-gradient(90deg,#10b981,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>R$ 2.847,50</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {[['Receita', 'R$ 6.500', '#10b981'], ['Despesa', 'R$ 3.200', '#f43f5e'], ['Invest.', 'R$ 452', '#f59e0b']].map(([l, v, c]) => (
                  <div key={l}>
                    <p style={{ fontSize: '.6rem', fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</p>
                    <p style={{ fontWeight: 800, fontSize: '.88rem', color: c }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 20, padding: '1.25rem', textAlign: 'left' }}>
              <p style={{ fontSize: '.65rem', fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.75rem' }}>Despesas</p>
              {[['🍽️ Alimentação', '38%'], ['🏠 Moradia', '29%'], ['🚗 Transporte', '15%']].map(([l, p]) => (
                <div key={l} style={{ marginBottom: '.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem' }}>
                    <span style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{l}</span>
                    <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#f43f5e' }}>{p}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: p, background: '#f43f5e', borderRadius: 99, transition: 'width .7s' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 20, padding: '1.25rem', textAlign: 'left' }}>
              <p style={{ fontSize: '.65rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.75rem' }}>Carteira</p>
              {[['MXRF11', '+12%', '#10b981'], ['PETR4', '+5%', '#10b981'], ['SELIC', '+8%', '#10b981']].map(([t, r, c]) => (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '.04em' }}>{t}</span>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: c, background: `${c}18`, padding: '.15rem .45rem', borderRadius: 6 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ padding: '2rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.75rem' }}>O que dizem</p>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.2rem)', letterSpacing: '-.03em' }}>Usuários que <span style={{ background: 'linear-gradient(90deg,#f9a8d4,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>amam</span> o app</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '1rem' }}>
            {TESTIMONIALS.map(({ name, role, stars, text }) => (
              <div key={name} style={{
                background: 'rgba(12,12,36,.7)', border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 20, padding: '1.5rem', backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(124,58,237,.08)', filter: 'blur(20px)' }} />
                <div style={{ display: 'flex', gap: '.2rem', marginBottom: '1rem' }}>
                  {Array.from({ length: stars }).map((_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ fontSize: '.85rem', color: 'var(--text2)', lineHeight: 1.65, marginBottom: '1.25rem' }}>"{text}"</p>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '.88rem' }}>{name}</p>
                  <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.1rem' }}>{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="precos" style={{ padding: '2rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.75rem' }}>Planos e preços</p>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.4rem)', letterSpacing: '-.03em', marginBottom: '.75rem' }}>
              Comece hoje, <span style={{ background: 'linear-gradient(90deg,#f59e0b,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>cancele quando quiser</span>
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '.9rem' }}>Pagamento via PIX. Acesso liberado instantaneamente.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
            {PLANS.map(({ id, label, price, per, badge, period, highlight }) => (
              <div key={id} className="plan-card" style={{
                background: highlight
                  ? 'linear-gradient(135deg,rgba(124,58,237,.25),rgba(168,85,247,.15))'
                  : 'rgba(12,12,36,.7)',
                border: highlight ? '1px solid rgba(168,85,247,.5)' : '1px solid rgba(255,255,255,.07)',
                borderRadius: 24, padding: '1.75rem 1.25rem',
                backdropFilter: 'blur(20px)', textAlign: 'center', position: 'relative',
                boxShadow: highlight ? '0 0 40px rgba(124,58,237,.2)' : 'none',
              }}>
                {highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 99, padding: '.3rem 1rem', fontSize: '.7rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(124,58,237,.4)' }}>
                    <Award size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: 'middle' }} />
                    Mais popular
                  </div>
                )}

                {badge && (
                  <div style={{ display: 'inline-block', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 99, padding: '.2rem .65rem', fontSize: '.65rem', fontWeight: 800, color: '#10b981', marginBottom: '.75rem' }}>
                    {badge}
                  </div>
                )}

                <p style={{ fontWeight: 800, fontSize: '.9rem', color: 'var(--text2)', marginBottom: '.5rem', ...(badge ? {} : { marginTop: '.5rem' }) }}>{label}</p>

                <div style={{ marginBottom: '.3rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '2.2rem', letterSpacing: '-.04em', color: highlight ? '#c4b5fd' : 'var(--text)' }}>
                    R$ {per.toFixed(2).replace('.', ',')}
                  </span>
                  <span style={{ fontSize: '.75rem', color: 'var(--muted)', fontWeight: 600 }}>/mês</span>
                </div>

                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                  R$ {price.toFixed(2).replace('.', ',')} por {period}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                  {['Dashboard completo', 'IA Financeira', 'Carteira de ações', 'Histórico ilimitado'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <Check size={13} color="#10b981" strokeWidth={3} />
                      <span style={{ fontSize: '.78rem', color: 'var(--text2)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href={`/checkout?plano=${id}`} className="cta-btn" style={{
                  display: 'block', textDecoration: 'none', textAlign: 'center',
                  background: highlight ? 'linear-gradient(135deg,#6d28d9,#a855f7)' : 'rgba(124,58,237,.2)',
                  border: highlight ? 'none' : '1px solid rgba(124,58,237,.35)',
                  color: 'white', fontWeight: 800, fontSize: '.88rem',
                  padding: '.8rem', borderRadius: 14,
                  boxShadow: highlight ? '0 6px 24px rgba(124,58,237,.45)' : 'none',
                }}>
                  {highlight ? '🚀 Assinar agora' : 'Escolher plano'}
                </Link>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.78rem', marginTop: '1.75rem' }}>
            🔒 Pagamento 100% seguro via PIX · Acesso liberado em segundos · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding: '2rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.5rem,3vw,2rem)', letterSpacing: '-.03em' }}>Perguntas frequentes</h2>
          </div>
          {[
            { q: 'Como funciona o pagamento?', a: 'Você paga via PIX. Após a confirmação do pagamento (instantânea), sua conta é criada automaticamente e você já pode acessar o app.' },
            { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Não há fidelidade. Você usa até o final do período pago e não é cobrado novamente.' },
            { q: 'Meus dados financeiros ficam seguros?', a: 'Seus dados ficam armazenados em banco de dados criptografado com acesso exclusivo da sua conta (Row Level Security). Não compartilhamos nada com terceiros.' },
            { q: 'O que é a IA Financeira?', a: 'Uma IA treinada em finanças pessoais que analisa seus dados e dá dicas personalizadas de economia, investimento e controle de gastos.' },
            { q: 'Funciona no celular?', a: 'Sim! É um PWA (Progressive Web App) — funciona como um app nativo no iPhone e Android sem precisar instalar pela App Store.' },
          ].map(({ q, a }, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}>
              <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.15rem 0', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text)' }}>{q}</span>
                <ChevronDown size={16} color="var(--muted)" style={{ flexShrink: 0, transition: 'transform .25s', transform: activeFaq === i ? 'rotate(180deg)' : 'none' }} />
              </button>
              {activeFaq === i && (
                <p style={{ fontSize: '.84rem', color: 'var(--text2)', lineHeight: 1.7, paddingBottom: '1.1rem', animation: 'fadeUp .2s ease' }}>{a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ padding: '2rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,.2),rgba(168,85,247,.1))',
            border: '1px solid rgba(124,58,237,.3)', borderRadius: 28, padding: '3rem 2rem',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'rgba(124,58,237,.2)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg,#6d28d9,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(124,58,237,.5)',
              animation: 'glow 3s ease-in-out infinite',
            }}>
              <Zap size={30} color="white" fill="white" />
            </div>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.5rem,3vw,2rem)', letterSpacing: '-.03em', marginBottom: '.75rem' }}>
              Pronto para ter <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>controle total</span>?
            </h2>
            <p style={{ color: 'var(--text2)', marginBottom: '2rem', fontSize: '.9rem', lineHeight: 1.6 }}>
              Comece hoje. Pagamento via PIX, acesso em segundos.
            </p>
            <Link href="/checkout?plano=anual" className="cta-btn" style={{
              display: 'inline-flex', alignItems: 'center', gap: '.5rem',
              background: 'linear-gradient(135deg,#6d28d9,#a855f7)',
              color: 'white', fontWeight: 800, fontSize: '1.05rem',
              padding: '1rem 2.5rem', borderRadius: 16, textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(124,58,237,.5)',
            }}>
              🚀 Assinar por R$ 14,90/mês
            </Link>
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '1rem' }}>Plano anual · R$ 178,80/ano · Cancele quando quiser</p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={13} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '.9rem' }}>
            <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finanças</span>
            <span style={{ color: 'var(--text)' }}>Pro</span>
          </span>
        </div>
        <p style={{ fontSize: '.72rem', color: 'var(--muted)' }}>© 2025 FinançasPro · Todos os direitos reservados</p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '.75rem' }}>
          <Link href="/login" style={{ fontSize: '.72rem', color: 'var(--muted)', textDecoration: 'none' }}>Entrar</Link>
          <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>·</span>
          <a href="#precos" style={{ fontSize: '.72rem', color: 'var(--muted)', textDecoration: 'none' }}>Preços</a>
        </div>
      </footer>
    </div>
  )
}
