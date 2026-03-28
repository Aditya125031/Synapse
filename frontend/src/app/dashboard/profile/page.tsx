"use client"

import { useState, useEffect } from 'react'
import { sb } from '@/lib/supabase'
import { User, Hash, BookOpen, MapPin, Phone, Save, GraduationCap } from 'lucide-react'

export default function Profile() {
    const [ld, setLd] = useState(false)
    const [f, setF] = useState({
        full_name: 'Shuvam Kayal',
        roll_no: 'CS24I1019',
        program: 'B.Tech + M.Tech CSE',
        grad_year: '2029',
        semester: '4',
        phone: '',
        hostel: 'Ashoka 1208'
    })

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await sb.auth.getSession()
            if (!session) return

            const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
            if (data) setF(data)
        }
        fetchProfile()
    }, [])

    const handleSave = async () => {
        setLd(true)
        const { data: { session } } = await sb.auth.getSession()
        if (!session) return

        const { error } = await sb.from('profiles').upsert({
            id: session.user.id,
            ...f,
            updated_at: new Date()
        })

        setLd(false)
        if (error) alert('Error saving profile')
        else alert('Profile synced successfully')
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setF({ ...f, [e.target.name]: e.target.value })
    }

    return (
        <div className="min-h-screen bg-[#050508] text-white p-8 font-sans">
            <div className="max-w-2xl mx-auto bg-white/[0.02] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-indigo-400 text-transparent bg-clip-text">
                    Synapse Identity
                </h2>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs text-white/50 flex items-center gap-2"><User className="w-3 h-3" /> Full Name</label>
                        <input name="full_name" value={f.full_name} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-white/50 flex items-center gap-2"><Hash className="w-3 h-3" /> Roll Number</label>
                        <input name="roll_no" value={f.roll_no} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-white/50 flex items-center gap-2"><BookOpen className="w-3 h-3" /> Program</label>
                        <input name="program" value={f.program} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-white/50 flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Grad Year</label>
                        <input name="grad_year" value={f.grad_year} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-white/50 flex items-center gap-2"><Hash className="w-3 h-3" /> Semester</label>
                        <input name="semester" value={f.semester} onChange={handleChange} type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-white/50 flex items-center gap-2"><Phone className="w-3 h-3" /> Phone</label>
                        <input name="phone" value={f.phone} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="space-y-1 col-span-2">
                        <label className="text-xs text-white/50 flex items-center gap-2"><MapPin className="w-3 h-3" /> Hostel Room</label>
                        <input name="hostel" value={f.hostel} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>
                </div>

                <div className="mt-8 flex justify-end border-t border-white/10 pt-6">
                    <button onClick={handleSave} disabled={ld} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg text-sm font-semibold transition-all">
                        <Save className="w-4 h-4" /> {ld ? 'Syncing...' : 'Save Identity'}
                    </button>
                </div>
            </div>
        </div>
    )
}