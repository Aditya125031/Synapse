"use client"

import LiveEditor from '@/components/editor/LiveEditor'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import { useState } from 'react'
import { Search, Bell, CloudLightning, BookOpen, ChevronRight, Hash, Settings, LogOut } from 'lucide-react'

export default function Dashboard() {
    const [activeCourse, setActiveCourse] = useState("dbms")

    return (
        <div className="min-h-screen bg-[#050508] text-white flex overflow-hidden font-sans">

            {/* LEFT SIDEBAR */}
            <aside className="w-72 border-r border-white/10 bg-[#050508] flex flex-col relative z-20">
                {/* Brand */}
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_12px_rgba(34,211,238,0.6)] mr-3"></div>
                    <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-white to-white/50 text-transparent bg-clip-text">
                        Synapse
                    </h2>
                </div>

                {/* Course Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">

                    {/* Course 1 */}
                    <div>
                        <div className="flex items-center text-xs font-bold text-indigo-300/50 uppercase tracking-widest mb-3 px-2">
                            <BookOpen className="w-3.5 h-3.5 mr-2" /> Current Semester
                        </div>

                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveCourse("dbms")}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${activeCourse === "dbms" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                            >
                                <span className="truncate">Database Management</span>
                                <ChevronRight className={`w-4 h-4 transition-transform ${activeCourse === "dbms" ? "rotate-90 text-cyan-400" : ""}`} />
                            </button>

                            {/* Nested Chapters (Only show if DBMS is active) */}
                            {activeCourse === "dbms" && (
                                <div className="pl-4 pr-2 py-2 space-y-1 border-l-2 border-white/5 ml-4 mt-1">
                                    <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm bg-indigo-500/10 text-indigo-200 border border-indigo-500/20">
                                        <span className="flex items-center gap-2"><Hash className="w-3 h-3" /> Normalization</span>
                                        <span className="flex items-center gap-1 text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded-md"><CloudLightning className="w-3 h-3" /> 12 Active</span>
                                    </button>
                                    <button className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white/80 transition-colors">
                                        <span className="flex items-center gap-2"><Hash className="w-3 h-3" /> Relational Algebra</span>
                                    </button>
                                    <button className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white/80 transition-colors">
                                        <span className="flex items-center gap-2"><Hash className="w-3 h-3" /> Concurrency Control</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1 mt-1">
                            <button
                                onClick={() => setActiveCourse("dld")}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${activeCourse === "dld" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                            >
                                <span className="truncate">Digital Logic Design</span>
                                <ChevronRight className={`w-4 h-4 transition-transform ${activeCourse === "dld" ? "rotate-90 text-cyan-400" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom User Area */}
                <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Demo User</p>
                            <p className="text-xs text-cyan-400 font-semibold truncate">420 CQ Points</p>
                        </div>
                        <button className="text-white/40 hover:text-white transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col relative z-10 h-screen">

                {/* TOP HEADER */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-50">

                    {/* Global Search */}
                    <div className="flex-1 max-w-xl relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search the collective graph (concepts, doubts, notes)..."
                            className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                        />
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-4 ml-6">
                        <div className="flex items-center gap-2 text-xs font-medium text-white/50 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <CloudLightning className="w-3.5 h-3.5 text-indigo-400" />
                            Hive Sync: <span className="text-white">Active</span>
                        </div>
                        <button className="relative p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050508]"></span>
                        </button>
                    </div>
                </header>

                {/* WORKSPACE AREA (Split Screen) */}
                <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-hidden">

                    {/* LEFT: Editor Panel */}
                    <div className="h-full">
                        <LiveEditor />
                    </div>

                    {/* RIGHT: Graph Panel */}
                    <div className="h-full">
                        <KnowledgeGraph />
                    </div>

                </div>
            </main>
        </div>
    )
}