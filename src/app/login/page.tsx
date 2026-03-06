'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, TrendingUp, Lock, Mail, Sparkles } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true); setError('')
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) { setError('E-mail ou senha inválidos.'); setLoading(false) }
        else { router.replace('/dashboard') }
    }

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,.25) 0%, var(--bg) 70%)',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Decorative blobs */}
            <div style={{
                position: 'absolute', top: '-80px', right: '-80px', width: 260, height: 260,
                borderRadius: '50%', background: 'rgba(124,58,237,.12)', filter: 'blur(60px)', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '-60px', left: '-60px', width: 200, height: 200,
                borderRadius: '50%', background: 'rgba(168,85,247,.1)', filter: 'blur(50px)', pointerEvents: 'none'
            }} />

            {/* Logo */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }} className="fade-up">
                <div style={{
                    width: 72, height: 72, borderRadius: 22, margin: '0 auto 1rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(124,58,237,.5)',
                }}>
                    <TrendingUp size={34} color="white" strokeWidth={2.5} />
                </div>
                <h1 style={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '-.04em' }}>
                    <span style={{ background: 'linear-gradient(90deg,#a78bfa,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Finanças
                    </span>
                    <span style={{ color: 'var(--text)' }}>Pro</span>
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
                    Controle financeiro inteligente
                </p>
            </div>

            {/* Card */}
            <div className="card fade-up" style={{
                width: '100%', maxWidth: 380,
                background: 'rgba(13,13,31,0.8)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(124,58,237,.25)',
                boxShadow: '0 24px 64px rgba(0,0,0,.5)',
                animationDelay: '.1s',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.5rem' }}>
                    <Sparkles size={16} color="var(--brand-light)" />
                    <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Entrar na sua conta</h2>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        <label style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>E-mail</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input id="login-email" type="email" required className="input" style={{ paddingLeft: '2.5rem' }}
                                placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    {/* Senha */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        <label style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input id="login-password" type={showPass ? 'text' : 'password'} required className="input"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                                placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPass(s => !s)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{ fontSize: '.85rem', color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 10, padding: '.7rem 1rem' }}>
                            {error}
                        </div>
                    )}

                    <button id="login-submit" type="submit" className="btn-primary" style={{ marginTop: '.25rem' }} disabled={loading}>
                        {loading ? <div className="spinner" /> : 'Entrar'}
                    </button>
                </form>
            </div>

            <p style={{ color: 'var(--muted2)', fontSize: '.72rem', marginTop: '2rem', textAlign: 'center' }}>
                Acesso restrito · Dados protegidos por RLS
            </p>
        </div>
    )
}
