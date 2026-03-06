'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { ArrowLeft, DollarSign, Calendar, Tag, AlignLeft, Repeat2 } from 'lucide-react'

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
        async function loadCategories() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.replace('/login'); return }

            const { data } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', type)
                .order('name')

            setCategories(data ?? [])
            setCategoryId('')
        }
        loadCategories()
    }, [type, router])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        const parsedAmount = parseFloat(amount.replace(',', '.'))
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Insira um valor válido maior que zero.')
            return
        }
        if (!categoryId) {
            setError('Selecione uma categoria.')
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const { error: dbError } = await supabase.from('transactions').insert({
            user_id: user.id,
            amount: parsedAmount,
            date,
            category_id: categoryId,
            description: description || null,
            is_recurring: type === 'expense' ? isRecurring : false,
            type,
        })

        if (dbError) {
            setError('Erro ao salvar. Tente novamente.')
            setLoading(false)
        } else {
            router.replace('/dashboard')
        }
    }

    const filteredCats = categories.filter(c => c.type === type)

    return (
        <div className="min-h-screen px-4 py-6 fade-in" style={{ background: 'var(--color-bg)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8 pt-6">
                <button onClick={() => router.back()} className="btn-ghost !p-2.5" aria-label="Voltar">
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-xl font-bold">Nova Transação</h1>
            </div>

            {/* Type Toggle */}
            <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {(['expense', 'income'] as TxType[]).map(t => (
                    <button
                        key={t}
                        id={`toggle-${t}`}
                        onClick={() => setType(t)}
                        className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all"
                        style={{
                            background: type === t ? (t === 'income' ? '#16a34a' : '#dc2626') : 'transparent',
                            color: type === t ? 'white' : 'var(--color-muted)',
                        }}
                    >
                        {t === 'income' ? '🟢 Receita' : '🔴 Despesa'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Valor (R$)</label>
                    <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            id="tx-amount"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            required
                            className="input pl-9"
                            placeholder="0,00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Data</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            id="tx-date"
                            type="date"
                            required
                            className="input pl-9"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Categoria</label>
                    <div className="relative">
                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            id="tx-category"
                            required
                            className="input pl-9 appearance-none"
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                        >
                            <option value="" disabled>Selecione uma categoria</option>
                            {filteredCats.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Descrição <span className="text-gray-500">(opcional)</span></label>
                    <div className="relative">
                        <AlignLeft size={16} className="absolute left-3 top-3.5 text-gray-500" />
                        <textarea
                            id="tx-description"
                            rows={2}
                            className="input pl-9 resize-none"
                            placeholder="Ex: conta de luz de março..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                {/* Recurring (only for expense) */}
                {type === 'expense' && (
                    <label htmlFor="tx-recurring" className="flex items-center gap-3 card cursor-pointer select-none">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Repeat2 size={16} className="text-indigo-400" />
                                <span className="text-sm font-medium text-gray-200">Despesa Fixa / Recorrente</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 ml-6">Aluguel, assinatura, parcela, etc.</p>
                        </div>
                        <div className="relative flex-shrink-0">
                            <input
                                id="tx-recurring"
                                type="checkbox"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="sr-only"
                            />
                            <div
                                className="w-11 h-6 rounded-full transition-colors flex items-center"
                                style={{ background: isRecurring ? '#6366f1' : '#374151' }}
                            >
                                <div
                                    className="w-4 h-4 bg-white rounded-full shadow transition-transform mx-1"
                                    style={{ transform: isRecurring ? 'translateX(20px)' : 'translateX(0)' }}
                                />
                            </div>
                        </div>
                    </label>
                )}

                {/* Error */}
                {error && (
                    <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2.5">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button id="tx-submit" type="submit" className="btn-primary mt-2" disabled={loading}>
                    {loading ? <div className="spinner" /> : `Salvar ${type === 'income' ? 'Receita' : 'Despesa'}`}
                </button>
            </form>
        </div>
    )
}
