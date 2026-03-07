import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GEMINI_API_KEY ?? ''

export async function GET(_req: NextRequest) {
    // Try both v1 and v1beta
    const results: Record<string, any> = {}

    for (const ver of ['v1', 'v1beta']) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/${ver}/models?key=${API_KEY}`
            )
            const data = await res.json()
            results[ver] = {
                status: res.status,
                models: data.models?.map((m: any) => m.name) ?? data.error ?? data,
            }
        } catch (e: any) {
            results[ver] = { error: e.message }
        }
    }

    return NextResponse.json(results)
}
