"use client"

import { useState, useEffect, useRef } from 'react'
import { sb as supabase } from '@/lib/supabase'
import { X, Send, User, MessageCircleQuestion } from 'lucide-react'

interface ChatMessage {
    id: string;
    class_id: string;
    user_id: string;
    message: string;
    is_doubt: boolean;
    resolved: boolean;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string;
    };
}

export default function ChatSidebar({ 
    classId, 
    isOpen, 
    onClose, 
    initialInput = "" 
}: { 
    classId: string | null; 
    isOpen: boolean; 
    onClose: () => void; 
    initialInput?: string;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isDoubt, setIsDoubt] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        if (initialInput && isOpen) {
            setInput(initialInput);
            setIsDoubt(true);
        }
    }, [initialInput, isOpen]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentUserId(session?.user?.id || null);
        };
        checkUser();
    }, []);

    useEffect(() => {
        if (!classId || !isOpen) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('class_chats')
                .select(`
                    *,
                    profiles:user_id(full_name, avatar_url)
                `)
                .eq('class_id', classId)
                .order('created_at', { ascending: true });

            if (data) {
                const formatted = data.map(msg => ({
                    ...msg,
                    profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
                }));
                setMessages(formatted);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        };

        fetchMessages();

        const channel = supabase.channel(`class_chats_${classId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'class_chats',
                    filter: `class_id=eq.${classId}`
                },
                async (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', newMsg.user_id)
                        .single();

                    const fullMsg = { ...newMsg, profiles: profileData };
                    setMessages(prev => [...prev, fullMsg]);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [classId, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !classId || !currentUserId) return;

        const { error } = await supabase.from('class_chats').insert({
            class_id: classId,
            user_id: currentUserId,
            message: input.trim(),
            is_doubt: isDoubt
        });

        if (error) {
            console.error("Failed to send message:", error);
            alert("Failed to send message");
        } else {
            setInput("");
            setIsDoubt(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 h-full border-l border-white/10 bg-[#050508]/95 backdrop-blur-xl flex flex-col absolute right-0 top-0 z-40 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <MessageCircleQuestion className="w-4 h-4 text-cyan-400" />
                    Hive Chat
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <p className="text-center text-white/30 text-xs mt-10 italic">No messages yet. Start the discussion!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.user_id === currentUserId ? 'items-end' : 'items-start'} max-w-full`}>
                            <div className={`flex items-center gap-2 mb-1 ${msg.user_id === currentUserId ? 'flex-row-reverse' : 'flex-row'}`}>
                                <img src={msg.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${msg.profiles?.full_name || 'U'}`} alt="avatar" className="w-5 h-5 rounded-full" />
                                <span className="text-[10px] text-white/50 font-medium">{msg.profiles?.full_name || 'Unknown User'}</span>
                            </div>
                            <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] break-words ${
                                msg.is_doubt 
                                    ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30' 
                                    : msg.user_id === currentUserId 
                                        ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30' 
                                        : 'bg-white/5 text-white/90 border border-white/10'
                            }`}>
                                {msg.is_doubt && <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">Doubt</span>}
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex items-center justify-between mb-2 px-1">
                    <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer hover:text-white transition-colors">
                        <input type="checkbox" checked={isDoubt} onChange={(e) => setIsDoubt(e.target.checked)} className="rounded border-white/20 bg-black/50 accent-amber-500" />
                        Mark as Doubt
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..." 
                        className={`flex-1 w-0 bg-white/5 border ${isDoubt ? 'border-amber-500/30 focus:border-amber-500/50' : 'border-white/10 focus:border-cyan-500/50'} rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors`} 
                    />
                    <button onClick={handleSend} className={`p-2 shrink-0 rounded-lg ${isDoubt ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-cyan-500 hover:bg-cyan-400 text-black'} transition-colors`}>
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
