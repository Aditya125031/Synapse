"use client"

import Link from 'next/link'
import LiveEditor from '@/components/editor/LiveEditor'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import { useState, useEffect } from 'react'
import { Search, Bell, CloudLightning, BookOpen, ChevronRight, Hash, Settings, LogOut, X, Folder } from 'lucide-react'
import { sb as supabase } from '@/lib/supabase'

export default function Dashboard() {
    const [courses, setCourses] = useState<{ id: string, name: string }[]>([])
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
    const [isChapterModalOpen, setIsChapterModalOpen] = useState(false)
    const [newCourseForm, setNewCourseForm] = useState({ name: '', semester: '' })
    const [newChapterForm, setNewChapterForm] = useState({ name: '' })

    useEffect(() => {
        const fetchCourses = async () => {
            const { data, error } = await supabase
                .from('courses')
                .select('id, name');

            if (error) {
                console.error("Error fetching courses:", error);
                return;
            }

            if (data) {
                setCourses(data);
                // Auto-select the first course if it exists
                if (data.length > 0 && !activeCourseId) {
                    setActiveCourseId(data[0].id);
                }
            }
        };

        fetchCourses();
    }, []); // Empty dependency array means this runs once on mount

    const handleCreateCourse = async () => {
        try {
            // 1. Get the current user's secure token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                alert("You must be logged in!");
                return;
            }

            const res = await fetch("http://localhost:8000/api/courses/create-course", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 2. Attach the token to bypass the 401 block
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify(newCourseForm)
            });

            if (res.ok) {
                setIsCourseModalOpen(false);
                setNewCourseForm({ name: '', semester: '' });
                alert("Course Created!");
            } else {
                const err = await res.json();
                alert(err.detail);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateChapter = async () => {
        if (!activeCourseId) {
            alert("Please select or create a course first.");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                alert("You must be logged in!");
                return;
            }

            const res = await fetch("http://localhost:8000/api/courses/create-chapter", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    name: newChapterForm.name,
                    course_id: activeCourseId // <-- Using the actual UUID now
                })
            });

            if (res.ok) {
                setIsChapterModalOpen(false);
                setNewChapterForm({ name: '' });
                alert("Chapter Created!");
            } else {
                const err = await res.json();
                alert(err.detail);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="h-screen w-full bg-[#050508] text-white flex overflow-hidden font-sans">

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

                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-300/50 uppercase tracking-widest mb-3 px-2">
                            <span className="flex items-center"><BookOpen className="w-3.5 h-3.5 mr-2" /> Current Semester</span>
                            <button
                                onClick={() => setIsCourseModalOpen(true)}
                                className="hover:text-cyan-400 transition-colors p-1"
                                title="Create New Course"
                            >
                                +
                            </button>
                        </div>

                        <div className="space-y-1">
                            {courses.map(course => (
                                <div
                                    key={course.id}
                                    onClick={() => setActiveCourseId(course.id)}
                                    className={`px-4 py-2 my-1 mx-2 rounded-lg cursor-pointer flex items-center justify-between group ${
                                        activeCourseId === course.id
                                            ? 'bg-white/5 border border-white/10'
                                            : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                                    } transition-all`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Folder className={`w-4 h-4 ${activeCourseId === course.id ? 'text-cyan-400' : 'text-white/40'}`} />
                                        <span className={`text-sm font-medium ${activeCourseId === course.id ? 'text-white' : 'text-white/60'}`}>
                                            {course.name}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Nested Chapters (shown for active course) */}
                            {activeCourseId && (
                                <div className="pl-4 pr-2 py-2 space-y-1 border-l-2 border-white/5 ml-4 mt-1">

                                    {/* Create Chapter Button */}
                                    <button
                                        onClick={() => setIsChapterModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-white/20 text-white/40 hover:text-white/80 hover:border-white/40 transition-all mb-2"
                                    >
                                        + Propose New Chapter
                                    </button>
                                </div>
                            )}
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
                            <Link href="/dashboard/profile" className="text-white/40 hover:text-white transition-colors">
                                <Settings className="w-4 h-4" />
                            </Link>
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">

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
                <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-hidden min-h-0">

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

            {/* Course Modal */}
            {isCourseModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-white/10 p-6 rounded-2xl w-96 relative">
                        <button onClick={() => setIsCourseModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-cyan-400">Create Course</h3>
                        <input
                            type="text" placeholder="Course Name (e.g., DBMS)"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-3 text-white focus:border-cyan-500 outline-none"
                            value={newCourseForm.name} onChange={e => setNewCourseForm({ ...newCourseForm, name: e.target.value })}
                        />
                        <input
                            type="text" placeholder="Semester (e.g., 4th Sem)"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-4 text-white focus:border-cyan-500 outline-none"
                            value={newCourseForm.semester} onChange={e => setNewCourseForm({ ...newCourseForm, semester: e.target.value })}
                        />
                        <button
                            onClick={handleCreateCourse}
                            className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors"
                        >
                            Submit (1 per 30 Days)
                        </button>
                    </div>
                </div>
            )}

            {/* Chapter Modal */}
            {isChapterModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-white/10 p-6 rounded-2xl w-96 relative">
                        <button onClick={() => setIsChapterModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-indigo-400">Propose Chapter</h3>
                        <input
                            type="text" placeholder="Chapter Name (e.g., Normalization)"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-4 text-white focus:border-indigo-500 outline-none"
                            value={newChapterForm.name} onChange={e => setNewChapterForm({ ...newChapterForm, name: e.target.value })}
                        />
                        <button
                            onClick={handleCreateChapter}
                            className="w-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 py-2 rounded-lg hover:bg-indigo-500/30 transition-colors"
                        >
                            Submit (1 per 14 Days)
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}