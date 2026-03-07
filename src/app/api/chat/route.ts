import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
const GROQ_MODEL = 'llama-3.3-70b-versatile' // Fast, free, excellent quality
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, context, history } = body as {
            message: string
            context: FinancialContext
            history: { role: string; text: string }[]
        }

        const systemPrompt = buildSystemPrompt(context)

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
            { role: 'user', content: message },
        ]

        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                max_tokens: 800,
                temperature: 0.7,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            return NextResponse.json({ error: JSON.stringify(data.error ?? data) }, { status: res.status })
        }

        const reply: string = data.choices?.[0]?.message?.content ?? '(sem resposta)'
        return NextResponse.json({ reply })

    } catch (err: any) {
        console.error('Groq error:', err)
        return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
    }
}

type FinancialContext = {
    income: number; expense: number; invested: number; balance: number
    savingsRate: number; expenseRate: number; month: string
    topCategories: { name: string; amount: number }[]
    portfolio: { ticker: string; quantity: number; avgPrice: number; assetType: string }[]
}

function buildSystemPrompt(ctx: FinancialContext): string {
    const portfolioStr = ctx.portfolio.length > 0
        ? ctx.portfolio.map(p => `  - ${p.ticker} (${p.assetType}): ${p.quantity} cotas, preço médio R$${p.avgPrice.toFixed(2)}`).join('\n')
        : '  (Carteira vazia)'

    const categoriesStr = ctx.topCategories.length > 0
        ? ctx.topCategories.slice(0, 6).map(c => `  - ${c.name}: R$${c.amount.toFixed(2)}`).join('\n')
        : '  (Sem despesas no mês)'

    return `Você é a FinanceIA, assistente financeira pessoal do FinançasPro. Especialista em finanças pessoais e mercado brasileiro (B3, FIIs, Tesouro Direto).

DADOS DO USUÁRIO — ${ctx.month}:
• Receita: R$${ctx.income.toFixed(2)}
• Despesas: R$${ctx.expense.toFixed(2)} (${ctx.expenseRate.toFixed(0)}% da receita)
• Investimentos: R$${ctx.invested.toFixed(2)}
• Saldo livre: R$${ctx.balance.toFixed(2)}
• Taxa de poupança: ${ctx.savingsRate.toFixed(1)}%

GASTOS POR CATEGORIA:
${categoriesStr}

CARTEIRA:
${portfolioStr}

INSTRUÇÕES:
- Responda SEMPRE em português do Brasil
- Recomendações PERSONALIZADAS baseadas nos dados acima
- Máximo 300 palavras, direto e útil
- Use emojis com moderação
- Sempre inclua ao final: "⚠️ Sugestões por IA. Não é recomendação financeira profissional (CVM)."`
}
