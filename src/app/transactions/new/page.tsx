'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { ArrowLeft, DollarSign, Calendar, AlignLeft, Repeat2, Check, LineChart, ChevronDown } from 'lucide-react'

type TxType = 'income' | 'expense' | 'investment'

const TYPE_CONFIG: Record<TxType, {
    label: string; symbol: string; color: string;
    dimColor: string; gradient: string; shadow: string;
}> = {
    income: { label: 'Receita', symbol: '↑', color: '#10b981', dimColor: 'rgba(16,185,129,.15)', gradient: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,.35)' },
    expense: { label: 'Despesa', symbol: '↓', color: '#f43f5e', dimColor: 'rgba(244,63,94,.15)', gradient: 'linear-gradient(135deg,#be123c,#f43f5e)', shadow: 'rgba(244,63,94,.35)' },
    investment: { label: 'Investimento', symbol: '◈', color: '#f59e0b', dimColor: 'rgba(245,158,11,.15)', gradient: 'linear-gradient(135deg,#b45309,#f59e0b)', shadow: 'rgba(245,158,11,.35)' },
}

/* ── Category Picker ── */
function CategoryPicker({
    categories, value, onChange, color,
}: { categories: Category[]; value: string; onChange: (id: string) => void; color: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = categories.find(c => c.id === value)

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button" id="cat-picker-btn" onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', background: 'var(--surface2)', border: `1px solid ${open ? color : 'var(--border)'}`,
                    borderRadius: 12, padding: '.8rem 1rem', color: selected ? 'var(--text)' : 'var(--muted)',
                    fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'border-color .2s', boxShadow: open ? `0 0 0 3px ${color}30` : 'none',
                    textAlign: 'left',
                }}>
                <span>{selected ? selected.name : 'Selecione uma categoria'}</span>
                <ChevronDown size={16} style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--muted)', flexShrink: 0, marginLeft: '.5rem' }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
                    boxShadow: '0 16px 48px rgba(0,0,0,.6)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
                    animation: 'fadeUp .15s ease',
                }}>
                    {categories.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
                            Nenhuma categoria encontrada.<br />Execute o SQL no Supabase.
                        </div>
                    ) : categories.map(cat => (
                        <button key={cat.id} type="button"
                            onClick={() => { onChange(cat.id); setOpen(false) }}
                            style={{
                                width: '100%', background: value === cat.id ? `${color}18` : 'none',
                                border: 'none', borderBottom: '1px solid rgba(30,30,63,.5)', cursor: 'pointer',
                                padding: '.8rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem',
                                transition: 'background .15s', textAlign: 'left',
                            }}>
                            <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>
                                {cat.name.split(' ')[0]}
                            </span>
                            <span style={{ fontWeight: value === cat.id ? 700 : 500, fontSize: '.9rem', color: value === cat.id ? color : 'var(--text)' }}>
                                {/* strip the emoji from the beginning */}
                                {cat.name.replace(/^[\p{Emoji}\s]+/u, '').trim() || cat.name}
                            </span>
                            {value === cat.id && (
                                <Check size={14} color={color} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ══════════════════════════════════════════════════════ */
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
    const amountRef = useRef<HTMLInputElement>(null)

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

    function switchType(t: TxType) {
        setType(t)
        setIsRecurring(false)
        setTimeout(() => amountRef.current?.focus(), 100)
    }

    return (
        <div style={{ minHeight: '100dvh', padding: '0 1.1rem 2rem', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            {/* Glow */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 320, height: 220, borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none',
                background: cfg.dimColor, transition: 'background .4s'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '3.5rem 0 1.25rem', position: 'relative' }}>
                <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '.55rem .65rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.02em' }}>Nova Transação</h1>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.1rem' }}>Receita, despesa ou investimento</p>
                </div>
            </div>

            {/* Type Toggle */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem', marginBottom: '1.25rem',
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, padding: '.3rem',
            }}>
                {(Object.entries(TYPE_CONFIG) as [TxType, typeof TYPE_CONFIG[TxType]][]).map(([t, c]) => (
                    <button key={t} id={`toggle-${t}`} type="button" onClick={() => switchType(t)}
                        style={{
                            padding: '.7rem .2rem', borderRadius: 12, border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '.8rem', transition: 'all .25s',
                            background: type === t ? c.gradient : 'transparent',
                            color: type === t ? '#fff' : 'var(--muted)',
                            boxShadow: type === t ? `0 4px 16px ${c.shadow}` : 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem',
                        }}>
                        <span style={{ fontSize: '1.15rem' }}>{c.symbol}</span>
                        <span>{c.label}</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>

                {/* Amount hero */}
                <div className="card" style={{ background: cfg.dimColor, border: `1px solid ${cfg.color}30`, padding: '1.1rem 1.2rem' }}>
                    <p className="stat-label" style={{ marginBottom: '.5rem', color: cfg.color }}>Valor (R$)</p>
                    <div style={{ position: 'relative' }}>
                        <DollarSign size={20} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: cfg.color }} />
                        <input ref={amountRef} id="tx-amount" type="number" inputMode="decimal" min="0.01" step="0.01" required
                            value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"
                            style={{
                                width: '100%', background: 'none', border: 'none', outline: 'none',
                                fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-.04em',
                                color: cfg.color, paddingLeft: '2rem', WebkitAppearance: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: '.3rem' }} />Data
                    </label>
                    <input id="tx-date" type="date" required className="input" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                {/* Category Picker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        Categoria
                    </label>
                    <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} color={cfg.color} />
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        <AlignLeft size={11} style={{ display: 'inline', marginRight: '.3rem' }} />
                        Descrição <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                    </label>
                    <textarea id="tx-description" rows={2} className="input" style={{ resize: 'none' }}
                        placeholder="Ex: Conta de luz de março, aporte na XPML11…"
                        value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                {/* Recurring — expense only */}
                {type === 'expense' && (
                    <div className="card" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer',
                        border: isRecurring ? '1px solid rgba(124,58,237,.4)' : '1px solid var(--border)',
                        background: isRecurring ? 'rgba(124,58,237,.08)' : 'var(--surface)',
                        transition: 'all .2s',
                    }} onClick={() => setIsRecurring(v => !v)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                background: isRecurring ? 'rgba(124,58,237,.2)' : 'var(--surface2)', transition: 'background .2s'
                            }}>
                                <Repeat2 size={16} color={isRecurring ? 'var(--brand-light)' : 'var(--muted)'} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '.88rem' }}>Despesa Fixa / Recorrente</p>
                                <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.1rem' }}>Aluguel, assinatura, parcela…</p>
                            </div>
                        </div>
                        <div style={{
                            width: 44, height: 24, borderRadius: 99, flexShrink: 0, padding: '2px', display: 'flex', alignItems: 'center',
                            background: isRecurring ? 'var(--brand)' : 'var(--surface2)', border: '1px solid var(--border)', transition: 'background .2s'
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
                                transform: isRecurring ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .2s'
                            }} />
                        </div>
                    </div>
                )}

                {/* Investment tip */}
                {type === 'investment' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1rem',
                        background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 14
                    }}>
                        <LineChart size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: '.8rem', color: '#fbbf24', lineHeight: 1.45 }}>
                            Investimentos são rastreados separadamente — não entram no total de despesas.
                        </p>
                    </div>
                )}

                {error && (
                    <div style={{
                        fontSize: '.85rem', color: 'var(--danger)', background: 'var(--danger-dim)',
                        border: '1px solid rgba(244,63,94,.3)', borderRadius: 12, padding: '.75rem 1rem'
                    }}>
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
