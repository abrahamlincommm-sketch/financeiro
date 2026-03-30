'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, TrendingUp, Lock, Mail, CheckCircle } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resetSent, setResetSent] = useState(false)
    const [showReset, setShowReset] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetLoading, setResetLoading] = useState(false)

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault(); setLoading(true); setError('')
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) { setError('E-mail ou senha inválidos.'); setLoading(false) }
        else { router.replace('/dashboard') }
    }

    async function handleReset(e: React.FormEvent) {
        e.preventDefault(); setResetLoading(true)
        const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: `${window.location.origin}/dashboard`,
        })
        setResetLoading(false)
        if (!err) setResetSent(true)
    }

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
            {/* Extra glow orbs */}
            <div style={{
                position: 'fixed', top: -120, left: -80, width: 400, height: 400, borderRadius: '50%',
                background: 'rgba(124,58,237,.15)', filter: 'blur(80px)', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'fixed', bottom: -80, right: -60, width: 300, height: 300, borderRadius: '50%',
                background: 'rgba(168,85,247,.1)', filter: 'blur(70px)', pointerEvents: 'none'
            }} />

            {/* Logo */}
            <div className="fade-up" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div className="glow-pulse" style={{
                    width: 76, height: 76, borderRadius: 24, margin: '0 auto 1.25rem',
                    background: 'linear-gradient(135deg,#6d28d9,#a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(168,85,247,.4)',
                    boxShadow: '0 0 0 8px rgba(124,58,237,.1)',
                }}>
                    <TrendingUp size={36} color="white" strokeWidth={2.5} />
                </div>
                <h1 style={{ fontWeight: 900, fontSize: '2.1rem', letterSpacing: '-.05em', lineHeight: 1 }}>
                    <span style={{
                        background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4,#fed7aa)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Finanças</span>
                    <span style={{ color: 'var(--text)' }}>Pro</span>
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: '.88rem', marginTop: '.4rem', letterSpacing: '.01em' }}>
                    Seu dinheiro, sob controle total
                </p>
            </div>

            {/* Card */}
            <div className="fade-up card-gradient-border" style={{
                width: '100%', maxWidth: 390,
                background: 'rgba(10,10,30,.85)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                boxShadow: '0 32px 80px rgba(0,0,0,.6)',
                animationDelay: '.1s',
                padding: '2rem',
            }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg,#7c3aed,#a855f7)', display: 'inline-block', flexShrink: 0 }} />
                    Acesse sua conta
                </h2>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>E-mail</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input id="login-email" type="email" required className="input" style={{ paddingLeft: '2.5rem' }}
                                placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    {/* Senha */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input id="login-password" type={showPass ? 'text' : 'password'} required className="input"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                                placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPass(s => !s)} style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                                display: 'flex', padding: '.2rem',
                            }}>
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            fontSize: '.83rem', color: 'var(--danger)', background: 'rgba(244,63,94,.1)',
                            border: '1px solid rgba(244,63,94,.25)', borderRadius: 12, padding: '.75rem 1rem',
                            display: 'flex', alignItems: 'center', gap: '.5rem'
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <button id="login-submit" type="submit" className="btn-primary" style={{ marginTop: '.25rem' }} disabled={loading}>
                        {loading ? <div className="spinner" /> : '→ Entrar'}
                    </button>

                    <button type="button" onClick={() => setShowReset(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '.78rem', fontWeight: 600, marginTop: '.25rem', fontFamily: 'inherit', textAlign: 'center', width: '100%' }}>
                        Esqueci minha senha
                    </button>
                </form>
            </div>

            {/* Reset Password Modal */}
            {showReset && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowReset(false) }}>
                    <div className="card-gradient-border fade-up" style={{ width: '100%', maxWidth: 380, background: 'rgba(10,10,30,.95)', padding: '2rem', backdropFilter: 'blur(32px)' }}>
                        {resetSent ? (
                            <div style={{ textAlign: 'center' }}>
                                <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontWeight: 800, marginBottom: '.5rem' }}>E-mail enviado!</h3>
                                <p style={{ color: 'var(--text2)', fontSize: '.85rem', lineHeight: 1.6 }}>Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
                                <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => { setShowReset(false); setResetSent(false) }}>Fechar</button>
                            </div>
                        ) : (
                            <form onSubmit={handleReset}>
                                <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '1.25rem' }}>Redefinir senha</h3>
                                <p style={{ color: 'var(--text2)', fontSize: '.83rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
                                <input type="email" required className="input" placeholder="seu@email.com" style={{ marginBottom: '1rem' }} value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
                                <button type="submit" className="btn-primary" disabled={resetLoading}>
                                    {resetLoading ? <div className="spinner" /> : 'Enviar link'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="fade-up" style={{ marginTop: '1.75rem', textAlign: 'center', animationDelay: '.2s' }}>
                <p style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: '1rem' }}>
                    Não tem conta? <Link href="/checkout?plano=anual" style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>Assinar agora →</Link>
                </p>
                {[
                    ['🔒', 'Dados criptografados'],
                    ['⚡', 'PIX instantâneo'],
                    ['📱', 'PWA instalável'],
                ].map(([icon, label]) => (
                    <span key={label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.3rem',
                        fontSize: '.68rem', color: 'var(--muted)', margin: '0 .75rem', letterSpacing: '.03em', fontWeight: 600
                    }}>
                        {icon} {label}
                    </span>
                ))}
            </div>
        </div>
    )
}
