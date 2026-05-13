"use client"

import { forwardRef, useImperativeHandle, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { FileUp, Type, Bold, Italic, List, Heading2, Send, Lock } from 'lucide-react'

interface LiveEditorProps {
    isActive: boolean; // Tells the editor if a chapter is selected
    isSyncing: boolean; // Tells the editor if an upload is in progress
    onSync: (text: string) => Promise<void>; // Passes text up to page.tsx
    onUpload: (file: File) => Promise<void>; // Passes file up to page.tsx
}

const LiveEditor = forwardRef((props: LiveEditorProps, ref) => {
    const { isActive, isSyncing, onSync, onUpload } = props;
    const [activeTab, setActiveTab] = useState<'type' | 'upload'>('type')

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start typing your lecture notes... AI will stitch them to the Master Graph automatically.',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: '',
        immediatelyRender: false,
        editable: isActive, // Disable typing if no chapter is selected
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] text-white/80',
            },
        },
    })

    useImperativeHandle(ref, () => ({
        getText: () => editor?.getText() || "",
        appendStitchedContent: (title: string, content: string) => {
            if (!editor) return
            const htmlToInsert = `
                <div style="padding: 16px; border: 1px solid rgba(6, 182, 212, 0.3); background-color: rgba(6, 182, 212, 0.1); border-radius: 8px; margin: 16px 0;">
                    <h4 style="color: #22d3ee; font-weight: bold; margin-bottom: 8px; margin-top: 0;">🧠 AI Stitch: ${title}</h4>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin: 0;">${content}</p>
                </div>
                <p></p>
            `
            editor.commands.insertContent(htmlToInsert)
        }
    }), [editor])

    const handleFileUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await onUpload(file); // Pass to parent!
            e.target.value = ''; // Reset input
        }
    }

    const handleSyncToHiveLocal = async () => {
        if (!editor) return;
        const noteText = editor.getText();
        if (noteText.trim() === '') return;
        await onSync(noteText); // Pass to parent!
    }

    // --- LOCKED STATE UI ---
    if (!isActive) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm shadow-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-white/60 font-medium text-lg mb-2">Editor Locked</h3>
                <p className="text-white/40 text-sm max-w-sm">
                    Please select a Class, Course, and Chapter from the sidebar to start taking notes or uploading PDFs.
                </p>
            </div>
        )
    }

    // --- ACTIVE STATE UI ---
    return (
        <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="flex border-b border-white/10 bg-white/[0.02]">
                <button onClick={() => setActiveTab('type')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'type' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-white/40 hover:text-white/70'}`}>
                    <Type className="w-4 h-4" /> Live Node
                </button>
                <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-white/40 hover:text-white/70'}`}>
                    <FileUp className="w-4 h-4" /> Inject PDF
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                {activeTab === 'type' ? (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center gap-1 mb-4 pb-4 border-b border-white/5">
                            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('bold') ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><Bold className="w-4 h-4" /></button>
                            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('italic') ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><Italic className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/10 mx-2"></div>
                            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('heading', { level: 2 }) ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><Heading2 className="w-4 h-4" /></button>
                            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('bulletList') ? 'bg-white/10 text-cyan-400' : 'text-white/60'}`}><List className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 cursor-text">
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors relative">
                        <input type="file" accept=".pdf" onChange={handleFileUploadLocal} disabled={isSyncing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" />
                        {isSyncing ? (
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

            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
                <span className="text-xs text-white/30 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Auto-saving
                </span>
                <button onClick={handleSyncToHiveLocal} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <Send className="w-4 h-4" /> {isSyncing ? 'Syncing...' : 'Sync to Hive'}
                </button>
            </div>
        </div>
    )
})

LiveEditor.displayName = "LiveEditor"
export default LiveEditor