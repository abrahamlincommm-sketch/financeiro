'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Send, Bot, RefreshCw, Sparkles, TrendingUp, PiggyBank, BarChart3 } from 'lucide-react'

type Message = { role: 'user' | 'model'; text: string; ts: number }

const QUICK_PROMPTS = [
    { icon: <TrendingUp size={13} />, label: 'O que comprar agora?', text: 'Com base na minha carteira e saldo disponível, o que você recomenda comprar agora?' },
    { icon: <PiggyBank size={13} />, label: 'Como economizar?', text: 'Analisando meus gastos, onde posso economizar dinheiro?' },
    { icon: <BarChart3 size={13} />, label: 'Diversificar?', text: 'Como devo diversificar minha carteira de investimentos?' },
    { icon: <Sparkles size={13} />, label: 'Minha saúde financeira', text: 'Qual é a minha saúde financeira hoje e o que devo melhorar?' },
]

export default function AIPage() {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [ctxLoading, setCtxLoading] = useState(true)
    const [context, setContext] = useState<any>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    /* ── Load financial context ── */
    const loadContext = useCallback(async () => {
        setCtxLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const start = `${year}-${String(month).padStart(2, '0')}-01`
        const end = new Date(year, month, 0).toISOString().split('T')[0]

        const [{ data: txs }, { data: portfolio }] = await Promise.all([
            supabase.from('transactions').select('*,categories(name,type)').eq('user_id', user.id).gte('date', start).lte('date', end),
            supabase.from('portfolio').select('*').eq('user_id', user.id),
        ])

        const income = (txs ?? []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
        const expense = (txs ?? []).filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0)
        const invested = (txs ?? []).filter((t: any) => t.type === 'investment').reduce((a: number, t: any) => a + Number(t.amount), 0)
        const balance = income - expense - invested

        // Top expense categories
        const catMap: Record<string, number> = {}
            ; (txs ?? []).filter((t: any) => t.type === 'expense').forEach((t: any) => {
                const n = t.categories?.name ?? 'Outros'
                catMap[n] = (catMap[n] ?? 0) + Number(t.amount)
            })
        const topCategories = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .map(([name, amount]) => ({ name, amount }))

        const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

        setContext({
            income, expense, invested, balance,
            savingsRate: income > 0 ? Math.max(0, (balance / income) * 100) : 0,
            expenseRate: income > 0 ? (expense / income) * 100 : 0,
            month: monthName,
            topCategories,
            portfolio: (portfolio ?? []).map((p: any) => ({
                ticker: p.ticker, quantity: p.quantity,
                avgPrice: p.avg_price, assetType: p.asset_type,
            })),
        })
        setCtxLoading(false)
    }, [router])

    useEffect(() => { loadContext() }, [loadContext])
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

    /* ── Send message ── */
    async function sendMessage(text?: string) {
        const msg = (text ?? input).trim()
        if (!msg || loading || !context) return
        setInput('')
        const userMsg: Message = { role: 'user', text: msg, ts: Date.now() }
        setMessages(prev => [...prev, userMsg])
        setLoading(true)

        // Build history for API (exclude last user message we just added)
        const history = messages.map(m => ({ role: m.role, text: m.text }))

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, context, history }),
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setMessages(prev => [...prev, { role: 'model', text: data.reply, ts: Date.now() }])
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'model', text: `❌ Erro ao conectar com a IA: ${e.message}. Tente novamente.`, ts: Date.now() }])
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    /* ── Render markdown-ish text ── */
    function renderText(text: string) {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <p key={i} style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '.3rem', marginTop: '.6rem' }}>{line.replace('## ', '')}</p>
            if (line.startsWith('# ')) return <p key={i} style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: '.4rem' }}>{line.replace('# ', '')}</p>
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ fontWeight: 700 }}>{line.replace(/\*\*/g, '')}</p>
            if (line.trim() === '') return <br key={i} />
            // Bold inline
            const parts = line.split(/(\*\*[^*]+\*\*)/g)
            return (
                <p key={i} style={{ marginBottom: '.2rem', lineHeight: 1.55 }}>
                    {parts.map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.replace(/\*\*/g, '')}</strong>
                            : part
                    )}
                </p>
            )
        })
    }

    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            <style>{`
                @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
                @keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
                @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                .dot-typing span{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--primary);margin:0 2px;animation:blink 1.4s infinite}
                .dot-typing span:nth-child(2){animation-delay:.2s}
                .dot-typing span:nth-child(3){animation-delay:.4s}
            `}</style>

            {/* Glow orbs */}
            <div style={{ position: 'absolute', top: -80, left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(124,58,237,.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 120, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(16,185,129,.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />

            {/* Header */}
            <header style={{
                padding: '3rem 1.2rem 1rem', background: 'rgba(5,5,26,.92)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(124,58,237,.15)', flexShrink: 0, zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <Link href="/dashboard" className="btn-ghost" style={{ padding: '.45rem .65rem' }}>
                        <ArrowLeft size={16} />
                    </Link>
                    {/* Bot avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(124,58,237,.5)', animation: 'glow 3s ease-in-out infinite' }}>
                        <Bot size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-.03em' }}>
                            <span style={{ background: 'linear-gradient(90deg,#a78bfa,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FinanceIA</span>
                        </h1>
                        <p style={{ fontSize: '.65rem', color: ctxLoading ? '#f59e0b' : '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ctxLoading ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
                            {ctxLoading ? 'Carregando seus dados…' : 'Dados carregados · Pronta para ajudar'}
                        </p>
                    </div>
                    <button onClick={() => { setMessages([]); loadContext() }} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '.45rem', cursor: 'pointer', color: 'var(--text2)', display: 'flex' }}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                {/* Welcome */}
                {messages.length === 0 && !ctxLoading && (
                    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg,rgba(124,58,237,.3),rgba(168,85,247,.2))', border: '1px solid rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 32px rgba(124,58,237,.25)' }}>
                            <Bot size={34} color="#a78bfa" strokeWidth={1.5} />
                        </div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '.4rem' }}>Olá! Sou a FinanceIA 👋</h2>
                        <p style={{ fontSize: '.84rem', color: 'var(--text2)', maxWidth: 280, lineHeight: 1.55, marginBottom: '1.25rem' }}>
                            Analisei seus dados financeiros de {context?.month}. Posso recomendar investimentos, ajudar a economizar e analisar sua carteira.
                        </p>
                        {/* Context summary */}
                        {context && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', width: '100%', maxWidth: 320, marginBottom: '1.25rem' }}>
                                {[
                                    { label: 'Receita', val: `R$${context.income.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, color: '#10b981' },
                                    { label: 'Saldo livre', val: `R$${context.balance.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, color: context.balance >= 0 ? '#10b981' : '#f43f5e' },
                                    { label: 'Despesas', val: `${context.expenseRate.toFixed(0)}% renda`, color: '#f43f5e' },
                                    { label: 'Carteira', val: `${context.portfolio.length} ativo${context.portfolio.length !== 1 ? 's' : ''}`, color: '#f59e0b' },
                                ].map(({ label, val, color }) => (
                                    <div key={label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '.6rem .75rem', textAlign: 'left' }}>
                                        <p style={{ fontSize: '.62rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.2rem' }}>{label}</p>
                                        <p style={{ fontWeight: 800, fontSize: '.88rem', color }}>{val}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Quick prompts */}
                        <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '.6rem' }}>Perguntas rápidas:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem', width: '100%' }}>
                            {QUICK_PROMPTS.map((q, i) => (
                                <button key={i} onClick={() => sendMessage(q.text)} style={{
                                    background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)',
                                    borderRadius: 12, padding: '.65rem 1rem', cursor: 'pointer', color: 'var(--text)',
                                    fontSize: '.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.5rem',
                                    textAlign: 'left', transition: 'all .15s', fontFamily: 'inherit',
                                }}>
                                    <span style={{ color: '#a78bfa', flexShrink: 0 }}>{q.icon}</span>
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((m, i) => (
                    <div key={i} className="fade-up" style={{
                        display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-end', gap: '.5rem',
                        animationDelay: `${i * .03}s`,
                    }}>
                        {m.role === 'model' && (
                            <div style={{ width: 28, height: 28, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bot size={14} color="white" />
                            </div>
                        )}
                        <div style={{
                            maxWidth: '82%',
                            background: m.role === 'user'
                                ? 'linear-gradient(135deg,rgba(124,58,237,.7),rgba(168,85,247,.6))'
                                : 'rgba(20,20,50,.9)',
                            border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,.07)',
                            borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                            padding: '.75rem 1rem',
                            backdropFilter: 'blur(8px)',
                            boxShadow: m.role === 'user' ? '0 4px 16px rgba(124,58,237,.3)' : 'none',
                        }}>
                            <div style={{ fontSize: '.875rem', color: 'var(--text)', lineHeight: 1.5 }}>
                                {renderText(m.text)}
                            </div>
                            <p style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.3)', marginTop: '.4rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                                {new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                    <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bot size={14} color="white" />
                        </div>
                        <div style={{ background: 'rgba(20,20,50,.9)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '4px 18px 18px 18px', padding: '.75rem 1.1rem' }}>
                            <div className="dot-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{
                padding: '.75rem 1rem 2rem', background: 'rgba(5,5,26,.95)',
                backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(124,58,237,.15)',
                flexShrink: 0, zIndex: 10,
            }}>
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        rows={1}
                        placeholder={ctxLoading ? 'Carregando dados…' : 'Pergunte sobre investimentos, economia…'}
                        disabled={ctxLoading || loading}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        style={{
                            flex: 1, background: 'rgba(17,17,48,.8)', border: '1px solid rgba(124,58,237,.25)',
                            borderRadius: 16, padding: '.85rem 1rem', color: 'var(--text)', outline: 'none',
                            fontSize: '.9rem', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                            maxHeight: 120, transition: 'border-color .2s',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,.6)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,.25)'}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading || ctxLoading}
                        style={{
                            width: 44, height: 44, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: !input.trim() || loading || ctxLoading ? 'rgba(124,58,237,.2)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                            border: 'none', transition: 'all .2s',
                            boxShadow: !input.trim() ? 'none' : '0 4px 16px rgba(124,58,237,.4)',
                        }}>
                        <Send size={17} color={!input.trim() ? 'rgba(255,255,255,.3)' : 'white'} />
                    </button>
                </div>
                <p style={{ fontSize: '.62rem', color: 'var(--muted)', textAlign: 'center', marginTop: '.5rem' }}>
                    ⚠️ FinanceIA usa IA. Não é recomendação financeira profissional regulamentada pela CVM.
                </p>
            </div>
        </div>
    )
}
