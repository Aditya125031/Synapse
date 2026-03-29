"use client"

import LiveEditor, { LiveEditorRef } from '@/components/editor/LiveEditor'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import { useState, useRef } from 'react'
import {
  Search, Bell, CloudLightning, BookOpen, ChevronRight,
  Hash, Settings, FileUp, Ghost, Sparkles, Brain, Zap, X, Plus, ShieldCheck
} from 'lucide-react'

// --- METADATA CONFIGS ---
interface GhostNote {
  id?: string
  title: string
  content: string
  gap_type?: string
  trust_score?: number
  source_doc?: string
}

const GAP_TYPE_META: Record<string, { label: string; color: string }> = {
  missing_definition: { label: "Missing Definition", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  incomplete_example: { label: "Incomplete Example", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  missing_connection: { label: "Missing Connection", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  error:              { label: "Error",              color: "text-red-400 bg-red-500/10 border-red-500/20" },
}

export default function Dashboard() {
  // --- CORE STATE ---
  const [activeCourse, setActiveCourse] = useState("dbms")
  const [activeSubtopic, setActiveSubtopic] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState("live")
  const [isEnhancedMode, setIsEnhancedMode] = useState(false)
  const [viewMode, setViewMode] = useState<"raw" | "enhanced">("raw")

  // --- TEXT ENGINE STATE ---
  const [rawText, setRawText] = useState("I know BCNF is a normal form used in databases. It helps reduce redundancy.");
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ghostNotes, setGhostNotes] = useState<GhostNote[]>([])
  const [stitchedIds, setStitchedIds] = useState<Set<string>>(new Set())
  
  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // --- FILE & PDF STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isInjecting, setIsInjecting] = useState(false)
  const [gapSummary, setGapSummary] = useState("")
  const [peerContextUsed, setPeerContextUsed] = useState(false)
  const liveEditorRef = useRef<LiveEditorRef>(null)

  // --- BACKEND HANDLERS ---

  const handleGhostNotesDetected = (notes: GhostNote[], summary: string, peerUsed: boolean) => {
    setGhostNotes(notes)
    setGapSummary(summary)
    setPeerContextUsed(peerUsed)
    setStitchedIds(new Set())
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const topicToAnalyze = activeSubtopic || activeCourse
      const res = await fetch("http://localhost:8000/api/stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, subtopic: topicToAnalyze }),
      })
      const data = await res.json()
      if (data.status === "success") {
        setGhostNotes(data.ghost_notes)
        setStitchedIds(new Set())
      }
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleStitch = (note: GhostNote) => {
    const noteId = note.id || Math.random().toString()
    if (stitchedIds.has(noteId)) return
    
    setRawText((prev) => prev + "\n\n[HIVE ADDITION]: " + note.content)
    setStitchedIds(new Set(stitchedIds).add(noteId))
    setIsEnhancedMode(true)
    setViewMode("enhanced")
  }

  const handleSearchSelect = (result: any) => {
    setSearchQuery("")
    setSearchResults([])
    const recallText = `\n\n[HIVE ADDITION]: 🔍 HIVE RECALL: ${result.title} — ${result.text}`
    setRawText((prev) => prev + recallText)
    setIsEnhancedMode(true)
    setViewMode("enhanced")

    setTimeout(() => {
      if (liveEditorRef.current) {
        liveEditorRef.current.appendStitchedContent(`🔍 Hive Recall: ${result.title}`, result.text)
      }
    }, 100)
  }

  const handleDismiss = (id?: string) => {
    setGhostNotes(prev => prev.filter((note, i) => (note.id || i.toString()) !== id))
  }

  const handleFileClick = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
  }

  const handleInjection = async () => {
    if (!selectedFile) return
    setIsInjecting(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("course", activeCourse)
      if (activeSubtopic) formData.append("subtopic", activeSubtopic)
      
      const response = await fetch("http://localhost:8000/api/inject", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      if (result.suggestions?.length > 0) {
        setGhostNotes(result.suggestions)
        setGapSummary(`Successfully extracted ${result.chunks_embedded} chunks from ${selectedFile.name}`)
      }
      setSelectedFile(null)
    } catch (error) {
      console.error("Injection error:", error)
    } finally {
      setIsInjecting(false)
    }
  }

  const courses = [
    { 
      id: "dbms", 
      label: "Database Management",
      subsections: [
        { id: "normalization", label: "Normalization" },
        { id: "bcnf", label: "BCNF" },
        { id: "indexing", label: "Indexing & B-Trees" },
        { id: "acid", label: "ACID Properties" }
      ]
    },
    { id: "os", label: "Operating Systems", subsections: [{ id: "Virtual Memory", label: "Virtual Memory" }] },
    { id: "cn",   label: "Computer Networks"   },
    { id: "algo", label: "Algorithms"          },
  ]

  return (
    <div className="flex h-screen w-screen bg-[#030305] text-white font-sans overflow-hidden selection:bg-cyan-500/30">
        
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 border-r border-white/5 bg-[#050508] flex flex-col relative z-20 shrink-0 shadow-2xl">
        <div className="h-16 flex items-center px-6 border-b border-white/5 bg-white/[0.01]">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_12px_rgba(34,211,238,0.6)] mr-3" />
          <h2 className="text-lg font-black tracking-widest bg-gradient-to-r from-white to-white/50 text-transparent bg-clip-text uppercase">Synapse</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
          <div>
            <div className="flex items-center text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest mb-3 px-2">
              <BookOpen className="w-3.5 h-3.5 mr-2" /> Current Semester
            </div>
            
            <div className="space-y-1.5">
              {courses.map((course) => (
                <div key={course.id} className="space-y-1">
                  <button
                    onClick={() => { setActiveCourse(course.id); setActiveSubtopic(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeCourse === course.id ? "bg-white/10 text-white shadow-lg" : "text-white/50 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{course.label}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeCourse === course.id ? "rotate-90 text-cyan-400" : ""}`} />
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${activeCourse === course.id ? "max-h-64 opacity-100 mt-1" : "max-h-0 opacity-0"}`}>
                    {course.subsections?.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveSubtopic(sub.id)}
                        className={`w-full flex items-center pl-10 pr-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeSubtopic === sub.id ? "text-cyan-400 bg-cyan-500/10 shadow-inner" : "text-white/40 hover:text-white/80"
                        }`}
                      >
                        <Hash className="w-3 h-3 mr-2 opacity-50" /> {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#030305]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 p-[2px] shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Demo User</p>
              <p className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">420 CQ Points</p>
            </div>
            <button className="text-white/30 hover:text-cyan-400 transition-colors"><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-center px-8 bg-[#050508]/60 backdrop-blur-xl shrink-0 z-50">
          <div className="w-full max-w-2xl relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? "text-cyan-400" : "text-white/30"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={async (e) => {
                const query = e.target.value;
                setSearchQuery(query);
                if (query.length > 2) {
                  setIsSearching(true)
                  try {
                    const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`)
                    const data = await res.json()
                    setSearchResults(data)
                  } catch (e) { console.error(e) } finally { setIsSearching(false) }
                } else { setSearchResults([]) }
              }}
              placeholder="Search the collective hive..."
              className="w-full bg-[#0a0a0f] border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 shadow-inner transition-all"
            />
            {/* SEARCH DROPDOWN */}
            {searchQuery.length > 2 && (
              <div className="absolute top-full left-0 w-full mt-3 bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-3xl">
                {isSearching ? (
                  <div className="p-6 text-xs text-cyan-400/60 font-medium text-center animate-pulse flex items-center justify-center gap-2"><CloudLightning className="w-4 h-4" /> Querying hive...</div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((res, idx) => (
                      <div key={idx} onClick={() => handleSearchSelect(res)} className="p-4 border-b border-white/5 hover:bg-cyan-500/10 cursor-pointer transition-all group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{res.course}</span>
                          <h4 className="text-sm font-bold group-hover:text-cyan-300">{res.title}</h4>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{res.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-xs text-white/30 text-center font-medium">No hive data found.</div>
                )}
              </div>
            )}
          </div>
        </header>
        
        <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
          {/* COLUMN 1: SMART EDITOR (Col-span-5) */}
          <div className="col-span-5 flex flex-col h-full bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#050508] shrink-0 pr-4">
              <div className="flex">
                <button onClick={() => setActiveMode("live")} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider relative flex items-center gap-2 transition-all ${activeMode === "live" ? "text-cyan-400 bg-white/[0.02]" : "text-white/30"}`}>
                  <Zap className="w-4 h-4" /> Live Note
                  {activeMode === "live" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />}
                </button>
                <button onClick={() => setActiveMode("pdf")} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider relative flex items-center gap-2 transition-all ${activeMode === "pdf" ? "text-cyan-400 bg-white/[0.02]" : "text-white/30"}`}>
                  <FileUp className="w-4 h-4" /> Inject PDF
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {activeMode === "live" && (
                <div className="flex flex-col h-full">
                  <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.01] shrink-0">
                    <div className="flex bg-[#050508] p-1 rounded-lg border border-white/5">
                      <button onClick={() => setIsEnhancedMode(false)} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${!isEnhancedMode ? 'bg-white/10 text-white shadow-sm' : 'text-white/40'}`}>RAW DRAFT</button>
                      <button onClick={() => setIsEnhancedMode(true)} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5 ${isEnhancedMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'text-white/40'}`}><Sparkles className="w-3 h-3"/> ENHANCED</button>
                    </div>
                    <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] uppercase font-black px-5 py-2 rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50">
                      {isAnalyzing ? "ANALYZING..." : "SYNC WITH HIVE ⚡"}
                    </button>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    {!isEnhancedMode ? (
                      <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Type notes..." className="w-full h-full bg-transparent resize-none outline-none text-white/60 font-mono text-sm leading-relaxed" />
                    ) : (
                      <div className="w-full h-full text-white/90 font-sans text-[15px] leading-loose">
                        {rawText.split('[HIVE ADDITION]:').map((part, index) => (
                          <div key={index} className="mb-4">
                            {index === 0 ? <p className="opacity-80">{part}</p> : (
                              <div className="bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/30 text-cyan-50 p-5 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.1)] animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-4 h-4 text-cyan-400" />
                                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest text-shadow-glow">Hive Synthesis</span>
                                </div>
                                <div className="whitespace-pre-line text-sm leading-relaxed text-cyan-100/90">{part}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeMode === "pdf" && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-full max-w-sm border-2 border-dashed border-white/10 hover:border-cyan-500/30 rounded-2xl bg-[#050508]/50 p-10 group transition-all">
                    <FileUp className="w-12 h-12 text-cyan-400 mx-auto mb-5 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tighter">Inject Knowledge Module</h3>
                    <p className="text-xs text-white/40 mb-6 font-medium">Embed local documents into the collective neural network.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                    <button onClick={handleFileClick} className="w-full px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold border border-white/10 transition-all">{selectedFile ? `📄 ${selectedFile.name}` : "Browse Files"}</button>
                    {selectedFile && <button onClick={handleInjection} disabled={isInjecting} className="w-full mt-4 px-5 py-3 bg-cyan-500 text-black rounded-xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 transition-all">{isInjecting ? "Embedding..." : "Initiate Injection ⚡"}</button>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: NEURAL GRAPH (Col-span-4) */}
          <div className="col-span-4 h-full rounded-2xl border border-white/5 bg-[#0a0a0f] overflow-hidden relative shadow-2xl">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#050508]/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5">
                <CloudLightning className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Neural Mapping</span>
              </div>
              <KnowledgeGraph highlightedNode={activeSubtopic} />
          </div>

          {/* COLUMN 3: GHOST NOTES (Col-span-3) */}
          <div className="col-span-3 h-full flex flex-col gap-4">
            <div className="flex-1 bg-[#0a0a0f] border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#050508] shrink-0">
                <div className="flex items-center gap-2"><Ghost className="w-4 h-4 text-cyan-400 animate-pulse" /><h3 className="text-xs font-bold text-white uppercase tracking-widest">Ghost Notes</h3></div>
                {ghostNotes.length > 0 && <span className="text-[9px] font-bold text-black bg-cyan-400 px-2 py-0.5 rounded-full">{ghostNotes.length} GAPS</span>}
              </div>

              {gapSummary && (
                <div className={`m-4 mb-0 px-4 py-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-3 shrink-0 ${peerContextUsed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"}`}>
                  <Brain className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{gapSummary}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {ghostNotes.length === 0 && !isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-40"><Ghost className="w-12 h-12 mb-4" /><p className="text-sm font-medium">No gaps detected</p></div>
                ) : (
                  ghostNotes.map((note, i) => {
                    const idToUse = note.id || i.toString()
                    const meta = GAP_TYPE_META[note.gap_type || ""] || null
                    const isStitched = stitchedIds.has(idToUse)
                    return (
                      <div key={idToUse} className={`relative p-4 rounded-xl border transition-all duration-300 group ${isStitched ? "bg-emerald-500/5 border-emerald-500/20 opacity-75" : "bg-[#050508] border-white/10 hover:border-cyan-500/40"}`}>
                        <button onClick={() => handleDismiss(idToUse)} className="absolute top-3 right-3 text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                        <div className="flex items-center gap-2 mb-3">
                          {meta && <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2 leading-snug">{note.title}</h4>
                        <p className="text-xs text-white/60 leading-relaxed mb-4">{note.content}</p>
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex flex-col gap-1">
                            <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase ${(note.trust_score || 95) > 90 ? "text-emerald-400" : "text-amber-400"}`}><ShieldCheck className="w-3 h-3" /> {note.trust_score || 95}% Trust</span>
                            <span className="text-[9px] text-white/30 font-semibold truncate max-w-[100px]">Src: {note.source_doc || "Hive Network"}</span>
                          </div>
                          <button onClick={() => handleStitch({...note, id: idToUse})} disabled={isStitched} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isStitched ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 hover:bg-cyan-500/20 text-white hover:text-cyan-400 border border-white/5'}`}>
                            {isStitched ? "STITCHED" : "+ STITCH"}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* SYNERGY METER */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-[#0a0a0f] border border-indigo-500/20 rounded-2xl p-5 shrink-0 shadow-lg">
              <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-cyan-400" /><h3 className="text-xs font-black text-white uppercase tracking-widest">Hive Synthesis</h3></div>
              <p className="text-[11px] text-indigo-200/60 leading-relaxed font-medium mb-4">
                {ghostNotes.length > 0 ? `${ghostNotes.length} knowledge gaps identified. ${stitchedIds.size} integrated into neural draft.` : "Awaiting input for neural synthesis."}
              </p>
              <div className="h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-1000 shadow-[0_0_10px_#22d3ee]" style={{ width: `${ghostNotes.length > 0 ? (stitchedIds.size / ghostNotes.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}