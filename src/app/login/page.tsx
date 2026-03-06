'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

        if (authError) {
            setError('E-mail ou senha inválidos. Tente novamente.')
        } else {
            router.replace('/dashboard')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 fade-in" style={{ background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #030712 60%)' }}>
            {/* Brand */}
            <div className="mb-8 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }}>
                    <TrendingUp size={32} color="white" />
                </div>
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">FinançasPro</h1>
                    <p className="text-gray-400 text-sm mt-1">Controle financeiro pessoal</p>
                </div>
            </div>

            {/* Card */}
            <div className="card w-full max-w-sm fade-in" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-xl font-semibold mb-1">Entrar na conta</h2>
                <p className="text-sm text-gray-400 mb-6">Insira suas credenciais para acessar</p>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">E-mail</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                id="login-email"
                                type="email"
                                required
                                className="input pl-10"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Senha */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">Senha</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                id="login-password"
                                type={showPass ? 'text' : 'password'}
                                required
                                className="input pl-10 pr-10"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2.5">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button id="login-submit" type="submit" className="btn-primary mt-1" disabled={loading}>
                        {loading ? <div className="spinner" /> : 'Entrar'}
                    </button>
                </form>
            </div>

            <p className="text-gray-600 text-xs mt-8">
                Acesso restrito · Dados protegidos por RLS
            </p>
        </div>
    )
}
