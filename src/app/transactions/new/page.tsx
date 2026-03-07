'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { ArrowLeft, DollarSign, Calendar, AlignLeft, Repeat2, Check, LineChart, ChevronDown, Search, Hash } from 'lucide-react'

type TxType = 'income' | 'expense' | 'investment'

const TYPE_CONFIG: Record<TxType, {
    label: string; symbol: string; color: string;
    dimColor: string; gradient: string; shadow: string;
}> = {
    income: { label: 'Receita', symbol: '↑', color: '#10b981', dimColor: 'rgba(16,185,129,.15)', gradient: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,.35)' },
    expense: { label: 'Despesa', symbol: '↓', color: '#f43f5e', dimColor: 'rgba(244,63,94,.15)', gradient: 'linear-gradient(135deg,#be123c,#f43f5e)', shadow: 'rgba(244,63,94,.35)' },
    investment: { label: 'Investimento', symbol: '◈', color: '#f59e0b', dimColor: 'rgba(245,158,11,.15)', gradient: 'linear-gradient(135deg,#b45309,#f59e0b)', shadow: 'rgba(245,158,11,.35)' },
}

const ASSET_TYPES = [
    { value: 'stock', label: '📊 Ação' },
    { value: 'fii', label: '🏢 FII' },
    { value: 'etf', label: '🌎 ETF' },
    { value: 'bdr', label: '🌐 BDR' },
]

