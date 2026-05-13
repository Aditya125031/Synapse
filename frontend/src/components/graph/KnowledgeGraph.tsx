"use client"

import { useMemo, useState, useEffect } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line, Sphere, Text, Html } from '@react-three/drei'
import { sb as supabase } from '@/lib/supabase'

// Interfaces
interface NodeData {
  id: string
  type: string
  course?: string
  x?: number
  y?: number
  z?: number
  full_name?: string
  avatar_url?: string
  title?: string
}

interface LinkData {
  source: string
  target: string
  type: string
  weight?: number
}

// Subcomponents
function GraphNode({ node, onClick, onAskDoubt }: { node: NodeData, onClick?: (node: NodeData) => void, onAskDoubt?: () => void }) {
  const color = node.type === 'master' ? '#06b6d4' : node.type === 'user' ? '#a855f7' : node.type === 'ghost' ? '#f59e0b' : '#3b82f6'
  const size = node.type === 'master' ? 0.8 : node.type === 'user' ? 0.6 : node.type === 'ghost' ? 0.5 : 0.4
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  
  return (
    <group 
      position={[node.x || 0, node.y || 0, node.z || 0]} 
      onClick={(e) => { 
        e.stopPropagation(); 
        if (node.type === 'user') setMenuOpen(!menuOpen);
        else if (onClick) onClick(node); 
      }} 
      onPointerOver={(e) => { 
        e.stopPropagation();
        setHovered(true);
        if (node.type === 'master') document.body.style.cursor = 'pointer'; 
      }} 
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}>
      <Sphere args={[size, 16, 16]}>
        <meshStandardMaterial color={color} />
      </Sphere>
      {node.type === 'user' ? (
        <Html position={[0, size + 0.3, 0]} center zIndexRange={[100, 0]}>
          <div className="group relative flex flex-col items-center cursor-pointer">
            <div className="bg-purple-500/20 text-purple-200 border border-purple-500/50 px-2 py-0.5 rounded text-[10px] whitespace-nowrap backdrop-blur-sm pointer-events-auto">
              {node.full_name || "Unknown User"}
            </div>
            {/* Hover Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-[#0a0a0f] border border-white/10 p-2 rounded-lg shadow-xl pointer-events-none w-32 z-50">
              {node.avatar_url ? (
                <img src={node.avatar_url} alt="avatar" className="w-8 h-8 rounded-full mb-1 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-500/50 mb-1 flex items-center justify-center text-xs font-bold text-white">?</div>
              )}
              <span className="text-white text-xs text-center font-bold truncate w-full">{node.full_name || "Unknown"}</span>
              <span className="text-white/40 text-[9px] text-center font-mono truncate w-full">{node.id.slice(0, 8)}...</span>
            </div>
            {/* User Menu Modal */}
            {menuOpen && (
              <div className="absolute top-full mt-2 flex flex-col items-center bg-[#0a0a0f] border border-white/10 p-2 rounded-lg shadow-xl pointer-events-auto w-32 z-50">
                 <button className="w-full text-left px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded">Message User</button>
                 <button className="w-full text-left px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded">View Profile</button>
                 <button className="w-full text-left px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded">Report</button>
              </div>
            )}
          </div>
        </Html>
      ) : (
        <>
          <Text position={[0, size + 0.3, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
            {node.full_name || node.title || node.type}
          </Text>
          {hovered && node.type === 'note' && (
            <Html position={[0, size + 0.8, 0]} center zIndexRange={[100, 0]}>
               <div className="flex flex-col gap-1 bg-[#0a0a0f] border border-white/10 p-2 rounded-lg shadow-xl pointer-events-auto w-24">
                 <button onClick={(e) => { e.stopPropagation(); alert("Downloading note..."); }} className="w-full text-left px-2 py-1 text-[10px] text-white/80 hover:text-white hover:bg-white/10 rounded">Download</button>
                 <button onClick={(e) => { e.stopPropagation(); if(onAskDoubt) onAskDoubt(); }} className="w-full text-left px-2 py-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded">Ask Doubt</button>
               </div>
            </Html>
          )}
        </>
      )}
    </group>
  )
}

function GraphLine({ start, end, type, weight = 1 }: { start: [number, number, number], end: [number, number, number], type?: string, weight?: number }) {
  const isGhostLink = type === 'RECEIVED_GHOST' || type === 'DERIVED_FROM'
  const isContributed = type === 'CONTRIBUTED_TO'
  return (
    <Line 
      points={[start, end]} 
      color={isGhostLink ? "#f59e0b" : "rgba(255,255,255,0.2)"} 
      lineWidth={isContributed ? weight * 5 : 1} 
      dashed={isGhostLink}
      dashScale={isGhostLink ? 10 : 1}
      dashSize={isGhostLink ? 1 : 0}
      dashOffset={isGhostLink ? 0.5 : 0}
    />
  )
}

export default function KnowledgeGraph({ chapterId }: { chapterId?: string }) {
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [links, setLinks] = useState<LinkData[]>([])
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false)
  const [doubtText, setDoubtText] = useState("")

  useEffect(() => {
    // If no chapter is selected, clear the graph
    if (!chapterId) {
      setNodes([])
      setLinks([])
      return
    }

    // Fetch using the chapterId
    fetch(`http://localhost:8000/api/graph/${chapterId}`)
      .then(res => res.json())
      .then(data => {
        const fetchedNodes = data.nodes || []
        const fetchedLinks = data.links || []
        
        // Helper function to dynamically assign 3D coordinates using Fibonacci sphere
        const positionedNodes = fetchedNodes.map((node: NodeData, i: number) => {
          const phi = Math.acos(1 - 2 * (i + 0.5) / fetchedNodes.length);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;
          const radius = 10;
          
          return {
            ...node,
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi)
          }
        })
        
        setNodes(positionedNodes)
        setLinks(fetchedLinks)
      })
      .catch(err => console.error("Failed to fetch graph data", err))
  }, [chapterId])

  const renderableLinks = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    return links.map((link, i) => {
      const sourceNode = nodeMap.get(link.source)
      const targetNode = nodeMap.get(link.target)
      
      if (sourceNode && targetNode && sourceNode.x !== undefined && targetNode.x !== undefined) {
        return {
          id: `${link.source}-${link.target}-${i}`,
          start: [sourceNode.x, sourceNode.y, sourceNode.z] as [number, number, number],
          end: [targetNode.x, targetNode.y, targetNode.z] as [number, number, number],
          type: link.type,
          weight: link.weight
        }
      }
      return null
    }).filter(Boolean) as {id: string, start: [number, number, number], end: [number, number, number], type: string, weight?: number}[]
  }, [nodes, links])

  const handleSubmitDoubt = () => {
    console.log("Submitting doubt to AI Judge:", doubtText)
    setIsDoubtModalOpen(false)
    setDoubtText("")
  }

  const handleNodeClick = async (node: NodeData) => {
    if (node.type === 'master' && chapterId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`http://localhost:8000/api/notes/master-note/${chapterId}`, {
          headers: { "Authorization": `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const blob = new Blob([data.content], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "master_note.md";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          alert("Failed to download master note: " + (await res.json()).detail);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-black/20 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#06b6d4]"></span> Master Node</div>
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> Note Chunk</div>
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#a855f7]"></span> User</div>
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Ghost Note</div>
      </div>

      <button 
        onClick={() => setIsDoubtModalOpen(true)}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-full hover:bg-red-500/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
      >
        <MessageCircleQuestion className="w-4 h-4" /> Ask Doubt
      </button>

      <div className="flex-1 w-full relative min-h-0">
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <OrbitControls enableDamping dampingFactor={0.05} />
            
            {nodes.map(node => (
              <GraphNode key={node.id} node={node} onClick={handleNodeClick} onAskDoubt={() => setIsDoubtModalOpen(true)} />
            ))}
            
            {renderableLinks.map(link => (
              <GraphLine key={link.id} start={link.start} end={link.end} type={link.type} weight={link.weight} />
            ))}
          </Canvas>
        </div>
      </div>

      {isDoubtModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-md bg-[#0a0a0f] border border-red-500/30 p-5 rounded-xl shadow-2xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">Submit a Doubt</h3>
                <p className="text-xs text-white/50 mb-4">
                   AI Check: Irrelevant doubts cost a strike. 2 Strikes = 48-hour ban.
                </p>
                <textarea 
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-red-500 outline-none resize-none mb-3"
                    placeholder="e.g., Why does BCNF prevent update anomalies compared to 3NF?"
                    value={doubtText}
                    onChange={(e) => setDoubtText(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsDoubtModalOpen(false)} className="text-white/40 hover:text-white text-sm">Cancel</button>
                    <button onClick={handleSubmitDoubt} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600">Analyze & Submit</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}