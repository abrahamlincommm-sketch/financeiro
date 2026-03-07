'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, AlertCircle, X, Check, Search } from 'lucide-react'

const BRAPI_TOKEN = process.env.NEXT_PUBLIC_BRAPI_TOKEN ?? ''
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (v: number) => {
    const a = Math.abs(v)
    if (a >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
    if (a >= 1000) return `R$${(v / 1000).toFixed(1)}k`
    return `R$${v.toFixed(0)}`
}
const pctColor = (v: number) => v >= 0 ? '#10b981' : '#f43f5e'

type Position = {
    id: string; ticker: string; name: string | null
    quantity: number; avg_price: number; asset_type: string
}
type Quote = {
    symbol: string
    regularMarketPrice: number
    regularMarketChange: number
    regularMarketChangePercent: number
    regularMarketDayHigh: number
    regularMarketDayLow: number
    longName?: string; shortName?: string
    logourl?: string
}

const TYPE_OPTS = [
    { value: 'stock', label: '📊 Ação' },
    { value: 'fii', label: '🏢 FII' },
    { value: 'etf', label: '🌎 ETF' },
    { value: 'bdr', label: '🌐 BDR' },
]

/* ── tiny skeleton ── */
function Sk({ h = 16, w = '100%', r = 10 }: { h?: number; w?: string; r?: number }) {
    return <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,rgba(255,255,255,.04)25%,rgba(255,255,255,.08)50%,rgba(255,255,255,.04)75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
}

/* ══════════ */
export default function PortfolioPage() {
    const router = useRouter()
    const [positions, setPositions] = useState<Position[]>([])
    const [quotes, setQuotes] = useState<Record<string, Quote>>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [apiError, setApiError] = useState('')
    // form
    const [ticker, setTicker] = useState('')
    const [quantity, setQuantity] = useState('')
    const [avgPrice, setAvgPrice] = useState('')
    const [assetType, setAssetType] = useState('stock')
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const [formErr, setFormErr] = useState('')

    /* ── load positions from Supabase ── */
    const loadPositions = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        const { data } = await supabase.from('portfolio').select('*').eq('user_id', user.id).order('created_at')
        setPositions(data as Position[] ?? [])
        return data as Position[] ?? []
    }, [router])

    /* ── fetch quotes from brapi ── */
    const fetchQuotes = useCallback(async (pos: Position[]) => {
        if (pos.length === 0) return
        setRefreshing(true); setApiError('')
        const tickers = [...new Set(pos.map(p => p.ticker.toUpperCase()))].join(',')
        try {
            const res = await fetch(`https://brapi.dev/api/quote/${tickers}?token=${BRAPI_TOKEN}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            const map: Record<string, Quote> = {}
                ; (json.results ?? []).forEach((q: Quote) => { map[q.symbol] = q })
            setQuotes(map)
        } catch (e: any) {
            setApiError('Não foi possível carregar cotações. Verifique o token brapi.')
        } finally { setRefreshing(false) }
    }, [])

    /* ── init ── */
    useEffect(() => {
        async function init() {
            setLoading(true)
            const pos = await loadPositions()
            if (pos && pos.length > 0) await fetchQuotes(pos)
            setLoading(false)
        }
        init()
    }, [loadPositions, fetchQuotes])

    /* ── add position ── */
    async function handleAdd(e: React.FormEvent) {
        e.preventDefault(); setFormErr(''); setSaving(true)
        const qty = parseFloat(quantity.replace(',', '.'))
        const price = parseFloat(avgPrice.replace(',', '.'))
        if (!ticker.trim()) { setFormErr('Informe o ticker.'); setSaving(false); return }
        if (isNaN(qty) || qty <= 0) { setFormErr('Quantidade inválida.'); setSaving(false); return }
        if (isNaN(price) || price <= 0) { setFormErr('Preço médio inválido.'); setSaving(false); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error } = await supabase.from('portfolio').insert({
            user_id: user.id, ticker: ticker.toUpperCase().trim(),
            name: name.trim() || null, quantity: qty, avg_price: price, asset_type: assetType,
        })
        if (error) { setFormErr('Erro ao salvar.'); setSaving(false); return }
        setShowForm(false); setTicker(''); setName(''); setQuantity(''); setAvgPrice(''); setAssetType('stock')
        const pos = await loadPositions()
        if (pos && pos.length > 0) await fetchQuotes(pos)
        setSaving(false)
    }

    /* ── delete ── */
    async function handleDelete(id: string) {
        setDeleting(id)
        await supabase.from('portfolio').delete().eq('id', id)
        const pos = await loadPositions()
        if (pos && pos.length > 0) await fetchQuotes(pos)
        setDeleting(null)
    }

    /* ── compute totals ── */
    const rows = positions.map(p => {
        const q = quotes[p.ticker.toUpperCase()]
        const invested = p.quantity * p.avg_price
        const current = q ? p.quantity * q.regularMarketPrice : null
        const plValue = current !== null ? current - invested : null
        const plPct = current !== null ? ((current - invested) / invested) * 100 : null
        return { ...p, q, invested, current, plValue, plPct }
    })
    const totalInvested = rows.reduce((a, r) => a + r.invested, 0)
    const totalCurrent = rows.reduce((a, r) => a + (r.current ?? r.invested), 0)
    const totalPL = totalCurrent - totalInvested
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '5rem' }}>
            <style>{`
                @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
                @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(124,58,237,.3)}50%{box-shadow:0 0 36px rgba(124,58,237,.55)}}
            `}</style>

            {/* Header */}
            <header style={{
                padding: '3.25rem 1.2rem 1rem', background: 'rgba(5,5,26,.9)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(124,58,237,.15)', position: 'sticky', top: 0, zIndex: 30,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
                    <Link href="/dashboard" className="btn-ghost" style={{ padding: '.45rem .65rem' }}>
                        <ArrowLeft size={16} />
                    </Link>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-.04em' }}>
                            <span style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Minha Carteira</span>
                        </h1>
                        <p style={{ fontSize: '.65rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginTop: '.1rem' }}>Dados da B3 em tempo real</p>
                    </div>
                    <button onClick={() => { if (positions.length > 0) fetchQuotes(positions) }}
                        style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 10, padding: '.45rem', cursor: 'pointer', color: 'var(--text2)', display: 'flex', transition: 'all .2s' }}>
                        <RefreshCw size={15} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
                    </button>
                </div>

                {/* Hero totals */}
                {!loading && positions.length > 0 && (
                    <div style={{
                        background: 'rgba(12,12,36,.8)', border: '1px solid rgba(124,58,237,.2)',
                        borderRadius: 16, padding: '.85rem 1rem',
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem',
                    }}>
                        {[
                            { label: 'Investido', val: totalInvested, color: 'var(--text2)', short: true },
                            { label: 'Atual', val: totalCurrent, color: totalPL >= 0 ? '#10b981' : '#f43f5e', short: true },
                            { label: 'Retorno', val: totalPLPct, color: pctColor(totalPLPct), isPct: true },
                        ].map(({ label, val, color, short, isPct }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '.6rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.25rem' }}>{label}</p>
                                <p style={{ fontWeight: 900, fontSize: '.9rem', color, letterSpacing: '-.02em' }}>
                                    {isPct ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : short ? fmtShort(val) : fmt(val)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            <main style={{ padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                {apiError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.25)', borderRadius: 12, padding: '.75rem 1rem', fontSize: '.82rem', color: '#f43f5e' }}>
                        <AlertCircle size={15} style={{ flexShrink: 0 }} /> {apiError}
                    </div>
                )}

                {/* P&L summary card */}
                {!loading && rows.some(r => r.current !== null) && (
                    <div className="card-gradient-border fade-up" style={{
                        background: totalPL >= 0 ? 'rgba(16,185,129,.09)' : 'rgba(244,63,94,.09)',
                        padding: '1.2rem', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: -50, right: -40, width: 160, height: 160, borderRadius: '50%', background: totalPL >= 0 ? 'rgba(16,185,129,.15)' : 'rgba(244,63,94,.12)', filter: 'blur(50px)', pointerEvents: 'none' }} />
                        <p className="stat-label" style={{ marginBottom: '.3rem' }}>{totalPL >= 0 ? '🤑 Lucro total' : '📉 Prejuízo total'}</p>
                        <p style={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '-.04em', color: pctColor(totalPL) }}>
                            {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
                        </p>
                        <p style={{ fontSize: '.75rem', color: 'var(--text2)', marginTop: '.35rem' }}>
                            {totalPLPct >= 0 ? '▲' : '▼'} {Math.abs(totalPLPct).toFixed(2)}% desde o preço médio de compra
                        </p>
                    </div>
                )}

                {/* Positions list */}
                {loading ? (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                        {[0, 1, 2].map(i => <Sk key={i} h={72} />)}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="card fade-up" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{ width: 68, height: 68, borderRadius: 22, background: 'rgba(124,58,237,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid rgba(124,58,237,.2)' }}>
                            <TrendingUp size={30} color="var(--muted)" strokeWidth={1.5} />
                        </div>
                        <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '.4rem' }}>Carteira vazia</p>
                        <p style={{ color: 'var(--text2)', fontSize: '.84rem', marginBottom: '1.5rem' }}>Adicione sua primeira posição para acompanhar em tempo real</p>
                        <button className="btn-primary" style={{ maxWidth: 220, margin: '0 auto' }} onClick={() => setShowForm(true)}>
                            <Plus size={16} /> Adicionar posição
                        </button>
                    </div>
                ) : (
                    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.1rem .65rem', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p className="section-title" style={{ margin: 0 }}>Posições ({rows.length})</p>
                            {refreshing && <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Atualizando…</span>}
                        </div>
                        {rows.map((r, i) => {
                            const hasPrice = r.current !== null
                            const dayChg = r.q?.regularMarketChangePercent ?? 0
                            return (
                                <div key={r.id} className="fade-up" style={{
                                    animationDelay: `${i * .04}s`,
                                    padding: '1rem 1.1rem',
                                    borderBottom: '1px solid rgba(255,255,255,.04)',
                                    display: 'flex', flexDirection: 'column', gap: '.5rem',
                                }}>
                                    {/* Row 1: ticker + current price */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                        {/* Logo or emoji badge */}
                                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                            {r.q?.logourl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={r.q.logourl} alt={r.ticker} style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} />
                                            ) : (
                                                <span style={{ fontWeight: 900, fontSize: '.85rem', color: '#a78bfa' }}>{r.ticker.slice(0, 3)}</span>
                                            )}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '.95rem' }}>{r.ticker}</span>
                                                <span style={{ fontSize: '.65rem', fontWeight: 700, background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', padding: '.1rem .4rem', borderRadius: 4, color: '#a78bfa', textTransform: 'uppercase' }}>{r.asset_type}</span>
                                            </div>
                                            <p style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: '.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.q?.longName ?? r.q?.shortName ?? r.name ?? '—'}
                                            </p>
                                        </div>

                                        {/* Current price + day change */}
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            {hasPrice ? (
                                                <>
                                                    <p style={{ fontWeight: 800, fontSize: '.95rem' }}>{fmt(r.q!.regularMarketPrice)}</p>
                                                    <p style={{ fontSize: '.7rem', fontWeight: 700, color: pctColor(dayChg), marginTop: '.15rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '.2rem' }}>
                                                        {dayChg >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                        {dayChg >= 0 ? '+' : ''}{dayChg.toFixed(2)}% hoje
                                                    </p>
                                                </>
                                            ) : (
                                                <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>—</p>
                                            )}
                                        </div>

                                        {/* Delete */}
                                        <button onClick={() => handleDelete(r.id)} style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 10, padding: '.4rem', cursor: 'pointer', color: '#f43f5e', display: 'flex', flexShrink: 0, transition: 'all .2s' }}>
                                            {deleting === r.id ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Trash2 size={14} />}
                                        </button>
                                    </div>

                                    {/* Row 2: position details */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '.4rem', background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: '.7rem' }}>
                                        {[
                                            { label: 'Cotas', val: r.quantity % 1 === 0 ? r.quantity.toFixed(0) : r.quantity.toFixed(2) },
                                            { label: 'P. Médio', val: fmt(r.avg_price) },
                                            { label: 'Investido', val: fmtShort(r.invested) },
                                            {
                                                label: 'Resultado',
                                                val: hasPrice ? (r.plValue! >= 0 ? '+' : '') + fmtShort(r.plValue!) : '—',
                                                color: hasPrice ? pctColor(r.plValue!) : 'var(--muted)',
                                            },
                                        ].map(({ label, val, color }) => (
                                            <div key={label} style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '.6rem', color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{label}</p>
                                                <p style={{ fontSize: '.8rem', fontWeight: 800, color: color ?? 'var(--text)' }}>{val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* P&L % bar */}
                                    {hasPrice && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                                                <span style={{ fontSize: '.65rem', color: 'var(--text2)' }}>Variação desde compra</span>
                                                <span style={{ fontSize: '.68rem', fontWeight: 800, color: pctColor(r.plPct!) }}>
                                                    {r.plPct! >= 0 ? '+' : ''}{r.plPct!.toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="progress-track" style={{ height: 4 }}>
                                                <div className="progress-fill" style={{
                                                    width: `${Math.min(100, Math.abs(r.plPct!))}%`,
                                                    background: pctColor(r.plPct!),
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* FAB */}
            <button className="fab" onClick={() => setShowForm(true)} id="fab-add" aria-label="Adicionar posição">
                <Plus size={26} color="white" />
            </button>

            {/* ── Add Position Modal ── */}
            {showForm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    animation: 'fadeUp .2s ease',
                }}>
                    <div style={{
                        width: '100%', maxWidth: 480,
                        background: 'rgba(10,10,30,.98)',
                        border: '1px solid rgba(124,58,237,.3)',
                        borderRadius: '24px 24px 0 0',
                        padding: '1.5rem 1.3rem 2.5rem',
                        boxShadow: '0 -16px 64px rgba(0,0,0,.7)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.05rem', flex: 1 }}>Nova Posição</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '.4rem', cursor: 'pointer', color: 'var(--text2)', display: 'flex' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                            {/* Asset type */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.35rem' }}>
                                {TYPE_OPTS.map(o => (
                                    <button key={o.value} type="button" onClick={() => setAssetType(o.value)} style={{
                                        padding: '.5rem .25rem', borderRadius: 10, border: assetType === o.value ? '1px solid rgba(124,58,237,.6)' : '1px solid rgba(255,255,255,.07)',
                                        background: assetType === o.value ? 'rgba(124,58,237,.2)' : 'rgba(255,255,255,.03)',
                                        color: assetType === o.value ? '#a78bfa' : 'var(--text2)',
                                        fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                        transition: 'all .15s', textAlign: 'center',
                                    }}>{o.label}</button>
                                ))}
                            </div>

                            {/* Ticker */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                                <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                                    <Search size={10} style={{ display: 'inline', marginRight: '.3rem' }} />Ticker
                                </label>
                                <input className="input" style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '.08em' }}
                                    placeholder="Ex: BBAS3, MXRF11, PETR4…"
                                    value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} />
                            </div>

                            {/* Name (optional) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                                <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Nome (opcional)</label>
                                <input className="input" placeholder="Ex: Banco do Brasil"
                                    value={name} onChange={e => setName(e.target.value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                                    <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Qtd. cotas</label>
                                    <input className="input" type="number" inputMode="decimal" min="0.0001" step="any" placeholder="100"
                                        value={quantity} onChange={e => setQuantity(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                                    <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Preço médio</label>
                                    <input className="input" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="20,00"
                                        value={avgPrice} onChange={e => setAvgPrice(e.target.value)} />
                                </div>
                            </div>

                            {formErr && (
                                <p style={{ fontSize: '.8rem', color: 'var(--danger)', background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.25)', borderRadius: 10, padding: '.65rem .9rem' }}>
                                    {formErr}
                                </p>
                            )}

                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? <div className="spinner" /> : <><Check size={16} /> Salvar posição</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
