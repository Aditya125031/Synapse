"use client"

import { useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { sb as supabase } from '@/lib/supabase'

interface NodeData {
    id: string;
    type: string;
    full_name?: string;
    title?: string;
    content?: string;
    avatar_url?: string;
    user_id?: string;
    x?: number; y?: number; z?: number;
}

interface LinkData {
    source: string;
    target: string;
    type: string;
    weight?: number;
}

const GraphNode = ({ 
    node, 
    chapterId, 
    activeNodeId, 
    setActiveNodeId,
    onAskDoubt
}: { 
    node: NodeData, 
    chapterId: string, 
    activeNodeId: string | null, 
    setActiveNodeId: (id: string | null) => void,
    onAskDoubt?: (targetUserId: string, title: string) => void
}) => {
    const [hovered, setHovered] = useState(false);
    
    // Check if THIS node is the currently clicked one
    const isActive = activeNodeId === node.id;
    // Only show hover tooltips if no menu is currently active on this node
    const showTooltip = hovered && !isActive;

    let color = '#3b82f6';
    let radius = 2;
    let titleLabel = node.title || 'Note';

    if (node.type === 'user') {
        color = '#a855f7';
        radius = 3;
        titleLabel = node.full_name || 'Student';
    } else if (node.type === 'master') {
        color = '#22d3ee';
        radius = 4;
        titleLabel = 'Master Topic';
    } else if (node.type === 'ghost') {
        color = '#f59e0b';
        radius = 2;
        titleLabel = 'Missing Concept';
    }

    const displayAvatar = node.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(titleLabel)}&background=random`;

    const handleNodeClick = (e: any) => {
        e.stopPropagation();
        // Ghost notes are not clickable, only hoverable
        if (node.type === 'ghost') return; 
        
        // Toggle menu: close if already open, open if closed
        setActiveNodeId(isActive ? null : node.id);
    };

    const handleDownloadMaster = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:8000/api/notes/master-note/${chapterId}`, {
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            
            const blob = new Blob([data.content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Master_Note_${chapterId.substring(0,6)}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            setActiveNodeId(null); // Close menu after download
        } catch (e) {
            alert("Failed to download Master Note.");
        }
    };

    const handleDownloadNote = async (noteId: string, title: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:8000/api/notes/${noteId}/download`, {
                headers: { "Authorization": `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            
            const blob = new Blob([data.content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/\s+/g, '_')}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            setActiveNodeId(null);
        } catch (e) {
            alert("Failed to download Note.");
        }
    };

    return (
        <mesh
            position={[node.x || 0, node.y || 0, node.z || 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = node.type === 'ghost' ? 'auto' : 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={handleNodeClick}
        >
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial 
                color={color} 
                transparent={node.type === 'ghost'} 
                opacity={node.type === 'ghost' ? 0.7 : 1} 
                emissive={isActive ? color : '#000000'} // Glow when active
                emissiveIntensity={0.5}
            />

            <Html center zIndexRange={[100, 0]}>
                <div className="relative flex flex-col items-center select-none w-48">
                    
                    {/* ALWAYS ON LABEL */}
                    <div className="text-[10px] text-white/50 whitespace-nowrap bg-black/40 px-1.5 py-0.5 rounded pointer-events-none select-none mt-4">
                        {titleLabel}
                    </div>

                    {/* HOVER TOOLTIPS (pointer-events-none prevents blocking clicks) */}
                    {showTooltip && (
                        <div className="absolute bottom-full mb-2 bg-[#0a0a0f]/95 border border-white/20 p-3 rounded-lg shadow-2xl pointer-events-none w-full text-center backdrop-blur-md">
                            
                            {node.type === 'user' && (
                                <div className="flex flex-col items-center gap-2">
                                    <img src={displayAvatar} alt="DP" className="w-10 h-10 rounded-full border border-purple-500/50" />
                                    <span className="text-sm font-bold text-white">{titleLabel}</span>
                                    <span className="text-[10px] text-purple-300 uppercase tracking-wider">Contributor</span>
                                </div>
                            )}

                            {node.type === 'note' && (
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold text-blue-400 mb-1">Student Note</span>
                                    <span className="text-sm font-semibold text-white truncate">{titleLabel}</span>
                                    {node.content && (
                                        <p className="text-xs text-white/60 mt-1 line-clamp-2">{node.content}</p>
                                    )}
                                </div>
                            )}

                            {node.type === 'ghost' && (
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold text-amber-500 mb-1 border-b border-amber-500/30 pb-1">⚠️ Missing Knowledge</span>
                                    <p className="text-xs text-amber-100 mt-1 leading-relaxed">{node.content || node.title || "Data gap identified."}</p>
                                </div>
                            )}

                            {node.type === 'master' && (
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-bold text-cyan-400 mb-1 uppercase tracking-widest flex items-center gap-1">👑 Master Guide</span>
                                    <p className="text-[10px] text-cyan-100/70 text-center mt-1">AI-Synthesized Collective Knowledge</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CLICK-TO-OPEN MENUS (pointer-events-auto allows button clicks) */}
                    {isActive && (
                        <div className="absolute top-full mt-2 bg-[#0a0a0f]/95 border border-white/20 p-2 rounded-lg flex flex-col gap-1 w-full shadow-2xl pointer-events-auto z-50 backdrop-blur-xl">
                            
                            {node.type === 'user' && (
                                <>
                                    <div className="flex items-center gap-3 pb-2 mb-1 border-b border-white/10 px-2 pt-1">
                                        <img src={displayAvatar} className="w-6 h-6 rounded-full" />
                                        <span className="text-xs font-bold text-white truncate">{titleLabel}</span>
                                    </div>
                                    <button onClick={() => alert("Messaging user...")} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-purple-400 hover:bg-white/10 rounded transition-colors">💬 Send Message</button>
                                    <button onClick={() => window.location.href = `/dashboard/profile/${node.id}`} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-purple-400 hover:bg-white/10 rounded transition-colors">👤 View Profile</button>
                                </>
                            )}

                            {node.type === 'note' && (
                                <>
                                    <div className="pb-2 mb-1 border-b border-white/10 px-2 pt-1">
                                        <span className="text-xs font-bold text-blue-300 truncate block">{titleLabel}</span>
                                    </div>
                                    <button onClick={() => handleDownloadNote(node.id, titleLabel)} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-blue-400 hover:bg-white/10 rounded transition-colors">📄 Download Text</button>
                                    <button onClick={() => { onAskDoubt?.(node.user_id || node.id, titleLabel); setActiveNodeId(null); }} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-blue-400 hover:bg-white/10 rounded transition-colors">❓ Ask Doubt / Discuss</button>
                                </>
                            )}

                            {node.type === 'master' && (
                                <div className="p-1">
                                    <button onClick={handleDownloadMaster} className="w-full text-xs text-center font-bold px-2 py-2 text-[#0a0a0f] bg-cyan-400 hover:bg-cyan-300 rounded shadow-[0_0_10px_rgba(34,211,238,0.4)] transition-all">
                                        ⬇ Download Guide
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Html>
        </mesh>
    );
};

// --- 2. THE THICK EDGE COMPONENT ---
const GraphLink = ({ sourceNode, targetNode, weight }: { sourceNode: NodeData, targetNode: NodeData, weight: number }) => {
    const points = useMemo(() => {
        if (!sourceNode || !targetNode) return null;
        return [
            [sourceNode.x || 0, sourceNode.y || 0, sourceNode.z || 0],
            [targetNode.x || 0, targetNode.y || 0, targetNode.z || 0]
        ] as [number, number, number][];
    }, [sourceNode, targetNode]);

    if (!points) return null;

    const lineThickness = Math.max(1, (weight || 0.5) * 6);

    return (
        <Line 
            points={points} 
            color="#ffffff" 
            lineWidth={lineThickness} 
            transparent 
            opacity={0.3} 
        />
    );
};

// --- 3. MAIN GRAPH CONTAINER ---
export default function KnowledgeGraph({ chapterId, onAskDoubt }: { chapterId?: string, onAskDoubt?: (targetUserId: string, title: string) => void }) {
    const [nodes, setNodes] = useState<NodeData[]>([])
    const [links, setLinks] = useState<LinkData[]>([])
    const [loading, setLoading] = useState(false)
    
    // NEW: Manage the active node state globally so clicks on empty space work!
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (!chapterId) {
            setNodes([]); setLinks([]);
            return;
        }

        setLoading(true);
        fetch(`http://localhost:8000/api/graph/${chapterId}`)
            .then(res => res.json())
            .then(data => {
                if (data.nodes) {
                    const spreadRadius = 25;
                    const positionedNodes = data.nodes.map((node: NodeData, i: number) => {
                        const phi = Math.acos(-1 + (2 * i) / data.nodes.length);
                        const theta = Math.sqrt(data.nodes.length * Math.PI) * phi;
                        return {
                            ...node,
                            x: node.x || spreadRadius * Math.cos(theta) * Math.sin(phi),
                            y: node.y || spreadRadius * Math.sin(theta) * Math.sin(phi),
                            z: node.z || spreadRadius * Math.cos(phi)
                        };
                    });
                    setNodes(positionedNodes);
                    setLinks(data.links || []);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [chapterId]);

    if (!chapterId) return (
        <div className="w-full h-full bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm flex items-center justify-center">
            <p className="text-white/40 text-sm">Select a chapter to view its Knowledge Graph.</p>
        </div>
    );

    return (
        <div className="w-full h-full bg-black/20 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm relative cursor-move">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050508]/50 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-cyan-400 animate-spin"></div>
                </div>
            )}
            
            {/* onPointerMissed now successfully clears the active state! */}
            <Canvas 
                camera={{ position: [0, 0, 60], fov: 60 }} 
                onPointerMissed={() => setActiveNodeId(null)}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[100, 100, 100]} intensity={1} />
                <OrbitControls enableDamping dampingFactor={0.05} />

                {links.map((link, idx) => {
                    const sourceNode = nodes.find(n => n.id === link.source);
                    const targetNode = nodes.find(n => n.id === link.target);
                    if (!sourceNode || !targetNode) return null;
                    return <GraphLink key={idx} sourceNode={sourceNode} targetNode={targetNode} weight={link.weight || 0.5} />;
                })}

                {nodes.map(node => (
                    <GraphNode 
                        key={node.id} 
                        node={node} 
                        chapterId={chapterId} 
                        activeNodeId={activeNodeId}
                        setActiveNodeId={setActiveNodeId}
                        onAskDoubt={onAskDoubt}
                    />
                ))}
            </Canvas>
        </div>
    )
}