"use client";
import React, { useEffect, useRef, useState } from "react";
import { Send, Bot, User, X, Loader2, Sparkles, Mic, Volume2, VolumeX, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "bot";
    text: string;
}

interface ChatbotProps {
    onClose?: () => void;
}

export default function Chatbot({ onClose }: ChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef<any>(null);
    const lastSpokenRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    // --- 1. LOAD CHAT HISTORY ON MOUNT ---
    useEffect(() => {
        const savedChat = localStorage.getItem("synapse_chat_history");
        if (savedChat) {
            try {
                setMessages(JSON.parse(savedChat));
            } catch (e) {
                console.error("Failed to parse chat history");
            }
        }
    }, []);

    // --- 2. SAVE CHAT HISTORY ON CHANGE ---
    useEffect(() => {
        // Only save if there are messages to prevent overwriting with empty array on first quick render
        if (messages.length > 0) {
            localStorage.setItem("synapse_chat_history", JSON.stringify(messages));
        }
    }, [messages]);

    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear your chat history?")) {
            setMessages([]);
            localStorage.removeItem("synapse_chat_history");
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-US";
            recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    }, []);

    // --- 3. TEXT TO SPEECH HANDLER ---
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];

        // 🟢 THE FIX: If this is the initial load, mark the message as "already spoken" and stop.
        if (isInitialMount.current && messages.length > 0) {
            if (lastMessage?.role === "bot") {
                lastSpokenRef.current = lastMessage.text;
            }
            isInitialMount.current = false; // Lower the shield for future messages
            return;
        }

        // Normal speaking logic for new messages
        if (lastMessage?.role === "bot" && !loading && lastMessage.text !== lastSpokenRef.current) {
            lastSpokenRef.current = lastMessage.text;
            if (isSpeaking && typeof window !== "undefined") {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(lastMessage.text.replace(/[*#_`]/g, ""));
                window.speechSynthesis.speak(utterance);
            }
        }
    }, [messages, isSpeaking, loading]);

    const toggleListening = () => {
        if (isListening) recognitionRef.current?.stop();
        else { recognitionRef.current?.start(); setIsListening(true); }
    };

    const toggleSpeaking = () => {
        const newState = !isSpeaking;
        setIsSpeaking(newState);

        // If the user just turned it OFF, immediately cancel any ongoing speech
        if (!newState && typeof window !== "undefined") {
            window.speechSynthesis.cancel();
        }
    };

    async function sendMessage() {
        if (!input.trim()) return;
        window.speechSynthesis.cancel();

        setMessages((prev) => [...prev, { role: "user", text: input }]);
        const currentInput = input;
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(`http://localhost:8000/api/chat/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: currentInput }),
            });

            if (!res.ok) throw new Error("Server error");
            const data = await res.json();
            setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
        } catch (error) {
            setMessages((prev) => [...prev, { role: "bot", text: "Error connecting to Synapse AI." }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0f] text-white font-sans relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-600/20 blur-[60px] pointer-events-none" />

            {/* HEADER */}
            <div className="bg-[#0a0a0f]/80 backdrop-blur-xl p-4 flex items-center justify-between border-b border-white/10 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="relative p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <Bot className="w-5 h-5 text-white" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]"></div>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold flex items-center gap-1.5 tracking-wide text-zinc-100">
                            Synapse AI <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        </h2>
                        <p className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase">Knowledge Assistant</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={clearHistory} title="Clear Chat History" className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                        <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-red-400" />
                    </button>
                    <button onClick={toggleSpeaking} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        {isSpeaking ? <Volume2 className="w-4 h-4 text-zinc-300" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                            <X className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        </button>
                    )}
                </div>
            </div>

            {/* CHAT MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
                        <Bot className="w-12 h-12 text-zinc-600" />
                        <p className="text-sm text-zinc-400 text-center px-4">Hello! I am Synapse AI.<br />Ask me anything about your graph.</p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${m.role === "user" ? "bg-zinc-800 border border-white/10" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                                {m.role === "user" ? <User className="w-4 h-4 text-zinc-300" /> : <Bot className="w-4 h-4 text-white" />}
                            </div>

                            {/* min-w-0 is CRITICAL here to prevent flex children from exploding out of bounds */}
                            <div className={`p-4 rounded-2xl text-sm max-w-[85%] min-w-0 break-words leading-relaxed shadow-sm ${m.role === "user"
                                ? "bg-zinc-800/80 border border-white/5 rounded-tr-none text-zinc-100"
                                : "bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-tl-none text-blue-50"
                                }`}>
                                <div className="w-full">
                                    <ReactMarkdown
                                        components={{
                                            // Custom renderers force the markdown to respect the bubble's boundaries
                                            p: ({ node, ...props }) => <p className="mb-3 last:mb-0 break-words whitespace-pre-wrap" {...props} />,
                                            a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                                            li: ({ node, ...props }) => <li className="break-words" {...props} />,
                                            h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2 text-white" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-2 mb-1 text-white" {...props} />,
                                            // Code blocks get a horizontal scrollbar instead of breaking the parent width
                                            pre: ({ node, ...props }) => (
                                                <div className="relative my-3 rounded-xl overflow-hidden bg-black/50 border border-white/10 w-full max-w-full">
                                                    <pre className="p-3 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre custom-scrollbar" {...props} />
                                                </div>
                                            ),
                                            code: ({ node, className, children, ...props }: any) => {
                                                const isInline = !String(className).includes('language-');
                                                return isInline ? (
                                                    <code className="bg-black/40 text-blue-200 rounded px-1.5 py-0.5 font-mono text-xs break-words" {...props}>
                                                        {children}
                                                    </code>
                                                ) : (
                                                    <code className="font-mono text-zinc-300" {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {m.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-blue-400 rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-blue-400 rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-blue-400 rounded-full" />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT FIELD */}
            <div className="p-4 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/10 shrink-0">
                <div className="flex gap-2 items-center bg-zinc-900 border border-white/10 rounded-full p-1.5 focus-within:border-blue-500/50 focus-within:bg-zinc-900/80 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300">
                    <button onClick={toggleListening} className={`p-2.5 rounded-full transition-colors ${isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                        <Mic className="w-4 h-4" />
                    </button>
                    <input
                        className="flex-1 bg-transparent text-sm px-2 outline-none text-white placeholder:text-zinc-500"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={isListening ? "Listening..." : "Message Synapse AI..."}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:hover:shadow-none transition-all duration-300"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}