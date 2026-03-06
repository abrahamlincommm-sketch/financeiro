'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { ArrowLeft, DollarSign, Calendar, Tag, AlignLeft, Repeat2, Check, TrendingUp, TrendingDown, LineChart } from 'lucide-react'

type TxType = 'income' | 'expense' | 'investment'

const TYPE_CONFIG: Record<TxType, {
    label: string; emoji: string; color: string;
    dimColor: string; gradient: string; shadow: string;
}> = {
    income: { label: 'Receita', emoji: '↑', color: '#10b981', dimColor: 'rgba(16,185,129,.15)', gradient: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,.35)' },
    expense: { label: 'Despesa', emoji: '↓', color: '#f43f5e', dimColor: 'rgba(244,63,94,.15)', gradient: 'linear-gradient(135deg,#be123c,#f43f5e)', shadow: 'rgba(244,63,94,.35)' },
    investment: { label: 'Investimento', emoji: '◈', color: '#f59e0b', dimColor: 'rgba(245,158,11,.15)', gradient: 'linear-gradient(135deg,#b45309,#f59e0b)', shadow: 'rgba(245,158,11,.35)' },
}

export default function NewTransactionPage() {
    const router = useRouter()
    const [type, setType] = useState<TxType>('expense')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [categoryId, setCategoryId] = useState('')
    const [description, setDescription] = useState('')
    const [isRecurring, setIsRecurring] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const cfg = TYPE_CONFIG[type]

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }
            const { data } = await supabase
                .from('categories').select('*')
                .eq('user_id', user.id).eq('type', type).order('name')
            setCategories(data ?? [])
            setCategoryId('')
        }
        load()
    }, [type, router])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setError('')
        const parsed = parseFloat(amount.replace(',', '.'))
        if (isNaN(parsed) || parsed <= 0) { setError('Insira um valor válido.'); return }
        if (!categoryId) { setError('Selecione uma categoria.'); return }
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        const { error: dbErr } = await supabase.from('transactions').insert({
            user_id: user.id, amount: parsed, date, category_id: categoryId,
            description: description || null,
            is_recurring: type === 'expense' ? isRecurring : false, type,
        })
        if (dbErr) { setError('Erro ao salvar. Tente novamente.'); setLoading(false) }
        else { router.replace('/dashboard') }
    }

    return (
        <div style={{ minHeight: '100dvh', padding: '0 1.1rem 2rem', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            {/* Glow */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 300, height: 220, borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none',
                background: cfg.dimColor, transition: 'background .4s',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '3.5rem 0 1.5rem', position: 'relative' }}>
                <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '.55rem .65rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.02em' }}>Nova Transação</h1>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.1rem' }}>Receita, despesa ou investimento</p>
                </div>
            </div>

            {/* Type Toggle — 3 options */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem', marginBottom: '1.25rem',
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, padding: '.3rem',
            }}>
                {(Object.entries(TYPE_CONFIG) as [TxType, typeof TYPE_CONFIG[TxType]][]).map(([t, c]) => (
                    <button key={t} id={`toggle-${t}`} onClick={() => setType(t)}
                        style={{
                            padding: '.7rem .2rem', borderRadius: 12, border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '.8rem', transition: 'all .2s',
                            background: type === t ? c.gradient : 'transparent',
                            color: type === t ? '#fff' : 'var(--muted)',
                            boxShadow: type === t ? `0 4px 16px ${c.shadow}` : 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem',
                        }}>
                        <span style={{ fontSize: '1.1rem' }}>{c.emoji}</span>
                        <span>{c.label}</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>

                {/* Amount hero */}
                <div className="card" style={{ background: cfg.dimColor, border: `1px solid ${cfg.color}30` }}>
                    <p className="stat-label" style={{ marginBottom: '.5rem' }}>Valor (R$)</p>
                    <div style={{ position: 'relative' }}>
                        <DollarSign size={18} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: cfg.color }} />
                        <input id="tx-amount" type="number" inputMode="decimal" min="0.01" step="0.01" required
                            value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"
                            style={{
                                width: '100%', background: 'none', border: 'none', outline: 'none',
                                fontSize: '2rem', fontWeight: 800, letterSpacing: '-.03em',
                                color: cfg.color, paddingLeft: '1.75rem', WebkitAppearance: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Date + Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            <Calendar size={11} style={{ display: 'inline', marginRight: '.3rem' }} />Data
                        </label>
                        <input id="tx-date" type="date" required className="input" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            <Tag size={11} style={{ display: 'inline', marginRight: '.3rem' }} />Categoria
                        </label>
                        <select id="tx-category" required className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                            <option value="" disabled>Selecione</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        <AlignLeft size={11} style={{ display: 'inline', marginRight: '.3rem' }} />Descrição <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                    </label>
                    <textarea id="tx-description" rows={2} className="input" style={{ resize: 'none' }}
                        placeholder="Ex: Aporte mensal, conta de luz..."
                        value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                {/* Recurring — only for expense */}
                {type === 'expense' && (
                    <div className="card" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer',
                        border: isRecurring ? '1px solid rgba(124,58,237,.4)' : '1px solid var(--border)',
                        background: isRecurring ? 'rgba(124,58,237,.08)' : 'var(--surface)',
                        transition: 'all .2s',
                    }} onClick={() => setIsRecurring(v => !v)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s',
                                background: isRecurring ? 'rgba(124,58,237,.2)' : 'var(--surface2)'
                            }}>
                                <Repeat2 size={16} color={isRecurring ? 'var(--brand-light)' : 'var(--muted)'} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '.88rem' }}>Despesa Fixa / Recorrente</p>
                                <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.1rem' }}>Aluguel, assinatura, parcela…</p>
                            </div>
                        </div>
                        <div style={{
                            width: 44, height: 24, borderRadius: 99, flexShrink: 0, padding: '2px', transition: 'background .2s', display: 'flex', alignItems: 'center',
                            background: isRecurring ? 'var(--brand)' : 'var(--surface2)', border: '1px solid var(--border)'
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.4)', transition: 'transform .2s',
                                transform: isRecurring ? 'translateX(20px)' : 'translateX(0)'
                            }} />
                        </div>
                        <input id="tx-recurring" type="checkbox" checked={isRecurring} onChange={() => { }} style={{ display: 'none' }} />
                    </div>
                )}

                {/* Investment info tip */}
                {type === 'investment' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1rem',
                        background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 14
                    }}>
                        <LineChart size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: '.8rem', color: '#fbbf24', lineHeight: 1.4 }}>
                            Investimentos são rastreados separadamente e não entram no cálculo de despesas do mês.
                        </p>
                    </div>
                )}

                {error && (
                    <div style={{ fontSize: '.85rem', color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 12, padding: '.75rem 1rem' }}>
                        {error}
                    </div>
                )}

                <button id="tx-submit" type="submit" className="btn-primary" disabled={loading}
                    style={{ background: cfg.gradient, boxShadow: `0 4px 20px ${cfg.shadow}`, marginTop: '.5rem' }}>
                    {loading ? <div className="spinner" /> : (
                        <><Check size={18} /> Salvar {cfg.label}</>
                    )}
                </button>
            </form>
        </div>
    )
}
