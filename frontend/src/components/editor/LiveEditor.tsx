"use client"
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Sparkles, Edit3 } from 'lucide-react';

export interface LiveEditorRef {
  appendStitchedContent: (title: string, content: string) => void;
}

interface LiveEditorProps {
  activeCourse: string;
  viewMode: "raw" | "enhanced"; // NEW PROP
  onGhostNotesDetected?: (notes: any[], summary: string, peerUsed: boolean) => void;
}

interface StitchedNote {
  title: string;
  content: string;
}

const LiveEditor = forwardRef<LiveEditorRef, LiveEditorProps>(({ activeCourse, viewMode }, ref) => {
  const [rawText, setRawText] = useState("");
  const [stitchedNotes, setStitchedNotes] = useState<StitchedNote[]>([]);

  useImperativeHandle(ref, () => ({
    // Now accepts title and content separately so we can style them!
    appendStitchedContent: (title: string, content: string) => {
      setStitchedNotes((prev) => [...prev, { title, content }]);
    },
  }));

  // ✨ ENHANCED MASTER VIEW (The "After")
  if (viewMode === "enhanced") {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 font-mono text-sm bg-gradient-to-b from-transparent to-cyan-950/10">
        {/* Raw Notes rendered as read-only */}
        <div className="text-white/80 whitespace-pre-wrap leading-relaxed mb-8">
          {rawText || <span className="text-white/20 italic">No raw notes written yet...</span>}
        </div>

        {/* AI Stitched Notes (The Magic Reveal) */}
        {stitchedNotes.map((note, idx) => (
          <div 
            key={idx} 
            className="mt-4 p-5 border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 rounded-xl animate-in fade-in slide-in-from-bottom-4 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-xs">{note.title}</h4>
              <span className="ml-auto text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">
                AI STITCHED
              </span>
            </div>
            <p className="text-cyan-50/90 leading-relaxed whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}
      </div>
    );
  }

  // 📝 RAW DRAFT VIEW (The "Before")
  return (
    <div className="w-full h-full relative group p-6">
       <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        className="w-full h-full bg-transparent text-white/80 outline-none resize-none font-mono text-sm leading-relaxed"
        placeholder="Type your messy notes here. E.g., 'DBMS is about databases. ACID properties are important but I forgot what they mean...'"
      />
      <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest pointer-events-none group-focus-within:text-white/40 transition-colors">
        <Edit3 className="w-3 h-3" /> Raw Draft Mode
      </div>
    </div>
  );
});

LiveEditor.displayName = 'LiveEditor';
export default LiveEditor;