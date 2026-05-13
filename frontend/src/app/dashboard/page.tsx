"use client"

import Link from 'next/link'
import LiveEditor from '@/components/editor/LiveEditor'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import { useState, useEffect, useRef } from 'react'
import { Search, Bell, CloudLightning, BookOpen, ChevronRight, Hash, Users, FileText, X, Plus, ChevronDown, Trash2 } from 'lucide-react'
import { sb as supabase } from '@/lib/supabase'

export default function Dashboard() {
    // --- STATE ---
    const [classes, setClasses] = useState<{ id: string, name: string, role: string, join_code: string }[]>([])
    const [activeClassId, setActiveClassId] = useState<string | null>(null)
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
    const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false)
    const [isJoinClassModalOpen, setIsJoinClassModalOpen] = useState(false)
    const [newClassForm, setNewClassForm] = useState({ name: '', description: '' })
    const [joinCode, setJoinCode] = useState("")

    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false)

    const [courses, setCourses] = useState<{ id: string, name: string, semester: string }[]>([])
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
    const [newCourseForm, setNewCourseForm] = useState({ name: '', semester: '' })

    const [chapters, setChapters] = useState<{ id: string, name: string }[]>([])
    const [isChapterModalOpen, setIsChapterModalOpen] = useState(false)
    const [newChapterForm, setNewChapterForm] = useState({ name: '' })
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null)

    const [chapterNotes, setChapterNotes] = useState<{ id: string, title: string, user_id: string }[]>([])

    const [isSyncingNode, setIsSyncingNode] = useState(false)
    const editorRef = useRef<any>(null)

    // --- FETCH EFFECTS ---
    const fetchClasses = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch only APPROVED classes and get the join code!
        const { data, error } = await supabase.from('class_members')
            .select(`role, status, classes ( id, name, join_code )`)
            .eq('user_id', session.user.id)
            .eq('status', 'approved');

        if (data) {
            const formattedClasses = data.map((item: any) => ({
                id: item.classes.id,
                name: item.classes.name,
                role: item.role,
                join_code: item.classes.join_code
            }));
            setClasses(formattedClasses);
            if (formattedClasses.length > 0 && !activeClassId) setActiveClassId(formattedClasses[0].id);
        }
    };

    useEffect(() => { fetchClasses(); }, []);

    // ... (Keep existing fetch effects for Courses, Chapters, Notes)
    useEffect(() => {
        if (!activeClassId) { setCourses([]); return; }
        const fetchCourses = async () => {
            const { data } = await supabase.from('courses').select('id, name, semester').eq('class_id', activeClassId);
            if (data) { setCourses(data); if (data.length > 0) setActiveCourseId(data[0].id); else setActiveCourseId(null); }
        };
        fetchCourses();
    }, [activeClassId]);

    useEffect(() => {
        if (!activeCourseId) { setChapters([]); return; }
        const fetchChapters = async () => {
            const { data } = await supabase.from('chapters').select('id, name').eq('course_id', activeCourseId).order('created_at', { ascending: true });
            if (data) { setChapters(data); if (data.length > 0) setActiveChapterId(data[0].id); else setActiveChapterId(null); }
        };
        fetchChapters();
    }, [activeCourseId]);

    useEffect(() => {
        if (!activeChapterId) { setChapterNotes([]); return; }
        const fetchNotes = async () => {
            const { data } = await supabase.from('notes').select('id, title, user_id').eq('chapter_id', activeChapterId).order('created_at', { ascending: false });
            if (data) setChapterNotes(data);
        };
        fetchNotes();
    }, [activeChapterId]);

    // --- CLASS & REQUEST HANDLERS ---
    const handleCreateClass = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("http://localhost:8000/api/classes/create", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify(newClassForm)
            });

            if (res.ok) {
                const data = await res.json();
                await fetchClasses();
                setActiveClassId(data.class.id);
                setIsCreateClassModalOpen(false);
                setNewClassForm({ name: '', description: '' });
                alert(`Class Created! Invite code: ${data.class.join_code}`);
            } else alert((await res.json()).detail);
        } catch (error) { console.error(error); }
    };

    const handleJoinClass = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("http://localhost:8000/api/classes/join", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ join_code: joinCode })
            });

            if (res.ok) {
                setIsJoinClassModalOpen(false);
                setJoinCode("");
                alert("Request sent! Waiting for admin approval.");
            } else alert((await res.json()).detail);
        } catch (error) { console.error(error); }
    };

    const fetchRequests = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:8000/api/classes/requests/${activeClassId}`, {
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data.requests);
            }
        } catch (error) { console.error(error); }
    };

    const handleRequestAction = async (userId: string, action: 'approve' | 'reject') => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:8000/api/classes/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ class_id: activeClassId, user_id: userId })
            });
            if (res.ok) {
                fetchRequests(); // Refresh the modal list
            }
        } catch (error) { console.error(error); }
    };

    // --- COURSE/CHAPTER/EDITOR HANDLERS (Unchanged) ---
    const handleCreateCourse = async () => {
        if (!activeClassId) return alert("Please select or create a class first.");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("http://localhost:8000/api/courses/create-course", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ name: newCourseForm.name, semester: newCourseForm.semester, class_id: activeClassId })
            });
            if (res.ok) {
                const data = await res.json(); setCourses(prev => [...prev, data.course]); setActiveCourseId(data.course.id);
                setIsCourseModalOpen(false); setNewCourseForm({ name: '', semester: '' }); alert("Course Created!");
            } else alert((await res.json()).detail);
        } catch (error) { console.error(error); }
    };

    const handleCreateChapter = async () => {
        if (!activeCourseId) return alert("Please select or create a course first.");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("http://localhost:8000/api/courses/create-chapter", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ name: newChapterForm.name, course_id: activeCourseId })
            });
            if (res.ok) {
                const data = await res.json(); setChapters(prev => [...prev, data.chapter]); setActiveChapterId(data.chapter.id);
                setIsChapterModalOpen(false); setNewChapterForm({ name: '' }); alert("Chapter Created!");
            } else alert((await res.json()).detail);
        } catch (error) { console.error(error); }
    };

    const handleSyncText = async (text: string) => {
        if (!activeChapterId) return alert("Select a chapter first.");
        setIsSyncingNode(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("http://localhost:8000/api/notes/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ chapter_id: activeChapterId, title: "Live Node Contribution", content: text })
            });
            if (res.ok) {
                alert("Successfully stitched to the Knowledge Graph!");
                const { data } = await supabase.from('notes').select('id, title, user_id').eq('chapter_id', activeChapterId).order('created_at', { ascending: false });
                if (data) setChapterNotes(data);
            } else alert("Failed to sync: " + (await res.json()).detail);
        } catch (error) { console.error(error); } finally { setIsSyncingNode(false); }
    };

    const handleUploadPdf = async (file: File) => {
        if (!activeChapterId) return alert("Select a chapter first.");
        setIsSyncingNode(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const formData = new FormData();
            formData.append("chapter_id", activeChapterId);
            formData.append("title", file.name);
            formData.append("file", file);
            const res = await fetch("http://localhost:8000/api/notes/upload-pdf", {
                method: "POST",
                headers: { "Authorization": `Bearer ${session?.access_token}` },
                body: formData
            });
            if (res.ok) {
                alert(`Success! Mapped ${file.name} to the Hive.`);
                const { data } = await supabase.from('notes').select('id, title, user_id').eq('chapter_id', activeChapterId).order('created_at', { ascending: false });
                if (data) setChapterNotes(data);
            } else alert("Failed to process PDF: " + (await res.json()).detail);
        } catch (error) { console.error(error); } finally { setIsSyncingNode(false); }
    };

    const handleStitch = async () => {
        if (!activeChapterId) return alert("Select a chapter first.");
        if (!editorRef.current) return;
        const rawText = editorRef.current.getText();
        if (!rawText.trim()) return alert("Please type some notes first before stitching!");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('http://localhost:8000/api/notes/stitch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ rawText, chapter_id: activeChapterId })
            });
            if (res.ok) {
                const data = await res.json();
                const ghost_notes = data.ghost_notes || [];
                ghost_notes.forEach((note: any) => editorRef.current.appendStitchedContent(note.title, note.content));
            } else alert("Failed to fetch ghost notes.");
        } catch (err) { console.error(err); }
    }

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:8000/api/notes/${noteId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                setChapterNotes(prev => prev.filter(n => n.id !== noteId));
                alert("Note deleted successfully.");
            } else {
                alert("Failed to delete note: " + (await res.json()).detail);
            }
        } catch (error) { console.error(error); }
    };

    // --- UI RENDER ---
    return (
        <div className="h-screen w-full bg-[#050508] text-white flex overflow-hidden font-sans">
            <aside className="w-72 border-r border-white/10 bg-[#050508] flex flex-col h-full relative z-20">
                {/* CLASS DROPDOWN */}
                <div className="h-16 shrink-0 relative border-b border-white/10 flex items-center px-4">
                    <button onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} className="w-full flex items-center justify-between hover:bg-white/5 p-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
                                <span className="text-white font-bold text-sm">{classes.find(c => c.id === activeClassId)?.name?.charAt(0) || "!"}</span>
                            </div>
                            <div className="flex flex-col items-start truncate">
                                <span className="text-sm font-bold text-white truncate">{classes.find(c => c.id === activeClassId)?.name || "Select a Class"}</span>
                                <span className="text-[10px] text-white/50 uppercase tracking-widest">{classes.find(c => c.id === activeClassId)?.role || "Workspace"}</span>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isClassDropdownOpen && (
                        <div className="absolute top-16 left-4 right-4 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl z-50 py-2 overflow-hidden">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {classes.map(c => (
                                    <button key={c.id} onClick={() => { setActiveClassId(c.id); setIsClassDropdownOpen(false); }} className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${activeClassId === c.id ? 'bg-cyan-400' : 'bg-transparent'}`} />
                                            <span className={`text-sm truncate ${activeClassId === c.id ? 'text-white' : 'text-white/70'}`}>{c.name}</span>
                                        </div>
                                        {/* SHOWING THE CODE HERE */}
                                        <span className="text-[10px] text-white/30 font-mono tracking-widest">{c.join_code}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="px-2 pt-2 mt-2 border-t border-white/10 space-y-1 pb-2">
                                {/* ONLY SHOW IF ADMIN */}
                                {classes.find(c => c.id === activeClassId)?.role === 'admin' && (
                                    <button onClick={() => { fetchRequests(); setIsRequestsModalOpen(true); setIsClassDropdownOpen(false); }} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg">
                                        <Bell className="w-4 h-4" /> Pending Requests
                                    </button>
                                )}
                                <button onClick={() => { setIsJoinClassModalOpen(true); setIsClassDropdownOpen(false); }} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg">
                                    <Users className="w-4 h-4" /> Join Class
                                </button>
                                <button onClick={() => { setIsCreateClassModalOpen(true); setIsClassDropdownOpen(false); }} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded-lg">
                                    <Plus className="w-4 h-4" /> Create Class
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto py-6 space-y-8 custom-scrollbar">
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-300/50 uppercase tracking-widest mb-3 px-2">
                            <span className="flex items-center"><BookOpen className="w-3.5 h-3.5 mr-2" /> Class Courses</span>
                            {activeClassId && <button onClick={() => setIsCourseModalOpen(true)} className="hover:text-cyan-400 transition-colors p-1" title="Create Course">+</button>}
                        </div>

                        <div className="space-y-1">
                            {!activeClassId && <p className="text-xs text-white/30 px-4 italic">Join or create a class to see courses.</p>}
                            {courses.map(course => (
                                <div key={course.id} className="mb-1">
                                    <button onClick={() => setActiveCourseId(course.id)} className={`w-full flex items-center justify-between px-4 py-2 mx-2 rounded-lg text-sm transition-all ${activeCourseId === course.id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                                        <span className="flex items-center gap-3 truncate"><BookOpen className={`w-4 h-4 ${activeCourseId === course.id ? 'text-cyan-400' : ''}`} /> {course.name} <span className="text-[10px] text-white/30 ml-2">({course.semester})</span></span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${activeCourseId === course.id ? "rotate-90 text-cyan-400" : ""}`} />
                                    </button>

                                    {activeCourseId === course.id && (
                                        <div className="pl-4 pr-2 py-2 space-y-1 border-l-2 border-white/5 ml-6 mt-1">
                                            <button onClick={() => setIsChapterModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-white/20 text-white/40 hover:text-white/80 hover:border-white/40 transition-all mb-2">+ Propose New Chapter</button>
                                            {chapters.map(chapter => (
                                                <div key={chapter.id} className="mb-1">
                                                    <button onClick={() => setActiveChapterId(chapter.id)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${activeChapterId === chapter.id ? "bg-indigo-500/30 text-white border border-indigo-500/50" : "bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 hover:bg-indigo-500/20"}`}>
                                                        <span className="flex items-center gap-2 truncate"><Hash className="w-3 h-3 shrink-0" /> {chapter.name}</span>
                                                    </button>
                                                    {activeChapterId === chapter.id && (
                                                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-white/5 ml-2">
                                                            {chapterNotes.length === 0 ? <p className="text-[10px] text-white/30 px-2 italic py-1">No notes in the hive yet.</p> : chapterNotes.map(note => (
                                                                <div key={note.id} className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-white/[0.02] hover:bg-white/10 transition-all group">
                                                                    <button className="flex items-center gap-2 text-xs text-white/60 group-hover:text-white text-left flex-1 truncate">
                                                                        <FileText className="w-3.5 h-3.5 text-emerald-500/70 group-hover:text-emerald-400 shrink-0" />
                                                                        <span className="truncate">{note.title}</span>
                                                                    </button>
                                                                    <button onClick={() => handleDeleteNote(note.id)} className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                <header className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex-1 max-w-xl relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input type="text" placeholder="Search the collective graph..." className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50" />
                    </div>
                </header>

                <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-hidden min-h-0">
                    <div className="h-full flex flex-col gap-4">
                        <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/10">
                            <h2 className="text-white/80 font-medium flex items-center gap-2"><CloudLightning className="w-5 h-5 text-cyan-400" /> AI Live Editor</h2>
                            <button onClick={handleStitch} className="flex items-center gap-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                <CloudLightning className="w-4 h-4" /> AI Stitch
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <LiveEditor ref={editorRef} isActive={activeChapterId !== null} isSyncing={isSyncingNode} onSync={handleSyncText} onUpload={handleUploadPdf} />
                        </div>
                    </div>
                    <div className="h-full">
                        <KnowledgeGraph chapterId={activeChapterId || ""} />
                    </div>
                </div>
            </main>

            {/* Admin Pending Requests Modal */}
            {isRequestsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-amber-500/30 p-6 rounded-2xl w-96 relative shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                        <button onClick={() => setIsRequestsModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-4 text-amber-400">Join Requests</h3>
                        {pendingRequests.length === 0 ? (
                            <p className="text-sm text-white/50 text-center py-4">No pending requests.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {pendingRequests.map(req => (
                                    <div key={req.user_id} className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col gap-3">
                                        <span className="text-xs text-white/70 font-mono break-all bg-black/50 p-2 rounded">User ID: {req.user_id}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRequestAction(req.user_id, 'approve')} className="flex-1 bg-emerald-500/20 text-emerald-400 py-1.5 rounded text-xs font-bold hover:bg-emerald-500/30 transition-colors">Approve</button>
                                            <button onClick={() => handleRequestAction(req.user_id, 'reject')} className="flex-1 bg-red-500/20 text-red-400 py-1.5 rounded text-xs font-bold hover:bg-red-500/30 transition-colors">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Standard Create/Join Modals */}
            {isCreateClassModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-cyan-500/30 p-6 rounded-2xl w-96 relative shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                        <button onClick={() => setIsCreateClassModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-4 text-cyan-400">Create New Class</h3>
                        <input type="text" placeholder="Class Name" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-3 text-white outline-none" value={newClassForm.name} onChange={e => setNewClassForm({ ...newClassForm, name: e.target.value })} />
                        <button onClick={handleCreateClass} className="w-full bg-cyan-500 text-black font-medium py-2 rounded-lg hover:bg-cyan-400 transition-colors">Create Class</button>
                    </div>
                </div>
            )}

            {isJoinClassModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-indigo-500/30 p-6 rounded-2xl w-96 relative shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                        <button onClick={() => setIsJoinClassModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-4 text-indigo-400">Join a Class</h3>
                        <input type="text" placeholder="e.g., SYN-A1B2C3" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-center text-lg tracking-widest uppercase text-white outline-none mb-4 font-mono" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
                        <button onClick={handleJoinClass} className="w-full bg-indigo-500 text-white font-medium py-2 rounded-lg hover:bg-indigo-600 transition-colors">Send Request</button>
                    </div>
                </div>
            )}

            {/* Course & Chapter Modals */}
            {isCourseModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-white/10 p-6 rounded-2xl w-96 relative">
                        <button onClick={() => setIsCourseModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-4 text-cyan-400">Create Course</h3>
                        <input type="text" placeholder="Course Name" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-3 text-white outline-none" value={newCourseForm.name} onChange={e => setNewCourseForm({ ...newCourseForm, name: e.target.value })} />
                        <input type="text" placeholder="Semester" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-4 text-white outline-none" value={newCourseForm.semester} onChange={e => setNewCourseForm({ ...newCourseForm, semester: e.target.value })} />
                        <button onClick={handleCreateCourse} className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 py-2 rounded-lg">Submit</button>
                    </div>
                </div>
            )}

            {isChapterModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0f] border border-white/10 p-6 rounded-2xl w-96 relative">
                        <button onClick={() => setIsChapterModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-4 text-indigo-400">Propose Chapter</h3>
                        <input type="text" placeholder="Chapter Name" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 mb-4 text-white outline-none" value={newChapterForm.name} onChange={e => setNewChapterForm({ ...newChapterForm, name: e.target.value })} />
                        <button onClick={handleCreateChapter} className="w-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 py-2 rounded-lg">Submit</button>
                    </div>
                </div>
            )}
        </div>
    )
}