"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { sb as supabase } from '@/lib/supabase'

export default function CourseSettings() {
    const params = useParams()
    const courseId = params.courseId as string
    const [courseData, setCourseData] = useState<any>(null)

    useEffect(() => {
        const fetchCourse = async () => {
            const { data } = await supabase.from('courses').select('*').eq('id', courseId).single()
            if (data) setCourseData(data)
        }
        fetchCourse()
    }, [courseId])

    if (!courseData) return <div className="p-10 text-white">Loading settings...</div>

    return (
        <div className="p-10 bg-[#050508] min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-6 border-b border-white/10 pb-4">Course Settings</h1>
            
            <div className="max-w-2xl space-y-8">
                {/* General Info */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-semibold mb-4 text-cyan-400">General</h2>
                    <label className="block text-sm text-white/60 mb-1">Course Name</label>
                    <input 
                        type="text" defaultValue={courseData.title || courseData.name}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none mb-4"
                    />
                    <label className="block text-sm text-white/60 mb-1">Description</label>
                    <textarea 
                        defaultValue={courseData.description}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 outline-none mb-4 h-32"
                    />
                    <button className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-4 py-2 rounded-lg hover:bg-cyan-500/30">
                        Save Changes
                    </button>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-500/5 p-6 rounded-xl border border-red-500/20">
                    <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
                    <button className="bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors">
                        Delete Course
                    </button>
                </div>
            </div>
        </div>
    )
}
