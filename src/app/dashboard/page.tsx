'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Transaction, Category } from '@/lib/supabase'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area, ReferenceLine,
} from 'recharts'
import {
    TrendingUp, TrendingDown, Plus, LogOut,
    ChevronLeft, ChevronRight, Repeat2,
    ListOrdered, Flame, ArrowUpRight, ArrowDownRight,
    LineChart, Receipt, ChevronDown, ChevronUp, Wallet,
} from 'lucide-react'

/* ── helpers ── */
const COLORS_EXP = ['#f43f5e', '#fb923c', '#f59e0b', '#ec4899', '#ef4444', '#f97316', '#e879f9', '#fbbf24']
const COLORS_INV = ['#f59e0b', '#10b981', '#6366f1', '#a855f7', '#06b6d4', '#34d399', '#818cf8', '#fbbf24']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (v: number) => {
    const abs = Math.abs(v)
    if (abs >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
    if (abs >= 1000) return `R$${(v / 1000).toFixed(1)}k`
    return `R$${v.toFixed(0)}`
}
function getRange(y: number, m: number) {
    return { start: `${y}-${String(m).padStart(2, '0')}-01`, end: new Date(y, m, 0).toISOString().split('T')[0] }
}
function monthName(y: number, m: number) {
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }

/* ── animated counter ── */
function useCountUp(target: number, ms = 700) {
    const [val, setVal] = useState(0); const prev = useRef(0)
    useEffect(() => {
        const start = prev.current; prev.current = target
        if (start === target) { setVal(target); return }
        const steps = 30; const inc = (target - start) / steps; let n = 0
        const id = setInterval(() => { n++; setVal(start + inc * n); if (n >= steps) { setVal(target); clearInterval(id) } }, ms / steps)
        return () => clearInterval(id)
    }, [target, ms])
    return val
}

/* ── Skeleton ── */
function Sk({ w = '100%', h = 16, r = 10 }: { w?: string | number; h?: number; r?: number }) {
    return <div style={{
        width: w, height: h, borderRadius: r,
        background: 'linear-gradient(90deg,rgba(255,255,255,.04)25%,rgba(255,255,255,.08)50%,rgba(255,255,255,.04)75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite'
    }} />
}

/* ── Tooltips ── */
const PieTip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return <div style={{ background: 'rgba(12,12,36,.95)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 12, padding: '8px 14px', fontSize: 13, backdropFilter: 'blur(12px)' }}>
        <p style={{ fontWeight: 700, marginBottom: 2 }}>{payload[0].name}</p>
        <p style={{ color: '#a78bfa' }}>{fmt(payload[0].value)}</p>
    </div>
}
const BarTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return <div style={{ background: 'rgba(12,12,36,.95)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 12, padding: '10px 14px', fontSize: 12, backdropFilter: 'blur(12px)' }}>
        <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{label}</p>
        <p style={{ color: '#10b981' }}>Receita: {fmtShort(payload[0]?.value ?? 0)}</p>
        <p style={{ color: '#f43f5e' }}>Despesa: {fmtShort(payload[1]?.value ?? 0)}</p>
        {payload[2] && <p style={{ color: '#f59e0b' }}>Invest.: {fmtShort(payload[2]?.value ?? 0)}</p>}
    </div>
}
const AreaTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const v = payload[0]?.value ?? 0
    return <div style={{ background: 'rgba(12,12,36,.95)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 12, padding: '8px 14px', fontSize: 12, backdropFilter: 'blur(12px)' }}>
        <p style={{ color: 'var(--text2)', marginBottom: 2 }}>Dia {label}</p>
        <p style={{ fontWeight: 700, color: v >= 0 ? '#10b981' : '#f43f5e' }}>{fmt(v)}</p>
    </div>
}

/* ── Expandable category group ── */
function CatGroup({ name, txs, color, total }: { name: string; txs: Transaction[]; color: string; total: number }) {
    const [open, setOpen] = useState(false)
    const catTotal = txs.reduce((a, t) => a + Number(t.amount), 0)
    const pct = total > 0 ? (catTotal / total) * 100 : 0
    const emoji = name.split(' ')[0]
    const label = name.replace(/^[\p{Emoji}\s]+/u, '').trim() || name
    return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <button onClick={() => setOpen(o => !o)} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '.75rem',
                padding: '.85rem 1.1rem', textAlign: 'left', transition: 'background .15s',
            }}>
                <div className="icon-badge" style={{ background: `${color}18`, fontSize: '1.1rem' }}>{emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '.86rem', marginBottom: '.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                    <div className="progress-track" style={{ height: 3 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '.5rem' }}>
                    <p style={{ fontWeight: 800, fontSize: '.86rem', color: 'var(--danger)' }}>{fmt(catTotal)}</p>
                    <p style={{ fontSize: '.67rem', color: 'var(--text2)', marginTop: '.1rem' }}>{pct.toFixed(0)}% · {txs.length}×</p>
                </div>
                {txs.length > 1 ? (open ? <ChevronUp size={14} color="var(--muted)" /> : <ChevronDown size={14} color="var(--muted)" />) : <div style={{ width: 14 }} />}
            </button>
            {open && txs.map((tx, i) => (
                <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '.6rem 1.1rem .6rem 4rem',
                    background: 'rgba(124,58,237,.04)', borderTop: '1px solid rgba(255,255,255,.04)',
                    animation: 'fadeUp .18s ease both', animationDelay: `${i * .04}s`,
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '.8rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '–'}</p>
                        <p style={{ fontSize: '.67rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                            {new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {tx.is_recurring && ' · 🔁'}
                        </p>
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '.82rem', color: 'var(--danger)', flexShrink: 0, marginLeft: '.75rem' }}>
                        -{fmt(Number(tx.amount))}
                    </p>
                </div>
            ))}
        </div>
    )
}

/* ══════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const router = useRouter()
    const nowRef = useRef(new Date()); const now = nowRef.current
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [transactions, setTx] = useState<Transaction[]>([])
    const [barData, setBar] = useState<any[]>([])
    const [areaData, setArea] = useState<any[]>([])
    const [loading, setLoad] = useState(true)
    const [tab, setTab] = useState<'overview' | 'expenses' | 'investments' | 'transactions'>('overview')

    const fetchData = useCallback(async () => {
        setLoad(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        const { start, end } = getRange(year, month)
        const sixAgo = new Date(year, month - 7, 1).toISOString().split('T')[0]
        const [{ data: txData }, { data: allTx }] = await Promise.all([
            supabase.from('transactions').select('*,categories(id,name,type)').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: true }),
            supabase.from('transactions').select('amount,date,type').eq('user_id', user.id).gte('date', sixAgo).lte('date', end),
        ])
        setTx([...(txData ?? [])].reverse())
        const map: Record<string, { income: number; expense: number; investment: number }> = {}
            ; (allTx ?? []).forEach(t => {
                const d = new Date(t.date + 'T12:00')
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (!map[key]) map[key] = { income: 0, expense: 0, investment: 0 }
                map[key][t.type as 'income' | 'expense' | 'investment'] += Number(t.amount)
            })
        setBar(Object.keys(map).sort().slice(-6).map(k => ({
            label: new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1).toLocaleDateString('pt-BR', { month: 'short' }),
            ...map[k],
        })))
        const days = daysInMonth(year, month)
        const dayMap: Record<number, number> = {}
            ; (txData ?? []).filter(t => t.type !== 'investment').forEach(t => {
                const d = new Date(t.date + 'T12:00').getDate()
                dayMap[d] = (dayMap[d] ?? 0) + (t.type === 'income' ? Number(t.amount) : -Number(t.amount))
            })
        let run = 0; const today = year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : days; const area = []
        for (let d = 1; d <= Math.min(today, days); d++) { run += dayMap[d] ?? 0; area.push({ day: d, saldo: parseFloat(run.toFixed(2)) }) }
        setArea(area); setLoad(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, router])

    useEffect(() => { fetchData() }, [fetchData])

    function prevMonth() { month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1) }
    function nextMonth() { month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1) }

    const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const invested = transactions.filter(t => t.type === 'investment').reduce((a, t) => a + Number(t.amount), 0)
    const balance = income - expense - invested
    const expPct = income > 0 ? Math.min(100, (expense / income) * 100) : 0
    const invPct = income > 0 ? Math.min(100, (invested / income) * 100) : 0
    const savRate = income > 0 ? Math.max(0, Math.min(100, ((income - expense - invested) / income) * 100)) : 0

    const animBal = useCountUp(balance); const animInc = useCountUp(income)
    const animExp = useCountUp(expense); const animInv = useCountUp(invested)

    const expByCategory: Record<string, { txs: Transaction[] }> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const n = (t.categories as Category | undefined)?.name ?? 'Outros'
        if (!expByCategory[n]) expByCategory[n] = { txs: [] }
        expByCategory[n].txs.push(t)
    })
    const expCats = Object.entries(expByCategory).sort((a, b) => b[1].txs.reduce((s, t) => s + Number(t.amount), 0) - a[1].txs.reduce((s, t) => s + Number(t.amount), 0))
    const expDonut = expCats.map(([name, { txs }]) => ({ name, value: txs.reduce((a, t) => a + Number(t.amount), 0) }))

    const invByCategory: Record<string, number> = {}
    transactions.filter(t => t.type === 'investment').forEach(t => {
        const n = (t.categories as Category | undefined)?.name ?? 'Outros'
        invByCategory[n] = (invByCategory[n] ?? 0) + Number(t.amount)
    })
    const invDonut = Object.entries(invByCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
    const areaPos = areaData.length > 0 && areaData[areaData.length - 1]?.saldo >= 0
    const investmentTxs = transactions.filter(t => t.type === 'investment')

    const TABS = [
        { id: 'overview', emoji: '📊', label: 'Geral' },
        { id: 'expenses', emoji: '💸', label: 'Despesas' },
        { id: 'investments', emoji: '📈', label: 'Aportes' },
        { id: 'transactions', emoji: '📋', label: 'Histórico' },
    ] as const

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: '7rem' }}>
            <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(124,58,237,.3)}50%{box-shadow:0 0 40px rgba(124,58,237,.6)}}
      `}</style>

            {/* ─── Header ─── */}
            <header style={{
                padding: '3.25rem 1.2rem 1rem', position: 'sticky', top: 0, zIndex: 30,
                background: 'rgba(5,5,26,.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(124,58,237,.15)',
                boxShadow: '0 1px 0 rgba(124,58,237,.1)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                        <h1 style={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-.04em', lineHeight: 1 }}>
                            <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#f9a8d4,#fed7aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finanças</span>
                            <span style={{ color: 'var(--text)' }}>Pro</span>
                        </h1>
                        <p style={{ fontSize: '.65rem', color: 'var(--text2)', marginTop: '.2rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Painel</p>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
                        className="btn-ghost" style={{ padding: '.45rem .75rem', gap: '.3rem', fontSize: '.78rem' }}>
                        <LogOut size={13} /> Sair
                    </button>
                </div>

                {/* Month nav */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(12,12,36,.8)', border: '1px solid rgba(124,58,237,.2)',
                    borderRadius: 14, padding: '.5rem .9rem', backdropFilter: 'blur(12px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
                }}>
                    <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '.15rem', transition: 'color .2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                        <ChevronLeft size={18} />
                    </button>
                    <p style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'capitalize', letterSpacing: '-.01em' }}>{monthName(year, month)}</p>
                    <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '.15rem', transition: 'color .2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </header>

            {/* ─── Tabs ─── */}
            <div style={{ padding: '.85rem 1.2rem .5rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '.4rem', minWidth: 'max-content' }}>
                    {TABS.map(({ id, emoji, label }) => (
                        <button key={id} onClick={() => setTab(id as typeof tab)} style={{
                            display: 'flex', alignItems: 'center', gap: '.4rem',
                            padding: '.5rem .9rem', borderRadius: 12, cursor: 'pointer',
                            fontWeight: 700, fontSize: '.78rem', whiteSpace: 'nowrap',
                            transition: 'all .2s', fontFamily: 'inherit',
                            background: tab === id ? 'linear-gradient(135deg,rgba(124,58,237,.8),rgba(168,85,247,.8))' : 'rgba(12,12,36,.8)',
                            color: tab === id ? '#fff' : 'var(--text2)',
                            border: tab === id ? '1px solid rgba(168,85,247,.5)' : '1px solid rgba(255,255,255,.06)',
                            boxShadow: tab === id ? '0 4px 16px rgba(124,58,237,.3)' : 'none',
                            backdropFilter: 'blur(8px)',
                        }}>
                            <span style={{ fontSize: '1rem' }}>{emoji}</span> {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '0 1.2rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                        <Sk w="35%" h={11} /><Sk h={40} /><Sk h={5} r={99} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.65rem' }}>
                        {[0, 1, 2].map(i => <div key={i} className="card"><Sk h={58} /></div>)}
                    </div>
                    <div className="card"><Sk h={140} /></div>
                </div>

            ) : tab === 'overview' ? (
                /* ════ OVERVIEW ════ */
                <main style={{ padding: '0 1.2rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>

                    {/* Balance Hero */}
                    <div className="fade-up card-gradient-border" style={{
                        background: 'linear-gradient(135deg,rgba(124,58,237,.15),rgba(99,102,241,.08))',
                        position: 'relative', overflow: 'hidden', padding: '1.4rem',
                    }}>
                        {/* Glow orb */}
                        <div style={{
                            position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
                            background: balance >= 0 ? 'rgba(16,185,129,.18)' : 'rgba(244,63,94,.15)',
                            filter: 'blur(50px)', pointerEvents: 'none'
                        }} />
                        <p className="stat-label" style={{ marginBottom: '.4rem' }}>💰 Saldo livre</p>
                        <p style={{
                            fontWeight: 900, fontSize: '2.4rem', letterSpacing: '-.05em', lineHeight: 1,
                            background: balance >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f43f5e,#fb923c)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            {fmt(animBal)}
                        </p>
                        <p style={{ fontSize: '.7rem', color: 'var(--text2)', marginTop: '.4rem', marginBottom: '1rem' }}>Receita − Despesas − Investimentos</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.9rem' }}>
                            <Flame size={13} color={savRate > 15 ? '#f59e0b' : 'var(--muted)'} />
                            <span style={{ fontSize: '.75rem', color: 'var(--text2)' }}>
                                Poupança: <strong style={{ color: savRate > 15 ? '#f59e0b' : 'var(--text2)' }}>{savRate.toFixed(1)}%</strong>
                            </span>
                        </div>
                        {/* Progress bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                            {[
                                { label: 'Despesas', val: expPct, col: expPct > 80 ? 'linear-gradient(90deg,#f43f5e,#fb923c)' : expPct > 60 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)', textCol: expPct > 80 ? 'var(--danger)' : expPct > 60 ? 'var(--warning)' : 'var(--success)' },
                                { label: 'Investimentos', val: invPct, col: 'linear-gradient(90deg,#b45309,#f59e0b)', textCol: '#f59e0b' },
                            ].map(({ label, val, col, textCol }) => (
                                <div key={label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.28rem' }}>
                                        <span style={{ fontSize: '.67rem', color: 'var(--text2)', fontWeight: 600 }}>{label}</span>
                                        <span style={{ fontSize: '.67rem', fontWeight: 800, color: textCol }}>{val.toFixed(0)}%</span>
                                    </div>
                                    <div className="progress-track"><div className="progress-fill" style={{ width: `${val}%`, background: col }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3 KPI cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.65rem' }}>
                        {[
                            { label: 'Receitas', val: animInc, color: '#10b981', icon: <ArrowUpRight size={13} />, delay: .05 },
                            { label: 'Despesas', val: animExp, color: '#f43f5e', icon: <ArrowDownRight size={13} />, delay: .08 },
                            { label: 'Investido', val: animInv, color: '#f59e0b', icon: <LineChart size={13} />, delay: .11 },
                        ].map(({ label, val, color, icon, delay }) => (
                            <div key={label} className="card fade-up" style={{ background: `${color}0f`, border: `1px solid ${color}22`, animationDelay: `${delay}s`, padding: '.85rem .9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
                                    <p style={{ fontSize: '.6rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color }}>{label}</p>
                                    <span style={{ color }}>{icon}</span>
                                </div>
                                <p style={{ fontWeight: 900, fontSize: '.95rem', color, letterSpacing: '-.02em' }}>{fmtShort(val)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Area chart */}
                    {areaData.length > 1 && (
                        <div className="card fade-up" style={{ animationDelay: '.13s', padding: '1.2rem 1rem 1rem' }}>
                            <p className="section-title">Evolução do saldo</p>
                            <div style={{ height: 130 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={areaPos ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={areaPos ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(areaData.length / 4)} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                                        <Tooltip content={<AreaTip />} cursor={{ stroke: 'rgba(124,58,237,.5)', strokeWidth: 1.5 }} />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,.1)" strokeDasharray="4 4" />
                                        <Area type="monotone" dataKey="saldo" stroke={areaPos ? '#10b981' : '#f43f5e'}
                                            strokeWidth={2.5} fill="url(#ag)" dot={false}
                                            activeDot={{ r: 5, fill: areaPos ? '#10b981' : '#f43f5e', stroke: 'var(--bg)', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Bar chart 6m */}
                    {barData.length > 1 && (
                        <div className="card fade-up" style={{ animationDelay: '.16s' }}>
                            <p className="section-title">Histórico 6 meses</p>
                            <div style={{ height: 155 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} barGap={2} barCategoryGap="25%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                                        <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(124,58,237,.05)' }} />
                                        <Bar dataKey="income" fill="#10b981" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="expense" fill="#f43f5e" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="investment" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '.5rem' }}>
                                {[['#10b981', 'Receita'], ['#f43f5e', 'Despesa'], ['#f59e0b', 'Invest.']].map(([c, l]) => (
                                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.7rem', color: 'var(--text2)' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {transactions.length === 0 && (
                        <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(124,58,237,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(124,58,237,.2)' }}>
                                <Wallet size={28} color="var(--muted)" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '.35rem' }}>Nenhuma transação</p>
                                <p style={{ color: 'var(--text2)', fontSize: '.84rem' }}>Toque no + para adicionar sua primeira</p>
                            </div>
                        </div>
                    )}
                </main>

            ) : tab === 'expenses' ? (
                /* ════ DESPESAS ════ */
                <main style={{ padding: '0 1.2rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                    <div className="fade-up card-gradient-border" style={{ background: 'rgba(244,63,94,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
                        <div>
                            <p className="stat-label">Total despesas</p>
                            <p style={{ fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-.04em', color: 'var(--danger)', marginTop: '.2rem' }}>{fmt(expense)}</p>
                            <p style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: '.3rem' }}>{transactions.filter(t => t.type === 'expense').length} lançamentos · {expPct.toFixed(0)}% da receita</p>
                        </div>
                        <div style={{ width: 72, height: 72, flexShrink: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={[{ value: expPct }, { value: 100 - expPct }]} cx="50%" cy="50%" innerRadius={22} outerRadius={34} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                                    <Cell fill="#f43f5e" /><Cell fill="rgba(255,255,255,.06)" />
                                </Pie></PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {expDonut.length > 0 && (
                        <div className="card fade-up" style={{ animationDelay: '.06s' }}>
                            <p className="section-title">Por categoria</p>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart><Pie data={expDonut} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" stroke="none" paddingAngle={2}>
                                            {expDonut.map((_, i) => <Cell key={i} fill={COLORS_EXP[i % COLORS_EXP.length]} />)}
                                        </Pie><Tooltip content={<PieTip />} /></PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.5rem', overflow: 'hidden' }}>
                                    {expDonut.slice(0, 6).map((d, i) => {
                                        const pct = expense > 0 ? ((d.value / expense) * 100).toFixed(0) : '0'
                                        const emoji = d.name.split(' ')[0]
                                        return (<div key={i}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.2rem' }}>
                                                <span style={{ fontSize: '.9rem' }}>{emoji}</span>
                                                <span style={{ fontSize: '.72rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name.replace(/^[\p{Emoji}\s]+/u, '').trim()}</span>
                                                <span style={{ fontSize: '.7rem', fontWeight: 800, color: COLORS_EXP[i % COLORS_EXP.length], flexShrink: 0 }}>{pct}%</span>
                                            </div>
                                            <div className="progress-track" style={{ height: 3, marginLeft: 22 }}>
                                                <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS_EXP[i % COLORS_EXP.length] }} />
                                            </div>
                                        </div>)
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {expCats.length > 0 ? (
                        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '.1s' }}>
                            <div style={{ padding: '1rem 1.1rem .75rem', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                                <p className="section-title" style={{ margin: 0 }}>Lançamentos por categoria</p>
                            </div>
                            {expCats.map(([name, { txs }], i) => (
                                <CatGroup key={name} name={name} txs={txs} color={COLORS_EXP[i % COLORS_EXP.length]} total={expense} />
                            ))}
                        </div>
                    ) : (
                        <div className="card fade-up" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text2)' }}>
                            <Receipt size={36} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                            <p>Nenhuma despesa neste período</p>
                        </div>
                    )}
                </main>

            ) : tab === 'investments' ? (
                /* ════ INVESTIMENTOS ════ */
                <main style={{ padding: '0 1.2rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                    <div className="fade-up card-gradient-border" style={{
                        background: 'linear-gradient(135deg,rgba(245,158,11,.15),rgba(251,191,36,.06))',
                        position: 'relative', overflow: 'hidden', padding: '1.4rem',
                    }}>
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(245,158,11,.15)', filter: 'blur(50px)', pointerEvents: 'none' }} />
                        <p className="stat-label" style={{ marginBottom: '.3rem' }}>📈 Total investido</p>
                        <p style={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '-.04em', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {fmt(animInv)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.7rem', marginBottom: '.9rem' }}>
                            <LineChart size={13} color="#f59e0b" />
                            <span style={{ fontSize: '.75rem', color: 'var(--text2)' }}>
                                Taxa de aporte: <strong style={{ color: '#f59e0b' }}>{invPct.toFixed(1)}% da receita</strong>
                            </span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${invPct}%`, background: 'linear-gradient(90deg,#b45309,#f59e0b)' }} />
                        </div>
                    </div>

                    {invDonut.length > 0 && (
                        <div className="card fade-up" style={{ animationDelay: '.06s' }}>
                            <p className="section-title">Alocação</p>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart><Pie data={invDonut} cx="50%" cy="50%" innerRadius={42} outerRadius={64} dataKey="value" stroke="none" paddingAngle={3}>
                                            {invDonut.map((_, i) => <Cell key={i} fill={COLORS_INV[i % COLORS_INV.length]} />)}
                                        </Pie><Tooltip content={<PieTip />} /></PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.5rem', overflow: 'hidden' }}>
                                    {invDonut.map((d, i) => {
                                        const pct = invested > 0 ? ((d.value / invested) * 100) : 0
                                        const emoji = d.name.split(' ')[0]
                                        return (<div key={i}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.2rem' }}>
                                                <span style={{ fontSize: '.9rem' }}>{emoji}</span>
                                                <span style={{ fontSize: '.72rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name.replace(/^[\p{Emoji}\s]+/u, '').trim()}</span>
                                                <span style={{ fontSize: '.7rem', fontWeight: 800, color: COLORS_INV[i % COLORS_INV.length], flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                                            </div>
                                            <div className="progress-track" style={{ height: 3, marginLeft: 22 }}>
                                                <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS_INV[i % COLORS_INV.length] }} />
                                            </div>
                                        </div>)
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '.1s' }}>
                        <div style={{ padding: '1rem 1.1rem .6rem', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p className="section-title" style={{ margin: 0 }}>Aportes</p>
                            <span style={{ fontSize: '.72rem', color: 'var(--text2)', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', padding: '.2rem .6rem', borderRadius: 6 }}>{investmentTxs.length}</span>
                        </div>
                        {investmentTxs.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem 1rem', color: 'var(--text2)', textAlign: 'center' }}>
                                <LineChart size={36} strokeWidth={1.5} />
                                <div><p style={{ fontWeight: 700, marginBottom: '.25rem' }}>Sem aportes</p><p style={{ fontSize: '.83rem' }}>Registre seu primeiro investimento</p></div>
                            </div>
                        ) : investmentTxs.map((tx, i) => {
                            const cat = (tx.categories as Category | undefined)?.name ?? 'Investimento'
                            const emoji = cat.split(' ')[0]; const label = cat.replace(/^[\p{Emoji}\s]+/u, '').trim() || cat
                            return (
                                <div key={tx.id} className="tx-row fade-up" style={{ animationDelay: `${i * .03}s` }}>
                                    <div className="icon-badge" style={{ background: 'rgba(245,158,11,.15)' }}>{emoji}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                                        <p style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: '.1rem' }}>
                                            {tx.description || new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontWeight: 800, fontSize: '.86rem', color: '#f59e0b' }}>+{fmt(Number(tx.amount))}</p>
                                        <p style={{ fontSize: '.67rem', color: 'var(--text2)', marginTop: '.1rem' }}>{new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </main>

            ) : (
                /* ════ HISTÓRICO ════ */
                <main style={{ padding: '0 1.2rem' }}>
                    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.1rem .6rem', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p className="section-title" style={{ margin: 0 }}>Todos os lançamentos</p>
                            <span style={{ fontSize: '.72rem', color: 'var(--text2)', background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.25)', padding: '.2rem .6rem', borderRadius: 6 }}>{transactions.length}</span>
                        </div>
                        {transactions.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', padding: '2.5rem 1rem', color: 'var(--text2)' }}>
                                <ListOrdered size={32} strokeWidth={1.5} /><p style={{ fontSize: '.875rem' }}>Sem transações</p>
                            </div>
                        ) : transactions.map((tx, i) => {
                            const isInc = tx.type === 'income', isInv = tx.type === 'investment'
                            const cat = (tx.categories as Category | undefined)?.name ?? 'Sem categoria'
                            const emoji = cat.split(' ')[0]; const label = cat.replace(/^[\p{Emoji}\s]+/u, '').trim() || cat
                            const color = isInv ? '#f59e0b' : isInc ? 'var(--success)' : 'var(--danger)'
                            const bg = isInv ? 'rgba(245,158,11,.15)' : isInc ? 'rgba(16,185,129,.15)' : 'rgba(244,63,94,.15)'
                            return (
                                <div key={tx.id} className="tx-row fade-up" style={{ animationDelay: `${i * .025}s` }}>
                                    <div className="icon-badge" style={{ background: bg, fontSize: '1.15rem' }}>{emoji}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                                            <p style={{ fontWeight: 700, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                                            {tx.is_recurring && <Repeat2 size={11} color="#a78bfa" />}
                                        </div>
                                        <p style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: '.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tx.description || new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontWeight: 800, fontSize: '.86rem', color }}>
                                            {isInc ? '+' : isInv ? '▲' : '-'}{fmt(Number(tx.amount))}
                                        </p>
                                        <p style={{ fontSize: '.67rem', color: 'var(--text2)', marginTop: '.1rem' }}>
                                            {new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </main>
            )}

            {/* FAB */}
            <Link href="/transactions/new" className="fab" id="fab-add" aria-label="Nova">
                <Plus size={26} color="white" />
            </Link>

            {/* Bottom Nav */}
            <nav className="bottom-nav">
                {TABS.map(({ id, emoji, label }) => (
                    <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id as typeof tab)}>
                        <span className="nav-icon-wrap"><span style={{ fontSize: '1.2rem' }}>{emoji}</span></span>
                        {label}
                    </button>
                ))}
                <Link href="/transactions/new" className="nav-item">
                    <span className="nav-icon-wrap"><Plus size={18} /></span>
                    Novo
                </Link>
            </nav>
        </div>
    )
}
