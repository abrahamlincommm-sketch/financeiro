'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
    TrendingUp, TrendingDown, Wallet, Plus,
    LogOut, RefreshCw, ChevronRight, Repeat2
} from 'lucide-react'

const CHART_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ec4899',
    '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
]

function formatCurrency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getMonthRange() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    return { start, end }
}

function monthLabel() {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function DashboardPage() {
    const router = useRouter()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [userEmail, setUserEmail] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { start, end } = getMonthRange()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        setUserEmail(user.email ?? '')

        const [{ data: txData }, { data: catData }] = await Promise.all([
            supabase
                .from('transactions')
                .select('*, categories(id, name, type)')
                .eq('user_id', user.id)
                .gte('date', start)
                .lte('date', end)
                .order('date', { ascending: false }),

            supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('name'),
        ])

        setTransactions(txData ?? [])
        setCategories(catData ?? [])
        setLoading(false)
    }, [router])

    useEffect(() => { fetchData() }, [fetchData])

    async function handleLogout() {
        await supabase.auth.signOut()
        router.replace('/login')
    }

    // Summary calcs
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const balance = totalIncome - totalExpense

    // Donut chart data: group expenses by category
    const expenseMap: Record<string, number> = {}
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const catName = (t.categories as Category | undefined)?.name ?? 'Outros'
            expenseMap[catName] = (expenseMap[catName] ?? 0) + Number(t.amount)
        })
    const chartData = Object.entries(expenseMap).map(([name, value]) => ({ name, value }))

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload?.length) {
            return (
                <div className="card !py-2 !px-3 text-sm">
                    <p className="font-semibold">{payload[0].name}</p>
                    <p style={{ color: CHART_COLORS[0] }}>{formatCurrency(payload[0].value)}</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
            {/* Header */}
            <header className="sticky top-0 z-20 px-4 pt-12 pb-4" style={{ background: 'linear-gradient(to bottom, #030712 85%, transparent)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Dashboard</p>
                        <p className="text-sm text-gray-400 capitalize">{monthLabel()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData} className="btn-ghost !px-2.5 !py-2.5" aria-label="Atualizar">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={handleLogout} className="btn-ghost !px-2.5 !py-2.5" aria-label="Sair">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-4 flex flex-col gap-5 fade-in">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="card col-span-1 !p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp size={14} className="badge-income" />
                            <span className="text-xs text-gray-400">Receitas</span>
                        </div>
                        <p className="text-green-400 font-bold text-base leading-tight">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="card col-span-1 !p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <TrendingDown size={14} className="badge-expense" />
                            <span className="text-xs text-gray-400">Despesas</span>
                        </div>
                        <p className="text-red-400 font-bold text-base leading-tight">{formatCurrency(totalExpense)}</p>
                    </div>
                    <div className="card col-span-1 !p-3 flex flex-col gap-1" style={{ borderColor: balance >= 0 ? '#16a34a44' : '#dc262644' }}>
                        <div className="flex items-center gap-1.5">
                            <Wallet size={14} style={{ color: balance >= 0 ? '#22c55e' : '#ef4444' }} />
                            <span className="text-xs text-gray-400">Saldo</span>
                        </div>
                        <p className={`font-bold text-base leading-tight ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(balance)}</p>
                    </div>
                </div>

                {/* Donut Chart */}
                {chartData.length > 0 && (
                    <div className="card">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3">Despesas por Categoria</h2>
                        <div className="flex items-center gap-4">
                            <div style={{ width: 130, height: 130 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" stroke="none">
                                            {chartData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                {chartData.map((d, i) => {
                                    const pct = totalExpense > 0 ? ((d.value / totalExpense) * 100).toFixed(0) : '0'
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="truncate text-gray-300">{d.name}</span>
                                            <span className="ml-auto text-gray-400 font-medium flex-shrink-0">{pct}%</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Transactions */}
                <div className="card !p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                        <h2 className="text-sm font-semibold text-gray-300">Últimas Transações</h2>
                        <span className="text-xs text-gray-500">{transactions.length} no mês</span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="spinner" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
                            <Wallet size={36} strokeWidth={1} />
                            <p className="text-sm">Nenhuma transação este mês</p>
                            <Link href="/transactions/new" className="btn-ghost text-xs !px-4 !py-2">
                                Adicionar primeira transação
                            </Link>
                        </div>
                    ) : (
                        <ul>
                            {transactions.slice(0, 20).map((tx, i) => (
                                <li
                                    key={tx.id}
                                    className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-900/50 transition-colors"
                                    style={{ animationDelay: `${i * 0.03}s` }}
                                >
                                    {/* Category icon circle */}
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-green-900/60' : 'bg-red-900/60'}`}>
                                        {tx.type === 'income'
                                            ? <TrendingUp size={15} className="text-green-400" />
                                            : <TrendingDown size={15} className="text-red-400" />
                                        }
                                    </div>
                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-medium text-gray-200 truncate">
                                                {(tx.categories as Category | undefined)?.name ?? 'Sem categoria'}
                                            </p>
                                            {tx.is_recurring && <Repeat2 size={12} className="text-indigo-400 flex-shrink-0" />}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {tx.description ?? new Date(tx.date + 'T12:00').toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    {/* Amount */}
                                    <p className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            {/* FAB - Add Transaction */}
            <Link
                href="/transactions/new"
                id="fab-add-transaction"
                className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}
                aria-label="Nova transação"
            >
                <Plus size={24} color="white" />
            </Link>
        </div>
    )
}
