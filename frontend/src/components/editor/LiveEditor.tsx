"use client"

import { sb } from '@/lib/supabase'
import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FileUp, Type, Bold, Italic, List, Heading2, Send } from 'lucide-react'

export default function LiveEditor() {
    const [activeTab, setActiveTab] = useState<'type' | 'upload'>('type')
    const [isUploading, setIsUploading] = useState(false)

    // Initialize the TipTap Markdown Editor
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start typing your lecture notes... AI will stitch them to the Master Graph automatically.',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: '',
        immediatelyRender: false, // <-- THIS IS THE FIX
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] text-white/80',
            },
        },
    })

    // Mock PDF Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setIsUploading(true)

      try {
        // Grab the user's secure token
        const { data: { session } } = await sb.auth.getSession()
        if (!session) {
          alert("Authentication error. Please log in again.")
          setIsUploading(false)
          return
        }

        // Package the file for transmission
        const formData = new FormData()
        formData.append("file", file)
        formData.append("course_id", "dbms") // Hardcoded for now, can be dynamic later

        // Send to FastAPI
        const response = await fetch('http://localhost:8000/api/notes/upload-pdf', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
            // Note: We DO NOT set 'Content-Type' manually here. 
            // The browser automatically sets it to 'multipart/form-data' when using FormData.
          },
          body: formData
        })

        const result = await response.json()

        if (response.ok) {
          alert(`Success! ${result.chunks_processed} concepts mapped to the Hive.`)
        } else {
          alert(`Error: ${result.detail || 'Failed to process PDF'}`)
        }
      } catch (error) {
        console.error("Upload failed:", error)
        alert("Server connection failed.")
      } finally {
        setIsUploading(false)
        // Reset the input so you can upload the same file again if needed
        e.target.value = ''
      }
    }
  }

    const handleSyncToHive = async () => {
        if (!editor) return

        // Get the raw text from the editor
        const noteText = editor.getText()
        if (noteText.trim() === '') return

        // Grab the current user's secure token
        const { data: { session } } = await sb.auth.getSession()
        if (!session) return

        setIsUploading(true) // Reuse this state to show a loading spinner on the button if you want

        try {
            const response = await fetch('http://localhost:8000/api/notes/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    course_id: 'dbms', // You can pass the dynamic activeCourse state here later
                    content: noteText
                })
            })

            if (response.ok) {
                alert("Successfully stitched to the Knowledge Graph!")
                // editor.commands.clearContent() // Optional: clear editor after sync
            }
        } catch (error) {
            console.error("Sync failed:", error)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-2xl">

            {/* Header Tabs */}
            <div className="flex border-b border-white/10 bg-white/[0.02]">
                <button
                    onClick={() => setActiveTab('type')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'type' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-white/40 hover:text-white/70'}`}
                >
                    <Type className="w-4 h-4" /> Live Node
                </button>
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-white/40 hover:text-white/70'}`}
                >
                    <FileUp className="w-4 h-4" /> Inject PDF
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">

                {activeTab === 'type' ? (
                    <div className="h-full flex flex-col">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 mb-4 pb-4 border-b border-white/5">
                            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('bold') ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><Bold className="w-4 h-4" /></button>
                            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('italic') ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><Italic className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/10 mx-2"></div>
                            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('heading', { level: 2 }) ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><Heading2 className="w-4 h-4" /></button>
                            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('bulletList') ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><List className="w-4 h-4" /></button>
                        </div>

                        {/* The Actual Editor Text Area */}
                        <div className="flex-1 cursor-text">
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors relative">
                        <input type="file" accept=".pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />

                        {isUploading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-indigo-400 animate-spin"></div>
                                <p className="text-sm text-indigo-300">Extracting Knowledge Graph...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
                                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                    <FileUp className="w-8 h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-white/80 font-medium mb-1">Drop Lecture PDF here</p>
                                    <p className="text-xs text-white/40">AI will auto-chunk and stitch concepts to the Hive.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
                <span className="text-xs text-white/30 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Auto-saving
                </span>
                <button
                    onClick={handleSyncToHive}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                    <Send className="w-4 h-4" /> {isUploading ? 'Syncing...' : 'Sync to Hive'}
                </button>
            </div>
        </div>
    )
}