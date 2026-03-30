'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Timeout de segurança: se o Supabase não responder em 6s, vai para /login
    const timeout = setTimeout(() => {
      router.replace('/login')
    }, 6000)

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout)
        if (error || !session) {
          router.replace('/login')
        } else {
          router.replace('/dashboard')
        }
      })
      .catch(() => {
        clearTimeout(timeout)
        router.replace('/login')
      })

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="spinner-lg" />
        <p style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 600 }}>Carregando…</p>
      </div>
    </div>
  )
}
