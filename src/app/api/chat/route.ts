import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { message, context, history } = body as {
            message: string
            context: FinancialContext
            history: { role: string; text: string }[]
        }

        const systemPrompt = buildSystemPrompt(context)

        // Build contents array with full conversation history
        const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Entendido! Analisei seus dados financeiros e estou pronto para ajudar com recomendações personalizadas. Como posso ajudar?' }] },
            ...history.map(h => ({
                role: h.role as 'user' | 'model',
                parts: [{ text: h.text }],
            })),
            { role: 'user', parts: [{ text: message }] },
        ]

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents,
            config: {
                maxOutputTokens: 800,
                temperature: 0.7,
            },
        })

        const reply = response.text ?? '(sem resposta)'
        return NextResponse.json({ reply })

    } catch (err: any) {
        console.error('Gemini error:', err)
        return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
    }
}

type FinancialContext = {
    income: number
    expense: number
    invested: number
    balance: number
    savingsRate: number
    expenseRate: number
    month: string
    topCategories: { name: string; amount: number }[]
    portfolio: { ticker: string; quantity: number; avgPrice: number; assetType: string }[]
}

function buildSystemPrompt(ctx: FinancialContext): string {
    const portfolioStr = ctx.portfolio.length > 0
        ? ctx.portfolio.map(p => `  - ${p.ticker} (${p.assetType}): ${p.quantity} cotas, preço médio R$${p.avgPrice.toFixed(2)}`).join('\n')
        : '  (Carteira vazia — nenhum ativo cadastrado ainda)'

    const categoriesStr = ctx.topCategories.length > 0
        ? ctx.topCategories.slice(0, 6).map(c => `  - ${c.name}: R$${c.amount.toFixed(2)}`).join('\n')
        : '  (Sem despesas no mês)'

    return `Você é a FinanceIA, assistente financeira pessoal do aplicativo FinançasPro. Você é especialista em finanças pessoais, mercado brasileiro (B3, FIIs, Tesouro Direto) e educação financeira.

DADOS FINANCEIROS DO USUÁRIO — ${ctx.month}:
• Receita:      R$${ctx.income.toFixed(2)}
• Despesas:     R$${ctx.expense.toFixed(2)} (${ctx.expenseRate.toFixed(0)}% da receita)
• Investimentos: R$${ctx.invested.toFixed(2)} (${(ctx.invested > 0 && ctx.income > 0 ? (ctx.invested / ctx.income * 100) : 0).toFixed(0)}% da receita)
• Saldo livre:  R$${ctx.balance.toFixed(2)}
• Taxa de poupança: ${ctx.savingsRate.toFixed(1)}%

PRINCIPAIS CATEGORIAS DE GASTOS:
${categoriesStr}

CARTEIRA DE INVESTIMENTOS:
${portfolioStr}

INSTRUÇÕES:
- Responda SEMPRE em português do Brasil, de forma clara e acessível
- Dê recomendações PERSONALIZADAS baseadas nos dados acima
- Para sugestões de ativos, use dados reais do mercado brasileiro (B3, FIIs, ETFs como IVVB11, BOVA11)
- Seja direto: dê recomendações concretas, não genéricas
- Use emojis com moderação para tornar a resposta mais visual
- Para economia de dinheiro, analise as categorias de gastos e sugira cortes específicos
- Respostas concisas (máx 300 palavras) mas completas
- Sempre inclua ao final: "⚠️ Sugestões geradas por IA. Não constituem recomendação financeira profissional regulamentada pela CVM."

Responda a pergunta do usuário com base nesses dados.`
}
