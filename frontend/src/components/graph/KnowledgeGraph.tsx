"use client"

import { useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'

interface NodeData {
    id: string;
    type: string;
    full_name?: string;
    title?: string;
    content?: string;
    avatar_url?: string;
    x?: number; y?: number; z?: number;
}

interface LinkData {
    source: string;
    target: string;
    type: string;
    weight?: number;
}

// --- 1. THE STABLE NODE COMPONENT ---
const GraphNode = ({ node, chapterId }: { node: NodeData, chapterId: string }) => {
    const [hovered, setHovered] = useState(false);
    const [active, setActive] = useState(false); // Used for stable click menus!

    let color = '#3b82f6';
    let radius = 2;
    let label = node.title || 'Note';

    if (node.type === 'user') {
        color = '#a855f7';
        radius = 3;
        label = node.full_name || 'Student';
    } else if (node.type === 'master') {
        color = '#22d3ee';
        radius = 4;
        label = 'Master Topic';
    } else if (node.type === 'ghost') {
        color = '#f59e0b';
        radius = 2;
        label = 'Ghost Concept';
    }

    // Dynamic Avatar Generator
    const displayAvatar = node.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=random`;

    const handleDownloadMaster = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/notes/master-note/${chapterId}`);
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            
            // Trigger browser download
            const blob = new Blob([data.content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Master_Note_${chapterId.substring(0,6)}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            setActive(false);
        } catch (e) {
            alert("Failed to download Master Note.");
        }
    };

    return (
        <mesh
            position={[node.x || 0, node.y || 0, node.z || 0]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); setActive(!active); }}
        >
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial 
                color={color} 
                transparent={node.type === 'ghost'} 
                opacity={node.type === 'ghost' ? 0.7 : 1} 
            />

            <Html center zIndexRange={[100, 0]}>
                <div className="relative pointer-events-none flex flex-col items-center">
                    
                    {/* ALWAYS VISIBLE LABEL (Shows DP on hover) */}
                    <div className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded-md border border-white/10 flex items-center gap-2 mt-4 whitespace-nowrap">
                        {(hovered || active) && node.type === 'user' && (
                            <img src={displayAvatar} alt="DP" className="w-4 h-4 rounded-full" />
                        )}
                        {label}
                    </div>

                    {/* CLICK-TO-OPEN MENUS (Pointer-events-auto makes them clickable!) */}
                    {active && (
                        <div className="absolute top-full mt-2 bg-[#0a0a0f]/95 border border-white/20 p-2 rounded-lg flex flex-col gap-1 w-40 shadow-2xl pointer-events-auto z-50">
                            
                            {/* USER MENU */}
                            {node.type === 'user' && (
                                <>
                                    <div className="flex items-center gap-3 pb-2 mb-1 border-b border-white/10">
                                        <img src={displayAvatar} className="w-8 h-8 rounded-full" />
                                        <span className="text-xs font-bold text-white truncate">{label}</span>
                                    </div>
                                    <button onClick={() => alert("Messaging user...")} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-cyan-400 hover:bg-white/10 rounded">💬 Message</button>
                                    <button onClick={() => alert("Viewing profile...")} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-cyan-400 hover:bg-white/10 rounded">👤 View Profile</button>
                                </>
                            )}

                            {/* NOTE MENU */}
                            {node.type === 'note' && (
                                <>
                                    <button onClick={() => alert("Downloading raw note...")} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-indigo-400 hover:bg-white/10 rounded">⬇ Download PDF</button>
                                    <button onClick={() => alert("Opening doubt thread...")} className="text-xs text-left px-2 py-1.5 text-white/80 hover:text-amber-400 hover:bg-white/10 rounded">❓ Ask Doubt</button>
                                </>
                            )}

                            {/* MASTER NOTE MENU */}
                            {node.type === 'master' && (
                                <button onClick={handleDownloadMaster} className="text-xs text-center font-bold px-2 py-2 text-cyan-900 bg-cyan-400 hover:bg-cyan-300 rounded">
                                    ⬇ Download Master Guide
                                </button>
                            )}

                            {/* GHOST NOTE DATA */}
                            {node.type === 'ghost' && (
                                <div className="text-xs text-amber-200 p-1">
                                    <span className="font-bold text-amber-500 block mb-1">Missing Concept:</span>
                                    {node.content || "Loading concept details..."}
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

    // Scale the weight dramatically so differences are visible
    // A weight of 1.0 becomes 6px thick, a weight of 0.1 becomes 1px thick.
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
export default function KnowledgeGraph({ chapterId }: { chapterId?: string }) {
    const [nodes, setNodes] = useState<NodeData[]>([])
    const [links, setLinks] = useState<LinkData[]>([])
    const [loading, setLoading] = useState(false)

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
            
            {/* Click empty space to close all menus */}
            <Canvas camera={{ position: [0, 0, 60], fov: 60 }} onPointerMissed={() => document.dispatchEvent(new Event('click'))}>
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
                    <GraphNode key={node.id} node={node} chapterId={chapterId} />
                ))}
            </Canvas>
        </div>
    )
}