/* ── Category Picker ── */
function CategoryPicker({ categories, value, onChange, color }: { categories: Category[]; value: string; onChange: (id: string) => void; color: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = categories.find(c => c.id === value)
    useEffect(() => {
        function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpen(o => !o)} style={{
                width: '100%', background: 'rgba(17,17,48,.8)', border: `1px solid ${open ? color : 'rgba(255,255,255,.06)'}`,
                borderRadius: 14, padding: '.85rem 1rem', color: selected ? 'var(--text)' : 'var(--muted)',
                fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all .2s', boxShadow: open ? `0 0 0 3px ${color}25` : 'none', textAlign: 'left',
            }}>
                <span>{selected ? selected.name : 'Selecione uma categoria'}</span>
                <ChevronDown size={16} color="var(--muted)" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
                    background: 'rgba(10,10,30,.98)', border: '1px solid rgba(124,58,237,.25)', borderRadius: 16,
                    boxShadow: '0 16px 48px rgba(0,0,0,.7)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
                    animation: 'fadeUp .15s ease',
                }}>
                    {categories.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
                            Nenhuma categoria.<br />Execute o SQL no Supabase.
                        </div>
                    ) : categories.map(cat => (
                        <button key={cat.id} type="button" onClick={() => { onChange(cat.id); setOpen(false) }} style={{
                            width: '100%', background: value === cat.id ? `${color}18` : 'none',
                            border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer',
                            padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.7rem', textAlign: 'left', transition: 'background .15s',
                        }}>
                            <span style={{ fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}>{cat.name.split(' ')[0]}</span>
                            <span style={{ fontWeight: value === cat.id ? 700 : 500, fontSize: '.88rem', color: value === cat.id ? color : 'var(--text)', flex: 1 }}>
                                {cat.name.replace(/^[\p{Emoji}\s]+/u, '').trim() || cat.name}
                            </span>
                            {value === cat.id && <Check size={14} color={color} style={{ flexShrink: 0 }} />}
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
    // Investment extras
    const [ticker, setTicker] = useState('')
    const [quantity, setQuantity] = useState('')
    const [assetType, setAssetType] = useState('stock')
    const [tickerName, setTickerName] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const amountRef = useRef<HTMLInputElement>(null)
    const cfg = TYPE_CONFIG[type]

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }
            const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).eq('type', type).order('name')
            setCategories(data ?? [])
            setCategoryId('')
        }
        load()
    }, [type, router])

    function switchType(t: TxType) {
        setType(t); setIsRecurring(false)
        setTimeout(() => amountRef.current?.focus(), 80)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setError('')
        const parsed = parseFloat(amount.replace(',', '.'))
        if (isNaN(parsed) || parsed <= 0) { setError('Insira um valor válido.'); return }
        if (!categoryId) { setError('Selecione uma categoria.'); return }
        if (type === 'investment' && ticker.trim()) {
            const qty = parseFloat(quantity.replace(',', '.'))
            if (isNaN(qty) || qty <= 0) { setError('Informe a quantidade de cotas.'); return }
        }
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        // 1) Save transaction
        const txPayload: Record<string, unknown> = {
            user_id: user.id, amount: parsed, date, category_id: categoryId,
            description: description || null,
            is_recurring: type === 'expense' ? isRecurring : false, type,
        }
        if (type === 'investment' && ticker.trim()) {
            txPayload.ticker = ticker.toUpperCase().trim()
            const qty = parseFloat(quantity.replace(',', '.'))
            if (!isNaN(qty) && qty > 0) txPayload.quantity = qty
        }
        const { error: dbErr } = await supabase.from('transactions').insert(txPayload)
        if (dbErr) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }

        // 2) If investment with ticker — upsert into portfolio
        if (type === 'investment' && ticker.trim()) {
            const t = ticker.toUpperCase().trim()
            const qty = parseFloat(quantity.replace(',', '.'))
            if (!isNaN(qty) && qty > 0) {
                // Get existing position to compute weighted avg price
                const { data: existing } = await supabase.from('portfolio')
                    .select('*').eq('user_id', user.id).eq('ticker', t).maybeSingle()
                if (existing) {
                    const newQty = existing.quantity + qty
                    const newAvg = ((existing.quantity * existing.avg_price) + (qty * parsed / qty)) / newQty
                    await supabase.from('portfolio').update({
                        quantity: newQty,
                        avg_price: (existing.avg_price * existing.quantity + parsed) / newQty,
                    }).eq('id', existing.id)
                } else {
                    await supabase.from('portfolio').insert({
                        user_id: user.id, ticker: t,
                        name: tickerName.trim() || null,
                        quantity: qty,
                        avg_price: parsed / qty,
                        asset_type: assetType,
                    })
                }
            }
        }

        router.replace('/dashboard')
    }

    return (
        <div style={{ minHeight: '100dvh', padding: '0 1.1rem 2rem', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Glow orb */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 320, height: 200, borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none',
                background: cfg.dimColor, transition: 'background .4s'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '3.5rem 0 1.25rem', position: 'relative' }}>
                <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '.5rem .65rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.02em' }}>Nova Transação</h1>
                    <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.1rem' }}>Receita, despesa ou investimento</p>
                </div>
            </div>

            {/* Type toggle */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem',
                background: 'rgba(11,11,32,.8)', border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 16, padding: '.3rem', marginBottom: '1.25rem',
            }}>
                {(Object.entries(TYPE_CONFIG) as [TxType, typeof TYPE_CONFIG[TxType]][]).map(([t, c]) => (
                    <button key={t} type="button" onClick={() => switchType(t)} style={{
                        padding: '.7rem .2rem', borderRadius: 12, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '.8rem', transition: 'all .25s',
                        background: type === t ? c.gradient : 'transparent',
                        color: type === t ? '#fff' : 'var(--muted)',
                        boxShadow: type === t ? `0 4px 16px ${c.shadow}` : 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', fontFamily: 'inherit',
                    }}>
                        <span style={{ fontSize: '1.15rem' }}>{c.symbol}</span>
                        <span>{c.label}</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                {/* Amount */}
                <div className="card" style={{ background: cfg.dimColor, border: `1px solid ${cfg.color}25`, padding: '1.1rem 1.2rem' }}>
                    <p style={{ fontSize: '.68rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Valor (R$)</p>
                    <div style={{ position: 'relative' }}>
                        <DollarSign size={20} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: cfg.color }} />
                        <input ref={amountRef} type="number" inputMode="decimal" min="0.01" step="0.01" required
                            value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"
                            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-.04em', color: cfg.color, paddingLeft: '2rem', WebkitAppearance: 'none' }} />
                    </div>
                </div>

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                    <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        <Calendar size={10} style={{ display: 'inline', marginRight: '.3rem' }} />Data
                    </label>
                    <input type="date" required className="input" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                {/* Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                    <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Categoria</label>
                    <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} color={cfg.color} />
                </div>

                {/* ── Investment extras ── */}
                {type === 'investment' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', padding: '1rem', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 16 }}>
                        <p style={{ fontSize: '.72rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.07em', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                            <LineChart size={12} /> Vincular à carteira (opcional)
                        </p>

                        {/* Asset type */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.35rem' }}>
                            {ASSET_TYPES.map(o => (
                                <button key={o.value} type="button" onClick={() => setAssetType(o.value)} style={{
                                    padding: '.45rem .2rem', borderRadius: 10, fontFamily: 'inherit',
                                    border: assetType === o.value ? '1px solid rgba(245,158,11,.6)' : '1px solid rgba(255,255,255,.07)',
                                    background: assetType === o.value ? 'rgba(245,158,11,.18)' : 'rgba(255,255,255,.03)',
                                    color: assetType === o.value ? '#f59e0b' : 'var(--text2)',
                                    fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
                                }}>{o.label}</button>
                            ))}
                        </div>

                        {/* Ticker + Quantity */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                                <label style={{ fontSize: '.67rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                    <Search size={9} style={{ display: 'inline', marginRight: '.25rem' }} />Ticker
                                </label>
                                <input className="input" style={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.08em', padding: '.7rem .9rem' }}
                                    placeholder="BBAS3" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                                <label style={{ fontSize: '.67rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                    <Hash size={9} style={{ display: 'inline', marginRight: '.25rem' }} />Cotas
                                </label>
                                <input className="input" type="number" inputMode="decimal" min="0.0001" step="any"
                                    style={{ padding: '.7rem .9rem' }}
                                    placeholder="100" value={quantity} onChange={e => setQuantity(e.target.value)} />
                            </div>
                        </div>

                        {/* Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                            <label style={{ fontSize: '.67rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Nome da empresa (opcional)</label>
                            <input className="input" style={{ padding: '.7rem .9rem' }}
                                placeholder="Ex: Banco do Brasil" value={tickerName} onChange={e => setTickerName(e.target.value)} />
                        </div>

                        <p style={{ fontSize: '.7rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                            Se informar o ticker, o aporte será automaticamente adicionado à sua <strong style={{ color: '#f59e0b' }}>💼 Carteira</strong> com o preço médio calculado.
                        </p>
                    </div>
                )}

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                    <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        <AlignLeft size={10} style={{ display: 'inline', marginRight: '.3rem' }} />
                        Descrição <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                    </label>
                    <textarea rows={2} className="input" style={{ resize: 'none' }}
                        placeholder="Ex: Conta de luz, aporte MXRF11…"
                        value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                {/* Recurring */}
                {type === 'expense' && (
                    <div className="card" onClick={() => setIsRecurring(v => !v)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer',
                        border: isRecurring ? '1px solid rgba(124,58,237,.4)' : '1px solid rgba(255,255,255,.06)',
                        background: isRecurring ? 'rgba(124,58,237,.08)' : 'rgba(12,12,36,.7)', transition: 'all .2s',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isRecurring ? 'rgba(124,58,237,.2)' : 'rgba(255,255,255,.05)', transition: 'background .2s' }}>
                                <Repeat2 size={16} color={isRecurring ? '#a78bfa' : 'var(--muted)'} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '.88rem' }}>Despesa Fixa / Recorrente</p>
                                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.1rem' }}>Aluguel, assinatura, parcela…</p>
                            </div>
                        </div>
                        <div style={{ width: 44, height: 24, borderRadius: 99, padding: '2px', display: 'flex', alignItems: 'center', background: isRecurring ? '#7c3aed' : 'rgba(255,255,255,.08)', flexShrink: 0, transition: 'background .2s' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.4)', transform: isRecurring ? 'translateX(20px)' : 'none', transition: 'transform .2s' }} />
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{ fontSize: '.85rem', color: 'var(--danger)', background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 12, padding: '.75rem 1rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}
                    style={{ background: cfg.gradient, boxShadow: `0 4px 20px ${cfg.shadow}`, marginTop: '.5rem' }}>
                    {loading ? <div className="spinner" /> : <><Check size={18} /> Salvar {cfg.label}</>}
                </button>
            </form>
        </div>
    )
}
