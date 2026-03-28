"use client"

import { useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the 3D Graph so it only renders in the browser, preventing Next.js SSR crashes
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false })

export default function KnowledgeGraph() {
  // For the MVP, we start with mock data. 
  // Later, this JSON will be fetched directly from your FastAPI/Neo4j backend.
  const graphData = useMemo(() => ({
    nodes: [
      { id: 'Master', name: 'DBMS Core', val: 15, color: '#06b6d4' }, // Cyan
      { id: 'Concept1', name: 'Normalization', val: 8, color: '#818cf8' }, // Indigo
      { id: 'Concept2', name: 'BCNF', val: 5, color: '#818cf8' },
      { id: 'UserNote1', name: 'Your Note', val: 4, color: '#10b981' }, // Green (Your contribution)
      { id: 'GhostNote1', name: 'Peer Ghost Note', val: 4, color: '#f43f5e' }, // Rose (Missing link)
      { id: 'Doubt1', name: 'Unresolved Doubt', val: 6, color: '#ef4444' } // Red (Pulsing doubt)
    ],
    links: [
      { source: 'Master', target: 'Concept1' },
      { source: 'Concept1', target: 'Concept2' },
      { source: 'UserNote1', target: 'Concept1' },
      { source: 'GhostNote1', target: 'Concept2' },
      { source: 'Doubt1', target: 'Concept2' }
    ]
  }), [])

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl border border-white/10 overflow-hidden relative backdrop-blur-sm">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#06b6d4]"></span> Master Node</div>
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Your Node</div>
        <div className="flex items-center gap-2 text-xs text-white/60"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> High Confusion Zone</div>
      </div>
      
      {/* The 3D Canvas */}
      <ForceGraph3D
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel="name"
        nodeColor="color"
        nodeRelSize={6}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        linkWidth={1.5}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />
    </div>
  )
}