'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { ArrowLeft, DollarSign, Calendar, Tag, AlignLeft, Repeat2, Check } from 'lucide-react'

type TxType = 'income' | 'expense'

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

    const isIncome = type === 'income'

    return (
        <div style={{
            minHeight: '100dvh', padding: '0 1.1rem 2rem',
            background: 'var(--bg)',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Glow */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 300, height: 200, borderRadius: '50%',
                background: isIncome ? 'rgba(16,185,129,.12)' : 'rgba(244,63,94,.1)',
                filter: 'blur(60px)', pointerEvents: 'none', transition: 'background .4s',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '3.5rem 0 1.5rem', position: 'relative' }}>
                <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '.55rem .65rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.02em' }}>Nova Transação</h1>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.1rem' }}>Registre receita ou despesa</p>
                </div>
            </div>

            {/* Type Toggle */}
            <div className="tab-group" style={{ marginBottom: '1.25rem' }}>
                {(['expense', 'income'] as TxType[]).map(t => (
                    <button key={t} id={`toggle-${t}`} className="tab-btn" onClick={() => setType(t)}
                        style={{
                            background: type === t
                                ? t === 'income' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#be123c,#f43f5e)'
                                : 'transparent',
                            color: type === t ? '#fff' : 'var(--muted)',
                            boxShadow: type === t ? (t === 'income' ? '0 4px 16px rgba(16,185,129,.3)' : '0 4px 16px rgba(244,63,94,.3)') : 'none',
                        }}>
                        {t === 'income' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>

                {/* Amount — big */}
                <div className="card" style={{
                    background: isIncome ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.1)',
                    border: isIncome ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(244,63,94,.25)',
                }}>
                    <p className="stat-label" style={{ marginBottom: '.5rem' }}>Valor (R$)</p>
                    <div style={{ position: 'relative' }}>
                        <DollarSign size={18} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: isIncome ? 'var(--success)' : 'var(--danger)' }} />
                        <input id="tx-amount" type="number" inputMode="decimal" min="0.01" step="0.01" required
                            value={amount} onChange={e => setAmount(e.target.value)}
                            placeholder="0,00"
                            style={{
                                width: '100%', background: 'none', border: 'none', outline: 'none',
                                fontSize: '2rem', fontWeight: 800, letterSpacing: '-.03em',
                                color: isIncome ? 'var(--success)' : 'var(--danger)',
                                paddingLeft: '1.75rem',
                                WebkitAppearance: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Date + Category side by side */}
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
                        <AlignLeft size={11} style={{ display: 'inline', marginRight: '.3rem' }} />Descrição <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                    </label>
                    <textarea id="tx-description" rows={2} className="input" style={{ resize: 'none' }}
                        placeholder="Ex: conta de luz de março..."
                        value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                {/* Recurring toggle - expense only */}
                {type === 'expense' && (
                    <div className="card" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer',
                        border: isRecurring ? '1px solid rgba(124,58,237,.4)' : '1px solid var(--border)',
                        background: isRecurring ? 'rgba(124,58,237,.08)' : 'var(--surface)',
                        transition: 'all .2s',
                    }} onClick={() => setIsRecurring(v => !v)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 11,
                                background: isRecurring ? 'rgba(124,58,237,.2)' : 'var(--surface2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                transition: 'background .2s',
                            }}>
                                <Repeat2 size={16} color={isRecurring ? 'var(--brand-light)' : 'var(--muted)'} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '.88rem' }}>Despesa Fixa / Recorrente</p>
                                <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.1rem' }}>Aluguel, assinatura, parcela…</p>
                            </div>
                        </div>
                        {/* Custom toggle */}
                        <div style={{
                            width: 44, height: 24, borderRadius: 99, flexShrink: 0,
                            background: isRecurring ? 'var(--brand)' : 'var(--surface2)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', padding: '2px',
                            transition: 'background .2s',
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%', background: 'white',
                                boxShadow: '0 1px 4px rgba(0,0,0,.4)',
                                transform: isRecurring ? 'translateX(20px)' : 'translateX(0)',
                                transition: 'transform .2s',
                            }} />
                        </div>
                        <input id="tx-recurring" type="checkbox" checked={isRecurring} onChange={() => { }} style={{ display: 'none' }} />
                    </div>
                )}

                {error && (
                    <div style={{ fontSize: '.85rem', color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 12, padding: '.75rem 1rem' }}>
                        {error}
                    </div>
                )}

                <button id="tx-submit" type="submit" className="btn-primary" disabled={loading}
                    style={{
                        background: isIncome ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                        boxShadow: isIncome ? '0 4px 20px rgba(16,185,129,.35)' : '0 4px 20px rgba(124,58,237,.4)', marginTop: '.5rem'
                    }}>
                    {loading ? <div className="spinner" /> : (
                        <><Check size={18} /> Salvar {isIncome ? 'Receita' : 'Despesa'}</>
                    )}
                </button>
            </form>
        </div>
    )
}
