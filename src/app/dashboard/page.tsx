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
    TrendingUp, TrendingDown, Wallet, Plus,
    LogOut, ChevronLeft, ChevronRight, Repeat2,
    LayoutDashboard, ListOrdered, Flame,
    ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

/* ── constants & helpers ────────────────────────────── */
const DONUT_COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (v: number) => {
    const abs = Math.abs(v)
    if (abs >= 1000) return `R$${(v / 1000).toFixed(1)}k`
    return `R$${v.toFixed(0)}`
}

function getRange(y: number, m: number) {
    return {
        start: `${y}-${String(m).padStart(2, '0')}-01`,
        end: new Date(y, m, 0).toISOString().split('T')[0],
    }
}
function monthName(y: number, m: number) {
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }

/* ── animated counter ────────────────────────────────── */
function useCountUp(target: number, duration = 800) {
    const [value, setValue] = useState(0)
    const prev = useRef(0)
    useEffect(() => {
        const start = prev.current; prev.current = target
        if (start === target) { setValue(target); return }
        const steps = 30; const inc = (target - start) / steps; let cur = 0
        const id = setInterval(() => {
            cur++; setValue(start + inc * cur)
            if (cur >= steps) { setValue(target); clearInterval(id) }
        }, duration / steps)
        return () => clearInterval(id)
    }, [target, duration])
    return value
}

/* ── tooltip components ─────────────────────────────── */
const DonutTip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px', fontSize: 13 }}>
            <p style={{ fontWeight: 700 }}>{payload[0].name}</p>
            <p style={{ color: 'var(--brand-light)' }}>{fmt(payload[0].value)}</p>
        </div>
    )
}
const BarTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px', fontSize: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
            <p style={{ color: '#10b981' }}>Receita: {fmtShort(payload[0]?.value ?? 0)}</p>
            <p style={{ color: '#f43f5e' }}>Despesa: {fmtShort(payload[1]?.value ?? 0)}</p>
        </div>
    )
}
const AreaTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px', fontSize: 12 }}>
            <p style={{ color: 'var(--muted)', marginBottom: 2 }}>Dia {label}</p>
            <p style={{ fontWeight: 700, color: payload[0]?.value >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmt(payload[0]?.value ?? 0)}
            </p>
        </div>
    )
}

