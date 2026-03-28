"use client"

import { sb } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react'

export default function Landing() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    // Auto-redirect if already logged in
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
  }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        alert("Account initialized! You can now log in.")
        setIsSignUp(false)
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: any) {
      alert(err.message || "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  const loginGoogle = async () => {
    setLoading(true)
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      <div className="z-10 flex flex-col items-center w-full max-w-md px-6">
        <h1 className="text-5xl font-extrabold tracking-tighter mb-2 bg-gradient-to-br from-white via-indigo-200 to-cyan-500 text-transparent bg-clip-text">
          Synapse
        </h1>
        <p className="text-indigo-200/60 mb-8 text-center text-sm">Chronosync your collective intelligence.</p>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="w-full bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl flex flex-col gap-4 shadow-2xl">
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="email" required placeholder="Student Email" 
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="password" required placeholder="Password" 
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl font-medium transition-all flex justify-center items-center gap-2">
            {loading ? 'Processing...' : isSignUp ? <><UserPlus className="w-4 h-4"/> Initialize Account</> : <><LogIn className="w-4 h-4"/> Access Hive</>}
          </button>
        </form>

        <div className="mt-4 flex flex-col w-full gap-4">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-white/40 hover:text-white transition-colors text-center">
            {isSignUp ? "Already part of the collective? Log in." : "New to the network? Sign up."}
          </button>
          
          <div className="flex items-center gap-4 w-full">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs text-white/30 uppercase tracking-widest">OR</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button onClick={loginGoogle} disabled={loading} className="w-full py-3 bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 hover:from-cyan-600/40 hover:to-indigo-600/40 border border-cyan-500/30 rounded-xl text-sm font-medium transition-all text-cyan-100">
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}