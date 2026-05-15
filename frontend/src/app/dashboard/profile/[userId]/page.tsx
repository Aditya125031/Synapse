"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { sb as supabase } from '@/lib/supabase'
import { ArrowLeft, Award, FileText, User } from 'lucide-react'

interface UserProfile {
    id: string;
    full_name: string;
    avatar_url: string;
    reputation: number;
}

interface UserNote {
    id: string;
    title: string;
    chapter_id: string;
    created_at: string;
}

export default function PublicProfilePage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.userId as string

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [notes, setNotes] = useState<UserNote[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) return;

            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, reputation')
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;
                setProfile(profileData);

                const { data: notesData, error: notesError } = await supabase
                    .from('notes')
                    .select('id, title, chapter_id, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (notesError) throw notesError;
                setNotes(notesData || []);

            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#050508] h-screen">
                <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#050508] h-screen text-white/50">
                <User className="w-16 h-16 mb-4 text-white/20" />
                <h2 className="text-xl font-bold">User Not Found</h2>
                <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#050508] text-white min-h-screen relative custom-scrollbar">
            {/* Header / Banner */}
            <div className="h-48 w-full bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-black relative">
                <button
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white/70 hover:text-white transition-colors flex items-center gap-2 backdrop-blur-sm border border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
            </div>

            {/* Profile Info */}
            <div className="max-w-4xl mx-auto px-6 pb-12">
                <div className="relative -mt-20 mb-8 flex items-end justify-between">
                    <div className="flex items-end gap-6">
                        <img
                            src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&size=128&background=random`}
                            alt={profile.full_name}
                            className="w-32 h-32 rounded-2xl border-4 border-[#050508] bg-[#0a0a0f] shadow-2xl"
                        />
                        <div className="pb-2">
                            <h1 className="text-3xl font-bold text-white mb-1">{profile.full_name}</h1>
                            <p className="text-sm text-white/50 font-mono">ID: {profile.id.substring(0, 8)}...</p>
                        </div>
                    </div>
                    <div className="pb-2">
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                            <Award className="w-5 h-5 text-amber-400" />
                            <div className="flex flex-col">
                                <span className="text-xs text-amber-400/70 font-bold uppercase tracking-wider">Reputation</span>
                                <span className="text-lg font-bold text-amber-400 leading-none">{profile.reputation || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-12">
                    {/* Left Column (Stats) */}
                    <div className="col-span-1 space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4">Stats</h3>
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <span className="text-sm text-white/50">Contributions</span>
                                <span className="text-sm font-bold text-white">{notes.length}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-white/50">Reputation</span>
                                <span className="text-sm font-bold text-amber-400">{profile.reputation || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Notes) */}
                    <div className="col-span-2">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" /> Contributions
                            </h3>

                            {notes.length === 0 ? (
                                <p className="text-sm text-white/40 italic py-8 text-center bg-black/20 rounded-xl border border-white/5">No contributions found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {notes.map(note => (
                                        <div key={note.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                                    <FileText className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div className="flex flex-col truncate">
                                                    <span className="text-sm font-bold text-white/90 truncate group-hover:text-white transition-colors">{note.title}</span>
                                                    <span className="text-xs text-white/40">{new Date(note.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