/* ── skeleton ───────────────────────────────────────── */
function Skeleton({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
    return (
        <div style={{
            width: w, height: h, borderRadius: r,
            background: 'linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
        }} />
    )
}

/* ── mini KPI card ──────────────────────────────────── */
function KpiCard({ label, value, color, icon, delay = 0 }: { label: string; value: number; color: string; icon: React.ReactNode; delay?: number }) {
    const animated = useCountUp(value)
    return (
        <div className="card fade-up" style={{ animationDelay: `${delay}s`, background: `${color}18`, border: `1px solid ${color}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                <p className="stat-label">{label}</p>
            </div>
            <p style={{ fontWeight: 800, fontSize: '1.05rem', color, lineHeight: 1 }}>{fmt(animated)}</p>
        </div>
    )
}

/* ══════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const router = useRouter()
    // Stable reference to "now" — avoids infinite re-render loop
    const nowRef = useRef(new Date())
    const now = nowRef.current
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [transactions, setTx] = useState<Transaction[]>([])
    const [barData, setBar] = useState<any[]>([])
    const [areaData, setArea] = useState<any[]>([])
    const [loading, setLoad] = useState(true)
    const [tab, setTab] = useState<'overview' | 'transactions' | 'categories'>('overview')

    const fetchData = useCallback(async () => {
        setLoad(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const { start, end } = getRange(year, month)
        const sixMonthsAgo = new Date(year, month - 7, 1).toISOString().split('T')[0]

        const [{ data: txData }, { data: allTx }] = await Promise.all([
            supabase.from('transactions').select('*, categories(id, name, type)')
                .eq('user_id', user.id).gte('date', start).lte('date', end)
                .order('date', { ascending: true }),
            supabase.from('transactions').select('amount, date, type')
                .eq('user_id', user.id).gte('date', sixMonthsAgo).lte('date', end),
        ])

        const sorted = (txData ?? [])
        setTx([...sorted].reverse())

        // ── Bar chart: 6 months ──
        const map: Record<string, { income: number; expense: number }> = {}
            ; (allTx ?? []).forEach(t => {
                const d = new Date(t.date + 'T12:00')
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (!map[key]) map[key] = { income: 0, expense: 0 }
                t.type === 'income' ? (map[key].income += Number(t.amount)) : (map[key].expense += Number(t.amount))
            })
        setBar(Object.keys(map).sort().slice(-6).map(k => {
            const [y2, m2] = k.split('-')
            return {
                label: new Date(Number(y2), Number(m2) - 1).toLocaleDateString('pt-BR', { month: 'short' }),
                income: map[k].income, expense: map[k].expense,
            }
        }))

        // ── Area chart: daily cumulative balance this month ──
        const days = daysInMonth(year, month)
        const dayMap: Record<number, number> = {}
            ; (txData ?? []).forEach(t => {
                const d = new Date(t.date + 'T12:00').getDate()
                dayMap[d] = (dayMap[d] ?? 0) + (t.type === 'income' ? Number(t.amount) : -Number(t.amount))
            })
        let running = 0
        const today = year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : days
        const area = []
        for (let d = 1; d <= Math.min(today, days); d++) {
            running += dayMap[d] ?? 0
            area.push({ day: d, saldo: parseFloat(running.toFixed(2)) })
        }
        setArea(area)
        setLoad(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, router])

    useEffect(() => { fetchData() }, [fetchData])

    function prevMonth() { month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1) }
    function nextMonth() { month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1) }

    /* ── KPIs ── */
    const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const balance = income - expense
    const expPct = income > 0 ? Math.min(100, (expense / income) * 100) : 0
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((income - expense) / income) * 100)) : 0

    const animBalance = useCountUp(balance)
    const animIncome = useCountUp(income)
    const animExpense = useCountUp(expense)

    /* ── Donut + category breakdown ── */
    const expMap: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const n = (t.categories as Category | undefined)?.name ?? 'Outros'
        expMap[n] = (expMap[n] ?? 0) + Number(t.amount)
    })
    const donutData = Object.entries(expMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

    /* ── recurring ── */
    const recurring = transactions.filter(t => t.is_recurring).reduce((a, t) => a + Number(t.amount), 0)

    /* ── area gradient id ── */
    const areaPositive = areaData.length > 0 && areaData[areaData.length - 1]?.saldo >= 0

    /* ── streak: consecutive days with more income than expense ── */
    const biggestDay = areaData.reduce((best, d) => d.saldo > (best?.saldo ?? -Infinity) ? d : best, null as any)

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: '7rem' }}>
            <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

            {/* ── Header ── */}
            <header style={{
                padding: '3rem 1.1rem 1rem',
                position: 'sticky', top: 0, zIndex: 30,
                background: 'rgba(6,6,20,.85)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.85rem' }}>
                    <div>
                        <h1 style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-.03em', lineHeight: 1 }}>
                            <span style={{ background: 'linear-gradient(90deg,#a78bfa,#f472b6,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finanças</span>
                            <span>Pro</span>
                        </h1>
                        <p style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '.2rem', letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                            Painel financeiro
                        </p>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
                        className="btn-ghost" style={{ padding: '.5rem .65rem', gap: '.35rem', fontSize: '.78rem' }}>
                        <LogOut size={14} /> Sair
                    </button>
                </div>

                {/* Month nav */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '.45rem .75rem'
                }}>
                    <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '.2rem' }}>
                        <ChevronLeft size={18} />
                    </button>
                    <p style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'capitalize' }}>{monthName(year, month)}</p>
                    <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '.2rem' }}>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div style={{ padding: '1rem 1.1rem .5rem' }}>
                <div className="tab-group">
                    {(['overview', 'categories', 'transactions'] as const).map(t => (
                        <button key={t} className="tab-btn" onClick={() => setTab(t)}
                            style={{
                                background: tab === t ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                                color: tab === t ? '#fff' : 'var(--muted)',
                                fontSize: '.77rem', padding: '.6rem .3rem',
                            }}>
                            {t === 'overview' ? '📊 Geral' : t === 'categories' ? '🏷️ Categorias' : '📋 Lançamentos'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                /* ── Skeleton ── */
                <div style={{ padding: '0 1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                        <Skeleton w="40%" h={12} />
                        <Skeleton h={36} />
                        <Skeleton h={6} r={99} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                        <div className="card"><Skeleton h={60} /></div>
                        <div className="card"><Skeleton h={60} /></div>
                    </div>
                    <div className="card"><Skeleton h={140} /></div>
                </div>
            ) : tab === 'overview' ? (
                /* ════════════ OVERVIEW ════════════ */
                <main style={{ padding: '0 1.1rem', display: 'flex', flexDirection: 'column', gap: '.9rem' }}>

                    {/* Balance Hero */}
                    <div className="card fade-up" style={{
                        background: 'linear-gradient(135deg, rgba(124,58,237,.18) 0%, rgba(168,85,247,.08) 100%)',
                        border: '1px solid rgba(124,58,237,.3)',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {/* background glow */}
                        <div style={{
                            position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
                            background: balance >= 0 ? 'rgba(16,185,129,.12)' : 'rgba(244,63,94,.1)', filter: 'blur(40px)', pointerEvents: 'none'
                        }} />

                        <p className="stat-label" style={{ marginBottom: '.3rem' }}>Saldo do mês</p>
                        <p style={{
                            fontWeight: 900, fontSize: '2.2rem', letterSpacing: '-.04em', lineHeight: 1,
                            background: balance >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f43f5e,#fb923c)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {fmt(animBalance)}
                        </p>

                        {/* Savings rate indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.75rem' }}>
                            <Flame size={13} color={savingsRate > 20 ? '#f59e0b' : 'var(--muted)'} />
                            <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                                Taxa de poupança: <span style={{ fontWeight: 700, color: savingsRate > 20 ? '#f59e0b' : 'var(--muted)' }}>{savingsRate.toFixed(1)}%</span>
                            </span>
                        </div>

                        {/* progress bar */}
                        <div style={{ marginTop: '.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                                <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Comprometido</span>
                                <span style={{ fontSize: '.7rem', fontWeight: 700, color: expPct > 80 ? 'var(--danger)' : expPct > 60 ? 'var(--warning)' : 'var(--success)' }}>{expPct.toFixed(0)}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill" style={{
                                    width: `${expPct}%`,
                                    background: expPct > 80 ? 'linear-gradient(90deg,#f43f5e,#fb923c)' : expPct > 60 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)',
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Income / Expense KPI row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                        <div className="card fade-up" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', animationDelay: '.05s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                                <p className="stat-label">Receitas</p>
                                <ArrowUpRight size={16} color="var(--success)" />
                            </div>
                            <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)' }}>{fmt(animIncome)}</p>
                        </div>
                        <div className="card fade-up" style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.25)', animationDelay: '.1s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                                <p className="stat-label">Despesas</p>
                                <ArrowDownRight size={16} color="var(--danger)" />
                            </div>
                            <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--danger)' }}>{fmt(animExpense)}</p>
                        </div>
                    </div>

                    {/* ── Area Chart: daily balance evolution ── */}
                    {areaData.length > 1 && (
                        <div className="card fade-up" style={{ animationDelay: '.12s', padding: '1.1rem 1rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                                <p className="section-title" style={{ margin: 0 }}>Evolução do saldo</p>
                                {biggestDay && (
                                    <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
                                        pico: dia {biggestDay.day}
                                    </span>
                                )}
                            </div>
                            <div style={{ height: 130 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={areaPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={areaPositive ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,30,63,.8)" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                                            interval={Math.floor(areaData.length / 4)} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                                        <Tooltip content={<AreaTip />} cursor={{ stroke: 'rgba(124,58,237,.4)', strokeWidth: 1.5 }} />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,.12)" strokeDasharray="4 4" />
                                        <Area
                                            type="monotone" dataKey="saldo"
                                            stroke={areaPositive ? '#10b981' : '#f43f5e'}
                                            strokeWidth={2.5}
                                            fill="url(#areaGrad)"
                                            dot={false}
                                            activeDot={{ r: 5, fill: areaPositive ? '#10b981' : '#f43f5e', stroke: 'var(--bg)', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── Donut chart ── */}
                    {donutData.length > 0 && (
                        <div className="card fade-up" style={{ animationDelay: '.15s' }}>
                            <p className="section-title">Despesas por categoria</p>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                                                dataKey="value" stroke="none" paddingAngle={3}>
                                                {donutData.map((_, i) => (
                                                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<DonutTip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.45rem', overflow: 'hidden' }}>
                                    {donutData.slice(0, 6).map((d, i) => {
                                        const pct = expense > 0 ? ((d.value / expense) * 100).toFixed(0) : '0'
                                        return (
                                            <div key={i}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.2rem' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                                                    <span style={{ fontSize: '.73rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{d.name}</span>
                                                    <span style={{ fontSize: '.7rem', fontWeight: 800, color: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }}>{pct}%</span>
                                                </div>
                                                <div className="progress-track" style={{ height: 3, marginLeft: 13 }}>
                                                    <div className="progress-fill" style={{ width: `${pct}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Bar chart 6 months ── */}
                    {barData.length > 1 && (
                        <div className="card fade-up" style={{ animationDelay: '.2s' }}>
                            <p className="section-title">Histórico 6 meses</p>
                            <div style={{ height: 150 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} barGap={3} barCategoryGap="28%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,30,63,.8)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                                        <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(124,58,237,.07)' }} />
                                        <Bar dataKey="income" name="Receita" fill="#10b981" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="expense" name="Despesa" fill="#f43f5e" radius={[5, 5, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '.5rem' }}>
                                {[['#10b981', 'Receita'], ['#f43f5e', 'Despesa']].map(([c, l]) => (
                                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--muted)' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Recurring summary pill ── */}
                    {recurring > 0 && (
                        <div className="card fade-up" style={{
                            animationDelay: '.22s', display: 'flex', alignItems: 'center', gap: '.85rem',
                            background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)'
                        }}>
                            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(124,58,237,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Repeat2 size={18} color="var(--brand-light)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '.78rem', color: 'var(--muted)', fontWeight: 600 }}>Despesas fixas no mês</p>
                                <p style={{ fontWeight: 800, color: 'var(--brand-light)' }}>{fmt(recurring)}</p>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '.75rem', fontWeight: 700, color: 'var(--muted)' }}>
                                {expense > 0 ? ((recurring / expense) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                    )}

                    {/* empty */}
                    {transactions.length === 0 && (
                        <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
                            <Wallet size={44} color="var(--muted)" strokeWidth={1.2} />
                            <div>
                                <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '.3rem' }}>Nenhuma transação</p>
                                <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Adicione sua primeira receita ou despesa clicando no + abaixo</p>
                            </div>
                        </div>
                    )}
                </main>

            ) : tab === 'categories' ? (
                /* ════════════ CATEGORIES ════════════ */
                <main style={{ padding: '0 1.1rem', display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.1rem .75rem', borderBottom: '1px solid var(--border)' }}>
                            <p className="section-title" style={{ margin: 0 }}>Breakdown de despesas</p>
                        </div>
                        {donutData.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>Sem despesas neste período</div>
                        ) : donutData.map((d, i) => {
                            const pct = expense > 0 ? (d.value / expense) * 100 : 0
                            return (
                                <div key={d.name} className="tx-row fade-up" style={{ animationDelay: `${i * .04}s`, flexDirection: 'column', alignItems: 'stretch', gap: '.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${DONUT_COLORS[i % DONUT_COLORS.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length], display: 'inline-block' }} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{d.name}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: 800, fontSize: '.88rem', color: 'var(--danger)' }}>{fmt(d.value)}</p>
                                            <p style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{pct.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                    <div className="progress-track" style={{ marginLeft: 0 }}>
                                        <div className="progress-fill" style={{ width: `${pct}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </main>

            ) : (
                /* ════════════ TRANSACTIONS ════════════ */
                <main style={{ padding: '0 1.1rem' }}>
                    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.1rem .6rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p className="section-title" style={{ margin: 0 }}>Lançamentos</p>
                            <span style={{ fontSize: '.73rem', color: 'var(--muted)', background: 'var(--surface2)', padding: '.2rem .6rem', borderRadius: 6 }}>{transactions.length}</span>
                        </div>
                        {transactions.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', padding: '2.5rem 1rem', color: 'var(--muted)', textAlign: 'center' }}>
                                <ListOrdered size={32} strokeWidth={1.5} />
                                <p style={{ fontSize: '.875rem' }}>Sem transações neste período</p>
                            </div>
                        ) : transactions.map((tx, i) => {
                            const isInc = tx.type === 'income'
                            const cat = (tx.categories as Category | undefined)?.name ?? 'Sem categoria'
                            return (
                                <div key={tx.id} className="tx-row fade-up" style={{ animationDelay: `${i * .025}s` }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                                        background: isInc ? 'rgba(16,185,129,.15)' : 'rgba(244,63,94,.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {isInc ? <TrendingUp size={17} color="var(--success)" /> : <TrendingDown size={17} color="var(--danger)" />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                                            <p style={{ fontWeight: 700, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</p>
                                            {tx.is_recurring && <Repeat2 size={11} color="var(--brand-light)" />}
                                        </div>
                                        <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tx.description || new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontWeight: 800, fontSize: '.87rem', color: isInc ? 'var(--success)' : 'var(--danger)' }}>
                                            {isInc ? '+' : '-'}{fmt(Number(tx.amount))}
                                        </p>
                                        <p style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                                            {new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </main>
            )}

            {/* ── FAB ── */}
            <Link href="/transactions/new" className="fab" id="fab-add" aria-label="Nova transação">
                <Plus size={26} color="white" />
            </Link>

            {/* ── Bottom Nav ── */}
            <nav className="bottom-nav">
                {([
                    ['overview', '📊', 'Geral'],
                    ['categories', '🏷️', 'Categorias'],
                    ['transactions', '📋', 'Lançamentos'],
                ] as const).map(([t, emoji, label]) => (
                    <button key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{emoji}</span>
                        {label}
                    </button>
                ))}
                <Link href="/transactions/new" className="nav-item">
                    <Plus size={20} />Adicionar
                </Link>
            </nav>
        </div>
    )
}
