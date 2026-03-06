'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Transaction, Category } from '@/lib/supabase'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area,
} from 'recharts'
import {
    TrendingUp, TrendingDown, Wallet, Plus,
    LogOut, ChevronLeft, ChevronRight, Repeat2,
    LayoutDashboard, ListOrdered, Settings,
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────── */
const DONUT_COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']

const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtShort = (v: number) => {
    if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
    return `R$${v.toFixed(0)}`
}

function getRange(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    return { start, end }
}

function monthName(year: number, month: number) {
    return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/* ─── types ───────────────────────────────────── */
type ChartEntry = { name: string; value: number }
type BarEntry = { label: string; income: number; expense: number }

/* ─── Custom Tooltip ──────────────────────────── */
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

/* ═══════════════════════════════════════════════ */
export default function DashboardPage() {
    const router = useRouter()
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [barData, setBarData] = useState<BarEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'overview' | 'transactions'>('overview')

    /* ── fetch current month + 6-month bar data ── */
    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const { start, end } = getRange(year, month)

        // 6 months history for bar chart
        const sixMonthsAgo = new Date(year, month - 7, 1).toISOString().split('T')[0]

        const [{ data: txData }, { data: allTx }] = await Promise.all([
            supabase
                .from('transactions')
                .select('*, categories(id, name, type)')
                .eq('user_id', user.id)
                .gte('date', start)
                .lte('date', end)
                .order('date', { ascending: false }),
            supabase
                .from('transactions')
                .select('amount, date, type')
                .eq('user_id', user.id)
                .gte('date', sixMonthsAgo)
                .lte('date', end),
        ])

        setTransactions(txData ?? [])

        // Build bar chart — last 6 months
        const map: Record<string, { income: number; expense: number }> = {}
            ; (allTx ?? []).forEach(t => {
                const d = new Date(t.date + 'T12:00')
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (!map[key]) map[key] = { income: 0, expense: 0 }
                if (t.type === 'income') map[key].income += Number(t.amount)
                else map[key].expense += Number(t.amount)
            })
        const bar: BarEntry[] = Object.keys(map).sort().slice(-6).map(k => {
            const [y, m] = k.split('-')
            const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short' })
            return { label, income: map[k].income, expense: map[k].expense }
        })
        setBarData(bar)
        setLoading(false)
    }, [year, month, router])

    useEffect(() => { fetchData() }, [fetchData])

    function prevMonth() {
        if (month === 1) { setYear(y => y - 1); setMonth(12) }
        else { setMonth(m => m - 1) }
    }
    function nextMonth() {
        if (month === 12) { setYear(y => y + 1); setMonth(1) }
        else { setMonth(m => m + 1) }
    }

    /* ── KPIs ── */
    const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const balance = income - expense
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((income - expense) / income) * 100)) : 0
    const expPct = income > 0 ? Math.min(100, (expense / income) * 100) : 0

    /* ── Donut data ── */
    const expMap: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const n = (t.categories as Category | undefined)?.name ?? 'Outros'
        expMap[n] = (expMap[n] ?? 0) + Number(t.amount)
    })
    const donutData: ChartEntry[] = Object.entries(expMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }))

    /* ── Totals for recurring ── */
    const recurring = transactions.filter(t => t.is_recurring).reduce((a, t) => a + Number(t.amount), 0)

    /* ══════════════════════════════════════════ */
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: '7rem' }}>

            {/* ─── Header ─── */}
            <header style={{
                background: 'linear-gradient(180deg, rgba(124,58,237,.18) 0%, transparent 100%)',
                padding: '3rem 1.1rem 1.25rem',
                position: 'sticky', top: 0, zIndex: 30,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                        <p style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-.02em' }}>
                            <span style={{ background: 'linear-gradient(90deg,#a78bfa,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Finanças
                            </span>Pro
                        </p>
                        <p className="stat-label" style={{ marginTop: '.1rem' }}>visão geral</p>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
                        className="btn-ghost" style={{ padding: '.55rem .75rem' }}>
                        <LogOut size={15} />
                    </button>
                </div>

                {/* Month Nav */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '.5rem .75rem'
                }}>
                    <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <p style={{ fontWeight: 700, fontSize: '.95rem', textTransform: 'capitalize' }}>{monthName(year, month)}</p>
                    <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </header>

            {/* ─── Tab Toggle ─── */}
            <div style={{ padding: '0 1.1rem .75rem' }}>
                <div className="tab-group">
                    <button className="tab-btn" onClick={() => setTab('overview')}
                        style={{
                            background: tab === 'overview' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                            color: tab === 'overview' ? '#fff' : 'var(--muted)'
                        }}>
                        Visão Geral
                    </button>
                    <button className="tab-btn" onClick={() => setTab('transactions')}
                        style={{
                            background: tab === 'transactions' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                            color: tab === 'transactions' ? '#fff' : 'var(--muted)'
                        }}>
                        Transações
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
                    <div className="spinner-lg" />
                </div>
            ) : tab === 'overview' ? (
                /* ──────────── OVERVIEW TAB ──────────── */
                <main style={{ padding: '0 1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* KPI Cards row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                        {/* Balance — spans full */}
                        <div className="card fade-up" style={{
                            gridColumn: '1/-1',
                            background: 'linear-gradient(135deg, rgba(124,58,237,.2) 0%, rgba(168,85,247,.1) 100%)',
                            border: '1px solid rgba(124,58,237,.35)',
                        }}>
                            <p className="stat-label">Saldo do mês</p>
                            <p className="stat-value" style={{
                                fontSize: '2rem',
                                background: balance >= 0
                                    ? 'linear-gradient(90deg,#10b981,#34d399)'
                                    : 'linear-gradient(90deg,#f43f5e,#fb923c)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>{fmt(balance)}</p>
                            {/* Progress bar */}
                            <div style={{ marginTop: '.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem' }}>
                                    <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Gasto de receita</span>
                                    <span style={{ fontSize: '.72rem', fontWeight: 700, color: expPct > 80 ? 'var(--danger)' : 'var(--success)' }}>{expPct.toFixed(0)}%</span>
                                </div>
                                <div className="progress-track">
                                    <div className="progress-fill" style={{
                                        width: `${expPct}%`,
                                        background: expPct > 80
                                            ? 'linear-gradient(90deg,#f43f5e,#fb923c)'
                                            : 'linear-gradient(90deg,#10b981,#34d399)',
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Income */}
                        <div className="card fade-up" style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,.15) 0%, rgba(5,150,105,.08) 100%)',
                            border: '1px solid rgba(16,185,129,.25)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--success-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendingUp size={14} color="var(--success)" />
                                </div>
                                <p className="stat-label">Receitas</p>
                            </div>
                            <p className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--success)' }}>{fmt(income)}</p>
                        </div>

                        {/* Expense */}
                        <div className="card fade-up" style={{
                            background: 'linear-gradient(135deg, rgba(244,63,94,.15) 0%, rgba(220,38,38,.08) 100%)',
                            border: '1px solid rgba(244,63,94,.25)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--danger-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendingDown size={14} color="var(--danger)" />
                                </div>
                                <p className="stat-label">Despesas</p>
                            </div>
                            <p className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--danger)' }}>{fmt(expense)}</p>
                        </div>

                        {/* Savings rate */}
                        <div className="card fade-up" style={{ gridColumn: '1/-1', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <p className="stat-label">Taxa de poupança</p>
                                <p className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--brand-light)' }}>{savingsRate.toFixed(1)}%</p>
                                <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.2rem' }}>
                                    Fixas: {fmt(recurring)}
                                </p>
                            </div>
                            <div style={{ width: 70, height: 70 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[{ value: savingsRate }, { value: 100 - savingsRate }]}
                                            cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                                            <Cell fill="#7c3aed" />
                                            <Cell fill="rgba(30,30,63,.6)" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ── Donut Chart ── */}
                    {donutData.length > 0 && (
                        <div className="card fade-up">
                            <p className="section-title">Despesas por Categoria</p>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                                                dataKey="value" stroke="none" paddingAngle={2}>
                                                {donutData.map((_, i) => (
                                                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<DonutTip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.5rem', overflow: 'hidden' }}>
                                    {donutData.slice(0, 6).map((d, i) => {
                                        const pct = expense > 0 ? ((d.value / expense) * 100).toFixed(0) : '0'
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                                                <span style={{ flex: 1, fontSize: '.75rem', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                                                <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>{pct}%</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Bar Chart: 6 months ── */}
                    {barData.length > 1 && (
                        <div className="card fade-up">
                            <p className="section-title">Últimos 6 meses</p>
                            <div style={{ height: 150 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} barGap={4} barCategoryGap="30%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,30,63,.8)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
                                        <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(124,58,237,.07)' }} />
                                        <Bar dataKey="income" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="expense" name="Despesa" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '.5rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--muted)' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />Receita
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--muted)' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f43f5e', display: 'inline-block' }} />Despesa
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ── Empty state ── */}
                    {transactions.length === 0 && (
                        <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
                            <Wallet size={40} color="var(--muted)" strokeWidth={1.5} />
                            <div>
                                <p style={{ fontWeight: 700, marginBottom: '.25rem' }}>Nenhuma transação</p>
                                <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Adicione sua primeira receita ou despesa</p>
                            </div>
                            <Link href="/transactions/new" className="btn-primary" style={{ width: 'auto', padding: '.7rem 1.5rem' }}>
                                <Plus size={16} /> Adicionar
                            </Link>
                        </div>
                    )}

                </main>
            ) : (
                /* ──────────── TRANSACTIONS TAB ──────────── */
                <main style={{ padding: '0 1.1rem' }}>
                    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.1rem .6rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p className="section-title" style={{ margin: 0 }}>Todas as transações</p>
                            <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{transactions.length} registros</span>
                        </div>
                        {transactions.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', padding: '2.5rem 1rem', color: 'var(--muted)', textAlign: 'center' }}>
                                <ListOrdered size={32} strokeWidth={1.5} />
                                <p style={{ fontSize: '.875rem' }}>Sem transações neste período</p>
                            </div>
                        ) : (
                            transactions.map((tx, i) => {
                                const isIncome = tx.type === 'income'
                                const cat = (tx.categories as Category | undefined)?.name ?? 'Sem categoria'
                                return (
                                    <div key={tx.id} className="tx-row fade-up" style={{ animationDelay: `${i * 0.025}s` }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                                            background: isIncome ? 'var(--success-dim)' : 'var(--danger-dim)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {isIncome
                                                ? <TrendingUp size={17} color="var(--success)" />
                                                : <TrendingDown size={17} color="var(--danger)" />
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                                <p style={{ fontWeight: 600, fontSize: '.87rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</p>
                                                {tx.is_recurring && (
                                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                                        <Repeat2 size={12} color="var(--brand-light)" />
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {tx.description || new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: '.87rem', color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
                                                {isIncome ? '+' : '-'}{fmt(Number(tx.amount))}
                                            </p>
                                            <p style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                                                {new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </main>
            )}

            {/* ─── FAB ─── */}
            <Link href="/transactions/new" className="fab" id="fab-add" aria-label="Nova transação">
                <Plus size={24} color="white" />
            </Link>

            {/* ─── Bottom Nav ─── */}
            <nav className="bottom-nav">
                <button className={`nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
                    <LayoutDashboard size={20} />
                    Dashboard
                </button>
                <button className={`nav-item ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>
                    <ListOrdered size={20} />
                    Transações
                </button>
                <Link href="/transactions/new" className="nav-item">
                    <Plus size={20} />
                    Adicionar
                </Link>
            </nav>
        </div>
    )
}
