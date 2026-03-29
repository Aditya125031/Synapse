"use client";

import { useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Chatbot from "./chatbot";

export default function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} // Springy apple-like ease
                        // Premium glass shadow & border
                        className="mb-6 w-[360px] sm:w-[420px] h-[650px] max-h-[85vh] shadow-[0_0_40px_rgba(37,99,235,0.15)] rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0f]"
                    >
                        <Chatbot onClose={() => setIsOpen(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${isOpen
                        ? "bg-zinc-800 text-white border border-white/10 hover:bg-zinc-700"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-blue-500/50"
                    }`}
            >
                {/* Glow effect behind button */}
                {!isOpen && <div className="absolute inset-0 rounded-full bg-blue-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />}

                <div className="relative z-10">
                    {isOpen ? (
                        <X className="w-6 h-6" />
                    ) : (
                        <div className="relative">
                            <Bot className="w-6 h-6" />
                            <Sparkles className="w-3 h-3 absolute -top-1 -right-2 text-blue-200 animate-pulse" />
                        </div>
                    )}
                </div>
            </button>
        </div>
    );
}